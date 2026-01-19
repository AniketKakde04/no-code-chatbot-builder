import os
import shutil
from fastapi import FastAPI, UploadFile, File, Form, Header, HTTPException, Depends,Request
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from dotenv import load_dotenv
import pathlib
import httpx
from typing import List, Dict, Any
from workflow_engine import build_and_run_workflow
from supabase import create_client, Client, ClientOptions
from rag import ingest_file, get_answer, delete_bot_data
from threading import Thread

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
    
    service_key = os.getenv("SUPABASE_SERVICE_KEY")
    # Admin client for bypassing RLS (logging/analytics)
    if service_key:
        print(f"✅ Found Service Key: {service_key[:5]}...") # Prints first 5 chars
        supabase_admin: Client = create_client(SUPABASE_URL, service_key)
    else:
        supabase_admin = None
        print("❌ ERROR: SUPABASE_SERVICE_KEY is missing from .env or not loaded!")
    # --- DEBUGGING BLOCK END ---
    if SUPABASE_URL and SUPABASE_SERVICE_KEY:
        supabase_admin: Client = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)
    else:
        supabase_admin = None
        print("Warning: SUPABASE_SERVICE_KEY not found. Chat logging may fail due to RLS.")
except Exception as e:
    print(f"Error initializing Supabase: {e}")
    supabase = None
    supabase_admin = None

class WorkflowRequest(BaseModel):
    nodes: List[Dict]
    edges: List[Dict]
    initial_input: str

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

def process_files_background(file_info: Dict[str, Any], bot_id: str, user_id: str):
    """
    Background task to process files without blocking the response.
    """
    try:
        for file_location, file_type in file_info['files']:
            try:
                success, result = ingest_file(file_location, bot_id)
                if not success:
                    print(f"Error processing {file_type}: {result}")
            finally:
                if os.path.exists(file_location):
                    os.remove(file_location)
        
        print(f"Background processing completed for bot_id: {bot_id}")
    except Exception as e:
        print(f"Error in background processing: {e}")

@app.get("/")
def health_check():
    return {"status": "running", "service": "BotCraft Backend"}

@app.post("/ingest")
async def ingest_document(
    name: str = Form(...),
    file: UploadFile = File(None),
    url:str=Form(None),
    user: dict = Depends(verify_user),
    token: str = Depends(get_token),
    csvfile: UploadFile = File(None)
):
    print(f"Ingesting for user: {user.user.id}")

    if not file and not url and not csvfile:
        raise HTTPException(status_code=400,detail="Must provide at least one source (PDF, CSV, or URL)")
    
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

    # 2. Save files temporarily and start background processing
    files_to_process = []
    
    try:
        # 1. Save PDF file if present
        if file:
            file_location = f"temp_{file.filename}"
            with open(file_location, "wb") as buffer:
                shutil.copyfileobj(file.file, buffer)
            files_to_process.append((file_location, "PDF"))

        # 2. Process URL if present (do this in background too)
        if url:
            files_to_process.append((url, "URL"))

        # 3. Save CSV file if present
        if csvfile:
            file_location = f"temp_{csvfile.filename}"
            with open(file_location, "wb") as buffer:
                shutil.copyfileobj(csvfile.file, buffer)
            files_to_process.append((file_location, "CSV"))

        # Start background processing thread
        file_info = {"files": files_to_process}
        background_thread = Thread(
            target=process_files_background, 
            args=(file_info, bot_id, user.user.id),
            daemon=True
        )
        background_thread.start()

        # Return immediately with bot info
        return {
            "status": "success",
            "chunks": 0,  # We'll update this when processing completes
            "bot_id": bot_id,
            "message": "Bot created! Your knowledge sources are being processed in the background."
        }

    except Exception as e:
        print(f"Error saving files: {e}")
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

@app.delete("/bots/{bot_id}")
async def delete_bot(
    bot_id: str,
    user: dict = Depends(verify_user),
    token: str = Depends(get_token)
):
    print(f"Deleting bot {bot_id} for user {user.user.id}")
    
    user_supabase = get_auth_client(token)
    
    # 1. Delete from Supabase
    try:
        # Use admin client if available to bypass potential missing DELETE RLS policies
        # We still enforce user_id match to ensure security (users can only delete their own bots)
        client = supabase_admin if supabase_admin else user_supabase
        
        response = client.table("bots").delete().eq("id", bot_id).eq("user_id", user.user.id).execute()
        
        # Check if anything was actually deleted
        # Note: If RLS is missing and we use user_supabase, this might return empty data but no error
        if not response.data:
             print(f"Delete failed. Bot {bot_id} not found or RLS blocked delete.")
             raise HTTPException(status_code=404, detail="Bot not found or unauthorized (Check RLS policies)")
             
    except Exception as e:
        print(f"Database error deleting bot: {e}")
        if "404" in str(e): raise e
        raise HTTPException(status_code=500, detail=f"Failed to delete bot: {str(e)}")

    # 2. Delete from Vector Store
    # We proceed even if DB delete failed? No, only if DB delete succeeded.
    delete_bot_data(bot_id)
    
    return {"status": "success", "bot_id": bot_id}

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

@app.post("/bots/{bot_id}/telegram")
async def connect_telegram(
    bot_id:str,
    token: str = Form(...),
    user: dict = Depends(verify_user),
    user_token: str = Depends(get_token)

):
    
    user_supabase = get_auth_client(user_token)

    try:
        user_supabase.table("bots").update({"telegram_bot_token":token}).eq("id",bot_id).execute()
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to update database:{str(e)}")
    

    BASE_URL = "https://816e5d5c5fe4.ngrok-free.app"
    webhook_url = f"{BASE_URL}/telegram-webhook/{bot_id}"

    telegram_api =f"https://api.telegram.org/bot{token}/setWebhook?url={webhook_url}"

    async with httpx.AsyncClient() as client:
        resp= await client.get(telegram_api)
        if resp.status_code !=200:
            raise HTTPException(status_code=500, detail=f"Telegram API error: {resp.text}")
    
    return {"status":"success","detail":"Telegram bot connected"}

@app.post("/telegram-webhook/{bot_id}")
async def telegram_handler(bot_id: str, request: Request):
    """
    Receives incoming messages from Telegram, gets AI answer, and replies.
    """
    data = await request.json()
    
    # Check if it's a message (not an edit or status update)
    if "message" not in data:
        return {"status": "ignored"}
    
    chat_id = data["message"]["chat"]["id"]
    incoming_text = data["message"].get("text", "")
    
    if not incoming_text:
        return {"status": "ignored"}

    # 1. Fetch Bot Token (We need it to reply)
    # Using admin client because Telegram requests don't have user session tokens
    client = supabase_admin if supabase_admin else supabase
    response = client.table("bots").select("telegram_bot_token").eq("id", bot_id).execute()
    
    if not response.data or not response.data[0]['telegram_bot_token']:
        print(f"Error: No token found for bot {bot_id}")
        return {"status": "error"}
        
    bot_token = response.data[0]['telegram_bot_token']
    
    # 2. Get Answer from RAG
    api_key = os.getenv("GEMINI_API_KEY")
    ai_response = get_answer(bot_id, incoming_text, api_key)
    
    # 3. Send Reply to Telegram
    send_url = f"https://api.telegram.org/bot{bot_token}/sendMessage"
    payload = {
        "chat_id": chat_id,
        "text": ai_response
    }
    
    async with httpx.AsyncClient() as client:
        await client.post(send_url, json=payload)
        
    return {"status": "success"}

@app.post("/execute-workflow")
async def execute_workflow(request: WorkflowRequest):
    print(f"Executing Workflow with {len(request.nodes)} nodes")
    try:
        # Run the LangGraph Engine
        result = build_and_run_workflow(request.nodes, request.edges, request.initial_input)
        
        # Return the final output
        return {
            "status": "success", 
            "result": result.get('current_input', 'No output'), 
            "full_state": result
        }
    except Exception as e:
        print(f"Workflow execution failed: {e}")
        # In a real app, we would return a proper error message
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)