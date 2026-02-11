import os
import sys
import smtplib
import datetime
import asyncio
import nest_asyncio
import shutil
from typing import TypedDict, List, Dict, Any, Annotated
from email.mime.text import MIMEText
from twilio.rest import Client
from twilio.base.exceptions import TwilioRestException
from docx import Document as DocxDocument # NEW IMPORT

# Apply nested asyncio to allow MCP client to run inside FastAPI
nest_asyncio.apply()

from langgraph.graph import StateGraph, START, END
from langgraph.graph.message import add_messages
from langgraph.prebuilt import ToolNode, tools_condition
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_community.tools.tavily_search import TavilySearchResults
from langchain_core.messages import HumanMessage, SystemMessage, AIMessage

# --- MCP IMPORTS ---
from mcp import ClientSession, StdioServerParameters
from mcp.client.stdio import stdio_client
from langchain_mcp_adapters.tools import load_mcp_tools

# --- 1. DEFINE STATE ---
class AgentState(TypedDict):
    messages: Annotated[list, add_messages]
    metadata: Dict[str, Any]

# --- 2. DEFINE GLOBAL TOOLS ---
tavily_tool = TavilySearchResults(max_results=3)

# --- 3. HELPER: MCP TOOL LOADER ---
async def get_mcp_tools(command: str, args: List[str]):
    """
    Connects to a local MCP server via Stdio and returns LangChain tools.
    """
    if sys.platform == "win32":
        if command in ["npx", "npm", "npx.cmd", "npm.cmd"]:
            args = ["/c", command] + args
            command = "cmd"

    print(f"🔌 Connecting to MCP Server: {command} {args}")
    
    server_params = StdioServerParameters(
        command=command, 
        args=args, 
        env=os.environ.copy()
    )
    
    try:
        async with stdio_client(server_params) as (read, write):
            async with ClientSession(read, write) as session:
                await session.initialize()
                tools = await load_mcp_tools(session)
                print(f"✅ Loaded {len(tools)} MCP tools: {[t.name for t in tools]}")
                return tools
    except Exception as e:
        print(f"❌ MCP Connection Failed: {e}")
        return []

# --- 4. NODE FACTORIES ---

def get_llm_node(system_instruction: str, user_template: str, bind_tools: bool = False, mcp_config: Dict = None):
    async def llm_node_func(state: AgentState):
        messages = state['messages']
        llm = ChatGoogleGenerativeAI(
            google_api_key=os.getenv("GEMINI_API_KEY"), 
            model="gemini-2.5-flash",
            temperature=0
        )
        
        all_tools = []
        if bind_tools:
            all_tools.append(tavily_tool)
            
        if mcp_config and mcp_config.get('command'):
            cmd = mcp_config['command']
            args = mcp_config.get('args', [])
            mcp_tools = await get_mcp_tools(cmd, args)
            all_tools.extend(mcp_tools)
            
        if all_tools:
            llm = llm.bind_tools(all_tools)
            
        today = datetime.datetime.now().strftime("%B %d, %Y")
        final_system_msg = f"{system_instruction}\n\nCurrent Date: {today}."
        final_messages = [SystemMessage(content=final_system_msg)] + messages
        
        try:
            response = await llm.ainvoke(final_messages)
            return {"messages": [response]}
        except Exception as e:
            print(f"LLM Invocation Failed: {e}")
            return {"messages": [AIMessage(content=f"Error executing agent: {str(e)}")]}
        
    return llm_node_func

def get_email_node(receiver_email: str):
    def email_node_func(state: AgentState):
        sender_email = os.getenv("EMAIL_USER")
        sender_password = os.getenv("EMAIL_PASS")

        if not sender_email or not sender_password:
            return {"messages": [AIMessage(content="Error: EMAIL_USER or EMAIL_PASS not found.")]}

        final_receiver = receiver_email
        if not final_receiver or not final_receiver.strip():
             final_receiver = sender_email
        
        last_message = state["messages"][-1]
        email_body = str(last_message.content)

        try:
            msg = MIMEText(email_body, 'plain', 'utf-8')
            msg['Subject'] = "Agent Report"
            msg['From'] = sender_email
            msg['To'] = final_receiver

            with smtplib.SMTP_SSL('smtp.gmail.com', 465) as server:
                server.login(sender_email, sender_password)
                server.send_message(msg)
            
            return {"messages": [AIMessage(content=f"✅ Email sent successfully to {final_receiver}")]}
        except Exception as e:
            return {"messages": [AIMessage(content=f"❌ Failed to send email: {str(e)}")]}
    return email_node_func

def get_whatsapp_node(receiver_phone: str):
    def whatsapp_node_func(state: AgentState):
        sid = os.getenv("TWILIO_ACCOUNT_SID")
        token = os.getenv("TWILIO_AUTH_TOKEN")
        from_number = os.getenv("TWILIO_FROM_NUMBER")

        if not sid or not token or not from_number:
            return {"messages": [AIMessage(content="Error: Twilio Credentials not found.")]}

        if not from_number.startswith("whatsapp:"):
            from_number = f"whatsapp:{from_number}"

        final_receiver = receiver_phone
        if not final_receiver or not final_receiver.strip():
             return {"messages": [AIMessage(content="Error: No Receiver Phone Number provided.")]}

        if not final_receiver.startswith("whatsapp:"):
            final_receiver = f"whatsapp:{final_receiver}"
            
        print(f"--- SENDING WHATSAPP TO {final_receiver} ---")

        last_message = state["messages"][-1]
        body_text = str(last_message.content)
        
        if len(body_text) > 1500:
            body_text = body_text[:1500] + "... (truncated)"

        try:
            client = Client(sid, token)
            message = client.messages.create(
                body=body_text,
                from_=from_number,
                to=final_receiver
            )
            return {"messages": [AIMessage(content=f"✅ WhatsApp sent! SID: {message.sid}")]}
        except TwilioRestException as e:
            if e.code == 63007:
                return {"messages": [AIMessage(content=f"❌ Failed: Twilio Channel not found (Sandbox not joined).")]}
            return {"messages": [AIMessage(content=f"❌ Failed to send WhatsApp: {str(e)}")]}
        except Exception as e:
            return {"messages": [AIMessage(content=f"❌ Failed to send WhatsApp: {str(e)}")]}

    return whatsapp_node_func

# --- UPDATED: DOC WRITER NODE (Word .docx) ---
def get_doc_writer_node(filename: str):
    """
    Writes content to a .docx file (compatible with Google Docs).
    """
    def doc_writer_node_func(state: AgentState):
        final_filename = filename if filename and filename.strip() else "agent_output.docx"
        if not final_filename.endswith(".docx"):
            final_filename += ".docx"
            
        output_dir = "generated_docs"
        os.makedirs(output_dir, exist_ok=True)
        
        file_path = os.path.join(output_dir, final_filename)
        
        last_message = state["messages"][-1]
        content = str(last_message.content)
        
        try:
            # Create a Word Document
            doc = DocxDocument()
            doc.add_heading('Agent Generated Report', 0)
            doc.add_paragraph(content)
            doc.save(file_path)
            
            abs_path = os.path.abspath(file_path)
            return {"messages": [AIMessage(content=f"✅ Word Document created: {abs_path}")]}
        except Exception as e:
            return {"messages": [AIMessage(content=f"❌ Failed to write document: {str(e)}")]}

    return doc_writer_node_func

# --- 5. GRAPH BUILDER ---

def build_and_run_workflow(nodes_config: List[Dict], edges_config: List[Dict], request_initial_input: str):
    print(f"Building workflow with {len(nodes_config)} nodes")

    workflow = StateGraph(AgentState)
    
    has_native_tools = any(n.get('data', {}).get('backendType') in ['tool', 'search'] for n in nodes_config)
    
    mcp_config = None
    mcp_node = next((n for n in nodes_config if n.get('data', {}).get('backendType') == 'mcp'), None)
    if mcp_node:
        raw_cmd = mcp_node['data'].get('serverCommand', '')
        if raw_cmd:
            parts = raw_cmd.split(' ')
            mcp_config = {"command": parts[0], "args": parts[1:]}

    # 1. Add Nodes
    input_override = ""

    for node in nodes_config:
        node_id = node['id']
        data = node.get('data', {})
        backend_type = data.get('backendType', 'default')

        if backend_type == 'input':
            input_override = data.get('userPrompt', '')
            workflow.add_node(node_id, lambda state: {}) 

        elif backend_type == 'agent':
            sys_instr = data.get('systemInstruction', 'You are a helpful assistant.')
            user_tmpl = data.get('promptTemplate', '{input}')
            workflow.add_node(node_id, get_llm_node(sys_instr, user_tmpl, bind_tools=has_native_tools, mcp_config=mcp_config))
            
        elif backend_type == 'tool' or backend_type == 'search':
            workflow.add_node(node_id, ToolNode([tavily_tool]))
            
        elif backend_type == 'mcp':
            workflow.add_node(node_id, lambda state: {})
            
        elif backend_type == 'email':
            raw_receiver = data.get('receiverEmail')
            receiver = raw_receiver if raw_receiver and raw_receiver.strip() else os.getenv("RECEIVER_EMAIL") or os.getenv("EMAIL_USER")
            workflow.add_node(node_id, get_email_node(receiver))
            
        elif backend_type == 'whatsapp':
            receiver = data.get('receiverPhone')
            workflow.add_node(node_id, get_whatsapp_node(receiver))
            
        elif backend_type == 'doc_writer':
            filename = data.get('filename')
            workflow.add_node(node_id, get_doc_writer_node(filename))

    # 2. Add Edges
    for edge in edges_config:
        source = edge['source']
        target = edge['target']
        
        source_node = next((n for n in nodes_config if n['id'] == source), None)
        target_node = next((n for n in nodes_config if n['id'] == target), None)
        
        if source_node and source_node.get('data', {}).get('backendType') == 'agent':
            if target_node and target_node.get('data', {}).get('backendType') in ['tool', 'search', 'mcp']:
                workflow.add_conditional_edges(source, tools_condition, {"tools": target, END: END})
            else:
                workflow.add_edge(source, target)
        else:
            workflow.add_edge(source, target)
            
    # 3. Entry Point & Run
    start_node = next((n['id'] for n in nodes_config if n.get('data', {}).get('backendType') == 'input'), None)
    if start_node: workflow.set_entry_point(start_node)
    
    app = workflow.compile()
    final_input = input_override if input_override.strip() else request_initial_input
    
    async def run_async():
        return await app.ainvoke({
            "messages": [HumanMessage(content=final_input)],
            "metadata": {}
        })

    try:
        final_state = asyncio.run(run_async())
        return {
            "result": final_state["messages"][-1].content,
            "full_history": [m.content for m in final_state["messages"]]
        }
    except Exception as e:
        print(f"Workflow execution failed: {e}")
        return {
            "result": f"Error: {str(e)}",
            "full_history": []
        }