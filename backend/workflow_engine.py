import os
import sys
import smtplib
import datetime
import asyncio
import nest_asyncio
import shutil
from typing import TypedDict, List, Dict, Any, Annotated
from email.mime.text import MIMEText

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
    # WINDOWS FIX: Wrap in 'cmd /c' to ensure npx/npm batch files execute correctly
    if sys.platform == "win32":
        if command in ["npx", "npm", "npx.cmd", "npm.cmd"]:
            print(f"🪟 Windows detected: Wrapping '{command}' in 'cmd /c'")
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
        
        # 1. Initialize LLM
        llm = ChatGoogleGenerativeAI(
            google_api_key=os.getenv("GEMINI_API_KEY"), 
            model="gemini-2.5-flash",
            temperature=0
        )
        
        # 2. Collect All Tools
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
            
        # 3. Prepare Context
        today = datetime.datetime.now().strftime("%B %d, %Y")
        final_system_msg = f"{system_instruction}\n\nCurrent Date: {today}."
        final_messages = [SystemMessage(content=final_system_msg)] + messages
        
        # 4. Invoke
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

        # 1. Validate Credentials
        if not sender_email or not sender_password:
            return {"messages": [AIMessage(content="Error: EMAIL_USER or EMAIL_PASS not found in environment variables.")]}

        # 2. Final Validation of Receiver
        final_receiver = receiver_email
        if not final_receiver or not final_receiver.strip():
             return {"messages": [AIMessage(content="Error: No Receiver Email provided (checked Node Input, RECEIVER_EMAIL env, and EMAIL_USER fallback).")]}
        
        print(f"--- SENDING EMAIL TO {final_receiver} ---")

        # 3. Prepare Content
        last_message = state["messages"][-1]
        email_body = str(last_message.content)

        try:
            # UTF-8 for special characters
            msg = MIMEText(email_body, 'plain', 'utf-8')
            msg['Subject'] = "Agent Report"
            msg['From'] = sender_email
            msg['To'] = final_receiver

            with smtplib.SMTP_SSL('smtp.gmail.com', 465) as server:
                server.login(sender_email, sender_password)
                server.send_message(msg)
            
            return {"messages": [AIMessage(content=f"✅ Email sent successfully to {final_receiver}")]}
        except Exception as e:
            print(f"Email Error: {e}")
            return {"messages": [AIMessage(content=f"❌ Failed to send email: {str(e)}")]}
    return email_node_func

# --- 5. GRAPH BUILDER ---

def build_and_run_workflow(nodes_config: List[Dict], edges_config: List[Dict], request_initial_input: str):
    print(f"Building workflow with {len(nodes_config)} nodes")

    workflow = StateGraph(AgentState)
    
    # Check for hardcoded tools
    has_native_tools = any(n.get('data', {}).get('backendType') in ['tool', 'search'] for n in nodes_config)
    
    # Check for MCP Config
    mcp_config = None
    mcp_node = next((n for n in nodes_config if n.get('data', {}).get('backendType') == 'mcp'), None)
    if mcp_node:
        raw_cmd = mcp_node['data'].get('serverCommand', '')
        if raw_cmd:
            parts = raw_cmd.split(' ')
            mcp_config = {
                "command": parts[0],
                "args": parts[1:]
            }

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
            # --- EMAIL PRIORITY LOGIC ---
            # 1. Frontend Node Input
            # 2. Env Var: RECEIVER_EMAIL
            # 3. Env Var: EMAIL_USER (Sender)
            
            raw_receiver = data.get('receiverEmail')
            
            if raw_receiver and raw_receiver.strip():
                receiver = raw_receiver
            else:
                receiver = os.getenv("RECEIVER_EMAIL") or os.getenv("EMAIL_USER")
                
            workflow.add_node(node_id, get_email_node(receiver))

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