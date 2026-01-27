import os
import smtplib
import datetime
from typing import TypedDict, List, Dict, Any, Annotated
from email.mime.text import MIMEText

from langgraph.graph import StateGraph, START, END
from langgraph.graph.message import add_messages
from langgraph.prebuilt import ToolNode, tools_condition
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_community.tools.tavily_search import TavilySearchResults
from langchain_core.messages import HumanMessage, SystemMessage, AIMessage

# --- 1. DEFINE STATE ---
class AgentState(TypedDict):
    messages: Annotated[list, add_messages]
    metadata: Dict[str, Any]

# --- 2. DEFINE TOOLS ---
tavily_tool = TavilySearchResults(max_results=3)

# --- 3. NODE FACTORIES ---

def get_llm_node(system_instruction: str, user_template: str, bind_tools: bool = False):
    """
    Creates an LLM node with specific System Instructions and User Prompt Template.
    user_template: e.g. "Summarize this: {input}" or just "{input}"
    """
    def llm_node_func(state: AgentState):
        messages = state['messages']
        
        # 1. Initialize LLM
        llm = ChatGoogleGenerativeAI(
            google_api_key=os.getenv("GEMINI_API_KEY"), 
            model="gemini-2.5-flash",
            temperature=0
        )
        
        if bind_tools:
            llm = llm.bind_tools([tavily_tool])
            
        # 2. Prepare Context
        today = datetime.datetime.now().strftime("%B %d, %Y")
        
        # 3. Construct System Message
        final_system_msg = f"{system_instruction}\n\nCurrent Date: {today}."
        
        # 4. Handle User Template (Wrapping the previous output)
        # If this isn't the first node, the 'input' is the last message content.
        # However, LangGraph passes the whole history. 
        # We append a new HumanMessage if a template is provided and it's NOT just "{input}"
        # For simplicity in this v1: We rely on the System Prompt to guide behavior, 
        # and assume the history is the input.
        
        # BUT, if we want to force a specific user prompt structure:
        final_messages = [SystemMessage(content=final_system_msg)] + messages
        
        response = llm.invoke(final_messages)
        return {"messages": [response]}
        
    return llm_node_func

def get_email_node(receiver_email: str):
    """
    Factory to create an email node with a specific recipient.
    """
    def email_node_func(state: AgentState):
        print(f"--- SENDING EMAIL TO {receiver_email} ---")
        
        sender_email = os.getenv("EMAIL_USER")
        sender_password = os.getenv("EMAIL_PASS")

        if not sender_email or not sender_password:
            return {"messages": [AIMessage(content="Error: Email credentials not set in environment.")]}

        # Extract last message content
        last_message = state["messages"][-1]
        email_body = str(last_message.content)

        try:
            msg = MIMEText(email_body)
            msg['Subject'] = "Agent Report"
            msg['From'] = sender_email
            msg['To'] = receiver_email

            with smtplib.SMTP_SSL('smtp.gmail.com', 465) as server:
                server.login(sender_email, sender_password)
                server.send_message(msg)
            
            return {"messages": [AIMessage(content=f"✅ Email sent successfully to {receiver_email}")]}
        except Exception as e:
            return {"messages": [AIMessage(content=f"❌ Failed to send email: {str(e)}")]}

    return email_node_func

# --- 4. GRAPH BUILDER ---

def build_and_run_workflow(nodes_config: List[Dict], edges_config: List[Dict], request_initial_input: str):
    print(f"Building workflow with {len(nodes_config)} nodes")

    workflow = StateGraph(AgentState)
    
    # Check for global tools requirement
    has_tools = any(n.get('data', {}).get('backendType') in ['tool', 'search'] for n in nodes_config)
    
    # 1. Add Nodes
    input_override = ""

    for node in nodes_config:
        node_id = node['id']
        data = node.get('data', {})
        backend_type = data.get('backendType', 'default')

        if backend_type == 'input':
            # Extract the starting prompt from the Input Node
            input_override = data.get('userPrompt', '')
            workflow.add_node(node_id, lambda state: {}) # Pass-through

        elif backend_type == 'agent':
            system_instruction = data.get('systemInstruction', 'You are a helpful assistant.')
            user_template = data.get('promptTemplate', '{input}')
            workflow.add_node(node_id, get_llm_node(system_instruction, user_template, bind_tools=has_tools))
            
        elif backend_type == 'tool' or backend_type == 'search':
            workflow.add_node(node_id, ToolNode([tavily_tool]))
            
        elif backend_type == 'email':
            receiver = data.get('receiverEmail', os.getenv("EMAIL_USER")) # Default to self if missing
            workflow.add_node(node_id, get_email_node(receiver))

    # 2. Add Edges
    for edge in edges_config:
        source = edge['source']
        target = edge['target']
        
        # Smart Conditional Logic for Agents
        source_node = next((n for n in nodes_config if n['id'] == source), None)
        target_node = next((n for n in nodes_config if n['id'] == target), None)
        
        if source_node and source_node.get('data', {}).get('backendType') == 'agent':
            if target_node and target_node.get('data', {}).get('backendType') in ['tool', 'search']:
                # Agent -> Tool (Conditional)
                workflow.add_conditional_edges(source, tools_condition, {"tools": target, END: END})
            else:
                workflow.add_edge(source, target)
        else:
            workflow.add_edge(source, target)
            
    # 3. Set Entry Point
    start_node = next((n['id'] for n in nodes_config if n.get('data', {}).get('backendType') == 'input'), None)
    if start_node:
        workflow.set_entry_point(start_node)
    
    # 4. Compile & Run
    app = workflow.compile()
    
    # Use the Input Node's prompt if available, otherwise use the request input
    final_input = input_override if input_override.strip() else request_initial_input
    
    print(f"Running workflow with input: {final_input}")

    final_state = app.invoke({
        "messages": [HumanMessage(content=final_input)],
        "metadata": {}
    })
    
    return {
        "result": final_state["messages"][-1].content,
        "full_history": [m.content for m in final_state["messages"]]
    }