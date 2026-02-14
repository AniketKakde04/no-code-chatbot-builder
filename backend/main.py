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
import uuid
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
    bot_id: Optional[str] = None
    question: str

class WorkflowSchema(BaseModel):
    name: str
    description: Optional[str] = None
    nodes: List[Dict]
    edges: List[Dict]

class ShareRequest(BaseModel):
    is_public: bool = True

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

# --- 1. WORKFLOW MANAGEMENT ENDPOINTS ---

@app.post("/workflows")
async def create_workflow(workflow: WorkflowSchema, user: dict = Depends(verify_user), token: str = Depends(get_token)):
    user_supabase = get_auth_client(token)
    try:
        response = user_supabase.table("workflows").insert({
            "user_id": user.user.id,
            "name": workflow.name,
            "description": workflow.description,
            "nodes": workflow.nodes,
            "edges": workflow.edges
        }).execute()
        return response.data[0]
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/workflows")
async def get_workflows(user: dict = Depends(verify_user), token: str = Depends(get_token)):
    user_supabase = get_auth_client(token)
    try:
        response = user_supabase.table("workflows").select("*").eq("user_id", user.user.id).order("created_at", desc=True).execute()
        return response.data
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.put("/workflows/{workflow_id}")
async def update_workflow(workflow_id: str, workflow: WorkflowSchema, user: dict = Depends(verify_user), token: str = Depends(get_token)):
    user_supabase = get_auth_client(token)
    try:
        response = user_supabase.table("workflows").update({
            "name": workflow.name,
            "description": workflow.description,
            "nodes": workflow.nodes,
            "edges": workflow.edges
        }).eq("id", workflow_id).eq("user_id", user.user.id).execute()
        if not response.data:
            raise HTTPException(status_code=404, detail="Workflow not found")
        return response.data[0]
    except Exception as e:
        if "404" in str(e): raise e
        raise HTTPException(status_code=500, detail=str(e))

@app.patch("/bots/{bot_id}/link-workflow")
async def link_workflow(bot_id: str, workflow_id: str = Form(...), user: dict = Depends(verify_user), token: str = Depends(get_token)):
    user_supabase = get_auth_client(token)
    # Use None if user selects "None" to reset to standard RAG
    val = None if workflow_id in ["none", ""] else workflow_id
    try:
        response = user_supabase.table("bots").update({"workflow_id": val}).eq("id", bot_id).eq("user_id", user.user.id).execute()
        return {"status": "success", "workflow_id": val}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# --- 2. BOT MANAGEMENT ENDPOINTS ---

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
    user_supabase = get_auth_client(token)
    
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

    if files or urls or csvfiles or clear_history:
        if clear_history:
            print(f"Clearing knowledge base for bot {bot_id}")
            delete_bot_data(bot_id)

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


# --- 3. UPDATED CHAT ENDPOINT (THE BRAIN SWITCHER) ---

@app.post("/chat")
async def chat(request: ChatRequest):
    print(f"Received chat request for bot_id: {request.bot_id}")
    api_key = os.getenv("GEMINI_API_KEY")
    
    if not api_key:
        raise HTTPException(status_code=500, detail="GEMINI_API_KEY not found")
    
    # 1. Fetch the bot to check for linked workflow
    client = supabase_admin if supabase_admin else supabase
    try:
        bot_response = client.table("bots").select("workflow_id").eq("id", request.bot_id).single().execute()
        if not bot_response.data:
            raise HTTPException(status_code=404, detail="Bot not found")
            
        workflow_id = bot_response.data.get("workflow_id")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")

    answer = ""

    # 2. CHOOSE THE BRAIN
    if workflow_id:
        print(f"Bot {request.bot_id} routing to Workflow {workflow_id}")
        # Fetch the nodes and edges from the workflow
        wf_response = client.table("workflows").select("nodes, edges").eq("id", workflow_id).single().execute()
        if wf_response.data:
            nodes = wf_response.data['nodes']
            edges = wf_response.data['edges']
            
            # Execute the LangGraph Agent Workflow
            try:
                result = await build_and_run_workflow(nodes, edges, request.question)
                answer = result.get('result', "I encountered an error running the assigned workflow.")
            except Exception as e:
                answer = f"Agent Execution Error: {str(e)}"
        else:
            answer = "Error: Linked workflow not found in database."
    else:
        print(f"Bot {request.bot_id} routing to Standard RAG")
        # Standard RAG Fallback
        answer = get_answer(request.bot_id, request.question, api_key)
    
    # 3. Log the message
    try:
        client.table("messages").insert([
            {"bot_id": request.bot_id, "role": "user", "content": request.question},
            {"bot_id": request.bot_id, "role": "bot", "content": answer}
        ]).execute()
    except Exception as e:
        print(f"Error logging messages: {e}")

    return {"answer": answer}


# --- 4. TELEGRAM ENDPOINTS ---

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
    
    # Trigger the primary /chat logic to route through Agent OR RAG automatically
    api_url = f"http://localhost:8000/chat"
    
    async with httpx.AsyncClient() as http_client:
        ai_resp = await http_client.post(api_url, json={"bot_id": bot_id, "question": incoming_text})
        ai_response_text = ai_resp.json().get("answer", "Error getting answer.")
    
    send_url = f"https://api.telegram.org/bot{bot_token}/sendMessage"
    payload = {"chat_id": chat_id, "text": ai_response_text}
    
    async with httpx.AsyncClient() as http_client:
        await http_client.post(send_url, json=payload)
        
    return {"status": "success"}

# --- 5. WHATSAPP BUSINESS API ENDPOINTS ---

@app.post("/bots/{bot_id}/whatsapp")
async def connect_whatsapp(
    bot_id: str,
    phone_id: str = Form(...),
    access_token: str = Form(...),
    user: dict = Depends(verify_user),
    user_token: str = Depends(get_token)
):
    """Save WhatsApp credentials (Phone Number ID + Access Token) to the bot."""
    user_supabase = get_auth_client(user_token)
    try:
        user_supabase.table("bots").update({
            "whatsapp_phone_id": phone_id,
            "whatsapp_access_token": access_token
        }).eq("id", bot_id).eq("user_id", user.user.id).execute()
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to save WhatsApp credentials: {str(e)}")
    
    return {"status": "success", "detail": "WhatsApp credentials saved. Now configure your webhook URL in the Meta dashboard."}


@app.get("/whatsapp-webhook")
async def whatsapp_verify(request: Request):
    """Handle Meta's webhook verification (GET challenge-response)."""
    params = request.query_params
    mode = params.get("hub.mode")
    token = params.get("hub.verify_token")
    challenge = params.get("hub.challenge")
    
    verify_token = os.getenv("WHATSAPP_VERIFY_TOKEN", "")
    
    if mode == "subscribe" and token == verify_token:
        print(f"✅ WhatsApp webhook verified successfully")
        return int(challenge)
    else:
        print(f"❌ WhatsApp webhook verification failed. Expected '{verify_token}', got '{token}'")
        raise HTTPException(status_code=403, detail="Verification failed")


@app.post("/whatsapp-webhook")
async def whatsapp_handler(request: Request):
    """Receive incoming WhatsApp messages and respond via Cloud API."""
    body = await request.json()
    
    try:
        entry = body.get("entry", [{}])[0]
        changes = entry.get("changes", [{}])[0]
        value = changes.get("value", {})
        
        # Get the phone number ID this message was sent TO (our business number)
        metadata = value.get("metadata", {})
        phone_number_id = metadata.get("phone_number_id", "")
        
        messages = value.get("messages", [])
        if not messages:
            return {"status": "no_messages"}
        
        msg = messages[0]
        
        # Only handle text messages
        if msg.get("type") != "text":
            return {"status": "ignored", "reason": "not_text"}
        
        sender_phone = msg["from"]  # Sender's phone number
        incoming_text = msg["text"]["body"]
        
        print(f"📱 WhatsApp message from {sender_phone}: {incoming_text}")
        
        # Look up which bot is connected to this phone_number_id
        client = supabase_admin if supabase_admin else supabase
        bot_resp = client.table("bots").select("id, whatsapp_access_token").eq("whatsapp_phone_id", phone_number_id).execute()
        
        if not bot_resp.data:
            print(f"❌ No bot found for WhatsApp phone_id: {phone_number_id}")
            return {"status": "error", "detail": "No bot connected to this number"}
        
        bot_id = bot_resp.data[0]["id"]
        wa_access_token = bot_resp.data[0]["whatsapp_access_token"]
        
        # Route through the existing /chat logic
        async with httpx.AsyncClient(timeout=120.0) as http_client:
            ai_resp = await http_client.post(
                "http://localhost:8000/chat",
                json={"bot_id": bot_id, "question": incoming_text}
            )
            ai_response_text = ai_resp.json().get("answer", "Sorry, I couldn't process that.")
        
        # Send reply via WhatsApp Cloud API
        send_url = f"https://graph.facebook.com/v21.0/{phone_number_id}/messages"
        headers = {
            "Authorization": f"Bearer {wa_access_token}",
            "Content-Type": "application/json"
        }
        payload = {
            "messaging_product": "whatsapp",
            "to": sender_phone,
            "type": "text",
            "text": {"body": ai_response_text}
        }
        
        async with httpx.AsyncClient() as http_client:
            send_resp = await http_client.post(send_url, json=payload, headers=headers)
            if send_resp.status_code != 200:
                print(f"❌ WhatsApp send error: {send_resp.text}")
            else:
                print(f"✅ WhatsApp reply sent to {sender_phone}")
        
        return {"status": "success"}
        
    except Exception as e:
        print(f"❌ WhatsApp webhook error: {str(e)}")
        return {"status": "error"}


# --- 6. CHAT MESSAGES & SHARING ENDPOINTS ---

@app.get("/bots/{bot_id}/messages")
async def get_messages(bot_id: str, user: dict = Depends(verify_user), token: str = Depends(get_token)):
    """Fetch chat history for a bot."""
    user_supabase = get_auth_client(token)
    try:
        # Verify user owns this bot
        bot_check = user_supabase.table("bots").select("id").eq("id", bot_id).eq("user_id", user.user.id).execute()
        if not bot_check.data:
            raise HTTPException(status_code=404, detail="Bot not found")
        
        client = supabase_admin if supabase_admin else user_supabase
        response = client.table("messages").select("*").eq("bot_id", bot_id).order("created_at", desc=False).execute()
        return response.data
    except Exception as e:
        if "404" in str(e): raise e
        raise HTTPException(status_code=500, detail=str(e))

@app.delete("/bots/{bot_id}/messages")
async def clear_messages(bot_id: str, user: dict = Depends(verify_user), token: str = Depends(get_token)):
    """Clear chat history for a bot."""
    user_supabase = get_auth_client(token)
    try:
        bot_check = user_supabase.table("bots").select("id").eq("id", bot_id).eq("user_id", user.user.id).execute()
        if not bot_check.data:
            raise HTTPException(status_code=404, detail="Bot not found")
        
        client = supabase_admin if supabase_admin else user_supabase
        client.table("messages").delete().eq("bot_id", bot_id).execute()
        return {"status": "success"}
    except Exception as e:
        if "404" in str(e): raise e
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/bots/{bot_id}/share")
async def toggle_share(bot_id: str, body: ShareRequest, user: dict = Depends(verify_user), token: str = Depends(get_token)):
    """Toggle public sharing for a bot. Returns the share URL."""
    user_supabase = get_auth_client(token)
    try:
        # Get current bot
        bot_resp = user_supabase.table("bots").select("share_id, is_public").eq("id", bot_id).eq("user_id", user.user.id).single().execute()
        if not bot_resp.data:
            raise HTTPException(status_code=404, detail="Bot not found")
        
        update_data = {"is_public": body.is_public}
        # Generate share_id if it doesn't exist yet
        share_id = bot_resp.data.get("share_id")
        if not share_id and body.is_public:
            share_id = str(uuid.uuid4())
            update_data["share_id"] = share_id
        
        user_supabase.table("bots").update(update_data).eq("id", bot_id).execute()
        
        return {
            "status": "success",
            "is_public": body.is_public,
            "share_id": share_id if body.is_public else None
        }
    except Exception as e:
        if "404" in str(e): raise e
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/public/bot/{share_id}")
async def get_public_bot(share_id: str):
    """Get public bot info by share link (no auth required)."""
    client = supabase_admin if supabase_admin else supabase
    try:
        response = client.table("bots").select("id, name, is_public").eq("share_id", share_id).eq("is_public", True).single().execute()
        if not response.data:
            raise HTTPException(status_code=404, detail="Bot not found or not public")
        return {"bot_id": response.data["id"], "name": response.data["name"]}
    except Exception as e:
        if "404" in str(e): raise e
        raise HTTPException(status_code=404, detail="Bot not found or not public")

@app.post("/public/chat/{share_id}")
async def public_chat(share_id: str, request: ChatRequest):
    """Chat with a shared bot (no auth required)."""
    client = supabase_admin if supabase_admin else supabase
    try:
        bot_resp = client.table("bots").select("id, workflow_id, is_public").eq("share_id", share_id).eq("is_public", True).single().execute()
        if not bot_resp.data:
            raise HTTPException(status_code=404, detail="Bot not found or not public")
    except Exception as e:
        raise HTTPException(status_code=404, detail="Bot not found or not public")
    
    bot_id = bot_resp.data["id"]
    workflow_id = bot_resp.data.get("workflow_id")
    api_key = os.getenv("GEMINI_API_KEY")
    
    if not api_key:
        raise HTTPException(status_code=500, detail="GEMINI_API_KEY not found")
    
    answer = ""
    if workflow_id:
        wf_response = client.table("workflows").select("nodes, edges").eq("id", workflow_id).single().execute()
        if wf_response.data:
            try:
                result = await build_and_run_workflow(wf_response.data['nodes'], wf_response.data['edges'], request.question)
                answer = result.get('result', "Error running workflow.")
            except Exception as e:
                answer = f"Agent Error: {str(e)}"
        else:
            answer = "Error: Linked workflow not found."
    else:
        answer = get_answer(bot_id, request.question, api_key)
    
    # Log messages
    try:
        client.table("messages").insert([
            {"bot_id": bot_id, "role": "user", "content": request.question},
            {"bot_id": bot_id, "role": "bot", "content": answer}
        ]).execute()
    except Exception as e:
        print(f"Error logging messages: {e}")
    
    return {"answer": answer}


@app.post("/execute-workflow")
async def execute_workflow(request: WorkflowRequest):
    try:
        result = await build_and_run_workflow(request.nodes, request.edges, request.initial_input)
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