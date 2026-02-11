import os
import pathlib
from dotenv import load_dotenv

# --- CRITICAL FIX: LOAD ENV FIRST ---
env_path = pathlib.Path(__file__).parent / '.env'
load_dotenv(dotenv_path=env_path)

import shutil
from fastapi import FastAPI, UploadFile, File, Form, Header, HTTPException, Depends, Request
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import httpx
from typing import List, Dict, Any, Optional
from workflow_engine import build_and_run_workflow
from supabase import create_client, Client, ClientOptions
from rag import ingest_file, get_answer, delete_bot_data
from threading import Thread

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize Supabase
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")
SUPABASE_SERVICE_KEY = os.getenv("SUPABASE_SERVICE_KEY")

try:
    if SUPABASE_URL and SUPABASE_KEY:
        supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)
    
    if SUPABASE_SERVICE_KEY:
        supabase_admin: Client = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)
    else:
        supabase_admin = None
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
    if not authorization:
        raise HTTPException(status_code=401, detail="Missing Authorization Header")
    try:
        return authorization.split(" ")[1] 
    except IndexError:
        raise HTTPException(status_code=401, detail="Invalid Authorization Header Format")

async def verify_user(token: str = Depends(get_token)):
    try:
        user = supabase.auth.get_user(token)
        if not user:
             raise HTTPException(status_code=401, detail="Invalid Token")
        return user
    except Exception:
        raise HTTPException(status_code=401, detail="Session Expired or Invalid")

def get_auth_client(token: str) -> Client:
    return create_client(
        SUPABASE_URL, 
        SUPABASE_KEY, 
        options=ClientOptions(headers={"Authorization": f"Bearer {token}"})
    )

def process_files_background(file_info: Dict[str, Any], bot_id: str, user_id: str):
    """Background task to process files without blocking the response."""
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
    files: List[UploadFile] = File(None),
    urls: List[str] = Form(None),
    user: dict = Depends(verify_user),
    token: str = Depends(get_token),
    csvfiles: List[UploadFile] = File(None)
):
    print(f"Ingesting for user: {user.user.id}")

    if not files and not urls and not csvfiles:
        raise HTTPException(status_code=400,detail="Must provide at least one source (PDF, CSV, or URL)")
    
    user_supabase = get_auth_client(token)

    try:
        response = user_supabase.table("bots").insert({
            "name": name,
            "user_id": user.user.id
        }).execute()
        
        new_bot = response.data[0]
        bot_id = new_bot['id']
        print(f"Created bot with ID: {bot_id}")
        
    except Exception as e:
        print(f"Database error: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to create bot record: {str(e)}")

    files_to_process = []
    
    try:
        if files:
            for file in files:
                file_location = f"temp_{file.filename}"
                with open(file_location, "wb") as buffer:
                    shutil.copyfileobj(file.file, buffer)
                files_to_process.append((file_location, "PDF"))

        if urls:
            for url in urls:
                files_to_process.append((url, "URL"))

        if csvfiles:
            for csvfile in csvfiles:
                file_location = f"temp_{csvfile.filename}"
                with open(file_location, "wb") as buffer:
                    shutil.copyfileobj(csvfile.file, buffer)
                files_to_process.append((file_location, "CSV"))

        file_info = {"files": files_to_process}
        background_thread = Thread(
            target=process_files_background, 
            args=(file_info, bot_id, user.user.id),
            daemon=True
        )
        background_thread.start()

        return {
            "status": "success",
            "chunks": 0,
            "bot_id": bot_id,
            "message": "Bot created! Your knowledge sources are being processed in the background."
        }

    except Exception as e:
        print(f"Error saving files: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.patch("/bots/{bot_id}")
async def update_bot(
    bot_id: str,
    name: Optional[str] = Form(None),
    files: List[UploadFile] = File(None),
    urls: List[str] = Form(None),
    csvfiles: List[UploadFile] = File(None),
    clear_history: bool = Form(False),
    user: dict = Depends(verify_user),
    token: str = Depends(get_token)
):
    """
    Updates bot name and optionally adds/replaces knowledge sources.
    """
    user_supabase = get_auth_client(token)
    
    # 1. Verify ownership and Update Name
    try:
        update_data = {}
        if name:
            update_data["name"] = name
            
        if update_data:
            response = user_supabase.table("bots").update(update_data).eq("id", bot_id).eq("user_id", user.user.id).execute()
            if not response.data:
                 raise HTTPException(status_code=404, detail="Bot not found or unauthorized")
    except Exception as e:
         if "404" in str(e): raise e
         raise HTTPException(status_code=500, detail=f"Database update failed: {str(e)}")

    # 2. Handle Knowledge Base Updates
    if files or urls or csvfiles or clear_history:
        # If clear_history is requested, wipe vector store first
        if clear_history:
            print(f"Clearing knowledge base for bot {bot_id}")
            delete_bot_data(bot_id)

        # Prepare new files for ingestion
        files_to_process = []
        try:
            if files:
                for file in files:
                    file_location = f"temp_{file.filename}"
                    with open(file_location, "wb") as buffer:
                        shutil.copyfileobj(file.file, buffer)
                    files_to_process.append((file_location, "PDF"))

            if urls:
                for url in urls:
                    files_to_process.append((url, "URL"))

            if csvfiles:
                for csvfile in csvfiles:
                    file_location = f"temp_{csvfile.filename}"
                    with open(file_location, "wb") as buffer:
                        shutil.copyfileobj(csvfile.file, buffer)
                    files_to_process.append((file_location, "CSV"))
            
            if files_to_process:
                file_info = {"files": files_to_process}
                background_thread = Thread(
                    target=process_files_background, 
                    args=(file_info, bot_id, user.user.id),
                    daemon=True
                )
                background_thread.start()
                
        except Exception as e:
             raise HTTPException(status_code=500, detail=f"File processing failed: {str(e)}")

    return {"status": "success", "message": "Bot updated successfully"}

@app.get("/bots")
async def get_user_bots(user: dict = Depends(verify_user), token: str = Depends(get_token)):
    try:
        user_supabase = get_auth_client(token)
        response = user_supabase.table("bots").select("*").eq("user_id", user.user.id).order("created_at", desc=True).execute()
        return response.data
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/bots/{bot_id}")
async def get_bot_details(bot_id: str, user: dict = Depends(verify_user), token: str = Depends(get_token)):
    try:
        user_supabase = get_auth_client(token)
        response = user_supabase.table("bots").select("*").eq("id", bot_id).eq("user_id", user.user.id).single().execute()
        if not response.data:
            raise HTTPException(status_code=404, detail="Bot not found")
        return response.data
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/stats")
async def get_stats(user: dict = Depends(verify_user), token: str = Depends(get_token)):
    try:
        user_supabase = get_auth_client(token)
        bots_response = user_supabase.table("bots").select("id").eq("user_id", user.user.id).execute()
        bot_ids = [b['id'] for b in bots_response.data]
        
        total_messages = 0
        if bot_ids:
             messages_response = user_supabase.table("messages").select("id", count="exact").in_("bot_id", bot_ids).execute()
             total_messages = messages_response.count
             
        return {
            "total_bots": len(bot_ids),
            "total_messages": total_messages,
            "total_conversations": int(total_messages / 2)
        }
    except Exception as e:
        return {"total_bots": 0, "total_messages": 0, "total_conversations": 0}

@app.delete("/bots/{bot_id}")
async def delete_bot(bot_id: str, user: dict = Depends(verify_user), token: str = Depends(get_token)):
    print(f"Deleting bot {bot_id} for user {user.user.id}")
    user_supabase = get_auth_client(token)
    
    try:
        client = supabase_admin if supabase_admin else user_supabase
        response = client.table("bots").delete().eq("id", bot_id).eq("user_id", user.user.id).execute()
        
        if not response.data:
             raise HTTPException(status_code=404, detail="Bot not found")
             
    except Exception as e:
        if "404" in str(e): raise e
        raise HTTPException(status_code=500, detail=f"Failed to delete bot: {str(e)}")

    delete_bot_data(bot_id)
    return {"status": "success", "bot_id": bot_id}

@app.post("/chat")
async def chat(request: ChatRequest):
    print(f"Received chat request for bot_id: {request.bot_id}")
    api_key = os.getenv("GEMINI_API_KEY")
    
    if not api_key:
        raise HTTPException(status_code=500, detail="GEMINI_API_KEY not found")
    
    answer = get_answer(request.bot_id, request.question, api_key)
    
    try:
        client_to_use = supabase_admin if supabase_admin else supabase
        client_to_use.table("messages").insert([
            {"bot_id": request.bot_id, "role": "user", "content": request.question},
            {"bot_id": request.bot_id, "role": "bot", "content": answer}
        ]).execute()
    except Exception as e:
        print(f"Error logging messages: {e}")

    return {"answer": answer}

@app.post("/bots/{bot_id}/telegram")
async def connect_telegram(bot_id:str, token: str = Form(...), user: dict = Depends(verify_user), user_token: str = Depends(get_token)):
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
    data = await request.json()
    if "message" not in data: return {"status": "ignored"}
    
    chat_id = data["message"]["chat"]["id"]
    incoming_text = data["message"].get("text", "")
    if not incoming_text: return {"status": "ignored"}

    client = supabase_admin if supabase_admin else supabase
    response = client.table("bots").select("telegram_bot_token").eq("id", bot_id).execute()
    
    if not response.data or not response.data[0]['telegram_bot_token']:
        return {"status": "error"}
        
    bot_token = response.data[0]['telegram_bot_token']
    api_key = os.getenv("GEMINI_API_KEY")
    ai_response = get_answer(bot_id, incoming_text, api_key)
    
    send_url = f"https://api.telegram.org/bot{bot_token}/sendMessage"
    payload = {"chat_id": chat_id, "text": ai_response}
    
    async with httpx.AsyncClient() as client:
        await client.post(send_url, json=payload)
        
    return {"status": "success"}

@app.post("/execute-workflow")
async def execute_workflow(request: WorkflowRequest):
    try:
        result = build_and_run_workflow(request.nodes, request.edges, request.initial_input)
        return {
            "status": "success", 
            "result": result.get('result', 'No result'), 
            "full_history": result.get('full_history', [])
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)