import os
import shutil
from fastapi import FastAPI, UploadFile, File, Form, Header, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from dotenv import load_dotenv
import pathlib
from supabase import create_client, Client, ClientOptions
from rag import ingest_file, get_answer

# Load .env explicitly to be safe
env_path = pathlib.Path(__file__).parent / '.env'
load_dotenv(dotenv_path=env_path)

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize Supabase (for token verification and admin access)
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")
SUPABASE_SERVICE_KEY = os.getenv("SUPABASE_SERVICE_KEY")

if not SUPABASE_URL or not SUPABASE_KEY:
    print("Error: SUPABASE_URL or SUPABASE_KEY not set in .env file")
else:
    print(f"Loaded SUPABASE_URL: {SUPABASE_URL[:10]}...") 

try:
    if SUPABASE_URL and SUPABASE_KEY:
        # Global client for generic operations
        supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)
    
    # Admin client for bypassing RLS (logging/analytics)
    if SUPABASE_URL and SUPABASE_SERVICE_KEY:
        supabase_admin: Client = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)
    else:
        supabase_admin = None
        print("Warning: SUPABASE_SERVICE_KEY not found. Chat logging may fail due to RLS.")
except Exception as e:
    print(f"Error initializing Supabase: {e}")
    supabase = None
    supabase_admin = None

class ChatRequest(BaseModel):
    bot_id: str
    question: str

async def get_token(authorization: str = Header(None)):
    """Extracts the JWT token from the Authorization header."""
    if not authorization:
        raise HTTPException(status_code=401, detail="Missing Authorization Header")
    try:
        return authorization.split(" ")[1] # Remove "Bearer "
    except IndexError:
        raise HTTPException(status_code=401, detail="Invalid Authorization Header Format")

async def verify_user(token: str = Depends(get_token)):
    """
    Verifies the token with Supabase.
    Returns the user object if valid.
    """
    try:
        user = supabase.auth.get_user(token)
        if not user:
             raise HTTPException(status_code=401, detail="Invalid Token")
        return user
    except Exception:
        raise HTTPException(status_code=401, detail="Session Expired or Invalid")

def get_auth_client(token: str) -> Client:
    """Creates a Supabase client authenticated as the user."""
    return create_client(
        SUPABASE_URL, 
        SUPABASE_KEY, 
        options=ClientOptions(headers={"Authorization": f"Bearer {token}"})
    )

@app.get("/")
def health_check():
    return {"status": "running", "service": "BotCraft Backend"}

@app.post("/ingest")
async def ingest_document(
    name: str = Form(...),
    file: UploadFile = File(None),
    url:str=Form(None),
    user: dict = Depends(verify_user),
    token: str = Depends(get_token)
):
    print(f"Ingesting for user: {user.user.id}")

    if not file and not url:
        raise HTTPException(status_code=400,detail="Must provide either a file or a URL")
    
    # Create authenticated client for RLS
    user_supabase = get_auth_client(token)

    # 1. Save to Supabase to get a unique Bot UUID
    try:
        response = user_supabase.table("bots").insert({
            "name": name,
            "user_id": user.user.id
        }).execute()
        
        # supabase-py v2 returns data object
        new_bot = response.data[0]
        bot_id = new_bot['id']
        print(f"Created bot with ID: {bot_id}")
        
    except Exception as e:
        print(f"Database error: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to create bot record: {str(e)}")

    # 2. Process file or url

    total_chunks = 0
    errors = []

    try:
        # 1. Process File if present
        if file:
            file_location = f"temp_{file.filename}"
            try:
                with open(file_location, "wb") as buffer:
                    shutil.copyfileobj(file.file, buffer)
                
                success, result = ingest_file(file_location, bot_id)
                if success:
                    total_chunks += result
                else:
                    errors.append(f"File Error: {result}")
            finally:
                if os.path.exists(file_location):
                    os.remove(file_location)

        # 2. Process URL if present
        if url:
             success, result = ingest_file(url, bot_id)
             if success:
                 total_chunks += result
             else:
                 errors.append(f"URL Error: {result}")

        if total_chunks > 0:
            return {"status": "success", "chunks": total_chunks, "bot_id": bot_id}
        else:
             # If both failed or nothing produced chunks
             raise HTTPException(status_code=500, detail="; ".join(errors) or "No content ingested")
    except Exception as e:
        print(f"Error ingesting file: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/bots")
async def get_user_bots(
    user: dict = Depends(verify_user),
    token: str = Depends(get_token)
):
    try:
        user_supabase = get_auth_client(token)
        response = user_supabase.table("bots").select("*").eq("user_id", user.user.id).order("created_at", desc=True).execute()
        return response.data
    except Exception as e:
        print(f"Error fetching bots: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/stats")
async def get_stats(
    user: dict = Depends(verify_user),
    token: str = Depends(get_token)
):
    try:
        user_supabase = get_auth_client(token)
        
        # Get all bots for the user
        bots_response = user_supabase.table("bots").select("id").eq("user_id", user.user.id).execute()
        bot_ids = [b['id'] for b in bots_response.data]
        
        total_messages = 0
        
        if bot_ids:
             # Use the authenticated client for messages too (assuming 'Owners can view messages' policy)
             messages_response = user_supabase.table("messages").select("id", count="exact").in_("bot_id", bot_ids).execute()
             total_messages = messages_response.count
             
        return {
            "total_bots": len(bot_ids),
            "total_messages": total_messages,
            "total_conversations": int(total_messages / 2)
        }
    except Exception as e:
        print(f"Error fetching stats: {e}")
        return {"total_bots": 0, "total_messages": 0, "total_conversations": 0}

@app.post("/chat")
async def chat(request: ChatRequest):
    print(f"Received chat request for bot_id: {request.bot_id}")
    api_key = os.getenv("GEMINI_API_KEY")
    
    if not api_key:
        print("Error: GEMINI_API_KEY is missing in environment variables.")
        raise HTTPException(status_code=500, detail="GEMINI_API_KEY not found")
    
    answer = get_answer(request.bot_id, request.question, api_key)
    
    # Log interaction to Supabase using Admin Client to bypass RLS
    try:
        client_to_use = supabase_admin if supabase_admin else supabase
        
        # We allow this to fail silently so it doesn't break the chat if DB is down
        client_to_use.table("messages").insert([
            {"bot_id": request.bot_id, "role": "user", "content": request.question},
            {"bot_id": request.bot_id, "role": "bot", "content": answer}
        ]).execute()
    except Exception as e:
        print(f"Error logging messages: {e}")

    return {"answer": answer}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)