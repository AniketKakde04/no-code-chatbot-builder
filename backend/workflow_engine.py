import os
from typing import TypedDict, List, Dict, Any
from langgraph.graph import StateGraph, END
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_community.tools import DuckDuckGoSearchRun

# "State" now just holds a generic history of what happened
class AgentState(TypedDict):
    messages: List[str]
    current_input: str
    results: Dict[str, Any]

# --- GENERIC NODES ---

def llm_node(state: AgentState, prompt_template: str):
    """Runs the AI with a user-defined prompt"""
    print(f"--- EXECUTING LLM NODE ---")
    input_text = state['current_input']
    
    # Generic LLM Call
    llm = ChatGoogleGenerativeAI(
        google_api_key=os.getenv("GEMINI_API_KEY"), 
        model="gemini-2.5-flash"
    )
    
    # Basic Prompt Injection
    final_prompt = f"{prompt_template}\n\nInput: {input_text}"
    response = llm.invoke(final_prompt)
    
    return {"current_input": response.content, "results": {"llm_output": response.content}}

def search_node(state: AgentState):
    """Generic Search Tool"""
    print(f"--- EXECUTING SEARCH NODE ---")
    query = state['current_input']
    search = DuckDuckGoSearchRun()
    result = search.invoke(query)
    return {"current_input": result, "results": {"search_output": result}}

# --- DYNAMIC GRAPH BUILDER ---

def build_and_run_workflow(nodes_config: List[Dict], edges_config: List[Dict], initial_input: str):
    """
    Constructs a LangGraph dynamically from the Frontend JSON.
    nodes_config: [{'id': '1', 'type': 'llm', 'data': {'prompt': '...'}}]
    edges_config: [{'source': '1', 'target': '2'}]
    """
    print(f"DEBUG: Nodes: {[n['id'] + ':' + n.get('type', '?') for n in nodes_config]}")
    print(f"DEBUG: Edges: {[e['source'] + '->' + e['target'] for e in edges_config]}")

    workflow = StateGraph(AgentState)
    
    # 1. Add Nodes dynamically
    for node in nodes_config:
        node_id = node['id']
        node_type = node.get('type', 'default')
        node_data = node.get('data', {})
        
        if node_type == 'llm':
            # Create a partial function with the user's specific prompt
            workflow.add_node(node_id, lambda state, d=node_data: llm_node(state, d.get('label', '')))
        elif node_type == 'search':
            workflow.add_node(node_id, search_node)
        elif node_type == 'input':
            workflow.add_node(node_id, lambda state: {"current_input": state['current_input']})
        else:
             # Default pass-through
            workflow.add_node(node_id, lambda state: print(f"Passing {node_id}"))

    # 2. Add Edges dynamically
    for edge in edges_config:
        workflow.add_edge(edge['source'], edge['target'])
        
    # 3. Set Entry and Exit
    # Assumption: User draws from an 'input' node
    start_node = next((n['id'] for n in nodes_config if n['type'] == 'input'), None)
    if start_node:
        workflow.set_entry_point(start_node)
    
    # Compile
    app = workflow.compile()
    
    # Run
    final_state = app.invoke({
        "messages": [], 
        "current_input": initial_input, 
        "results": {}
    })
    
    return final_state