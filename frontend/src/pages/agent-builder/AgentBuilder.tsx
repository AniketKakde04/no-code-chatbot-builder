import React, { useState, useCallback } from 'react';
import { 
    ReactFlow, 
    Background, 
    Controls, 
    MiniMap, 
    addEdge, 
    useNodesState, 
    useEdgesState, 
    Connection, 
    Edge, 
    Node,
    applyNodeChanges,
    NodeChange
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { 
    ArrowLeft, 
    Play, 
    Search, 
    Mail, 
    Bot, 
    Loader2, 
    X, 
    Settings, 
    Trash2, 
    Database
} from 'lucide-react';
import { Link } from 'react-router-dom';

// --- Initial State ---
const initialNodes: Node[] = [
    { 
        id: '1', 
        position: { x: 50, y: 250 }, 
        data: { 
            label: 'Start Node', 
            backendType: 'input',
            userPrompt: 'Find the latest AI news and email it to me.' 
        }, 
        type: 'input',
        style: { background: '#10b981', color: 'white', border: 'none', width: 180, padding: '10px', borderRadius: '8px', textAlign: 'center', fontWeight: 'bold' }
    },
    { 
        id: '2', 
        position: { x: 350, y: 250 }, 
        data: { 
            label: 'Researcher Agent', 
            backendType: 'agent', 
            systemInstruction: 'You are a senior tech researcher. You use tools to find information.',
            promptTemplate: '{input}'
        }, 
        type: 'default',
        style: { background: '#6366f1', color: 'white', border: 'none', width: 220, padding: '10px', borderRadius: '8px', textAlign: 'center' }
    },
];

const initialEdges: Edge[] = [
    { id: 'e1-2', source: '1', target: '2', animated: true, style: { stroke: '#fff' } }
];

export const AgentBuilder = () => {
    const [nodes, setNodes] = useNodesState(initialNodes);
    const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
    const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
    const [isRunning, setIsRunning] = useState(false);
    const [result, setResult] = useState<any | null>(null);

    // --- React Flow Handlers ---
    const onNodesChange = useCallback(
        (changes: NodeChange[]) => setNodes((nds) => applyNodeChanges(changes, nds)),
        [setNodes],
    );

    const onConnect = useCallback(
        (params: Connection | Edge) => setEdges((eds) => addEdge({ ...params, animated: true, style: { stroke: '#fff', strokeWidth: 2 } }, eds)),
        [setEdges],
    );

    const onNodeClick = (_: React.MouseEvent, node: Node) => {
        setSelectedNodeId(node.id);
    };

    const onPaneClick = () => {
        setSelectedNodeId(null);
    };

    // --- Node Data Updates ---
    const updateNodeData = (key: string, value: string) => {
        setNodes((nds) =>
            nds.map((node) => {
                if (node.id === selectedNodeId) {
                    return {
                        ...node,
                        data: { ...node.data, [key]: value },
                    };
                }
                return node;
            })
        );
    };
    
    const deleteSelectedNode = () => {
        if (!selectedNodeId) return;
        setNodes((nds) => nds.filter((n) => n.id !== selectedNodeId));
        setSelectedNodeId(null);
    }

    // --- Add New Nodes ---
    const addNode = (backendType: string, defaultLabel: string, color: string) => {
        const id = Math.random().toString(36).substr(2, 9);
        const newNode: Node = {
            id,
            position: { x: Math.random() * 300 + 100, y: Math.random() * 300 + 100 },
            data: { 
                label: defaultLabel, 
                backendType,
                systemInstruction: backendType === 'agent' ? 'You are a helpful assistant.' : undefined,
                userPrompt: backendType === 'input' ? 'Start here...' : undefined,
                receiverEmail: backendType === 'email' ? '' : undefined
            }, 
            type: backendType === 'input' ? 'input' : 'default',
            style: { 
                background: color, 
                color: 'white', 
                border: '1px solid rgba(255,255,255,0.2)', 
                borderRadius: '8px',
                padding: '10px',
                minWidth: '160px',
                textAlign: 'center',
                boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                cursor: 'pointer'
            }
        };
        setNodes((nds) => [...nds, newNode]);
    };

    // --- Run Workflow ---
    const runAgent = async () => {
        setIsRunning(true);
        setResult(null);

        const payload = {
            nodes: nodes.map(n => ({ id: n.id, type: n.type, data: n.data })),
            edges: edges.map(e => ({ source: e.source, target: e.target })),
            initial_input: "" 
        };

        try {
            const response = await fetch('http://localhost:8000/execute-workflow', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            const data = await response.json();
            setResult(data);
        } catch (error) {
            console.error(error);
            setResult({ result: "Error running workflow. Check console." });
        } finally {
            setIsRunning(false);
        }
    };

    // --- Helper to get selected node ---
    const selectedNode = nodes.find(n => n.id === selectedNodeId);

    return (
        <div className="h-screen w-screen bg-slate-950 flex flex-col font-sans text-slate-100 overflow-hidden">
            
            {/* Header */}
            <div className="h-16 flex-none border-b border-slate-800 bg-slate-900/50 flex items-center justify-between px-6 z-20 backdrop-blur-sm">
                <div className="flex items-center gap-4">
                    <Link to="/dashboard" className="p-2 hover:bg-slate-800 rounded-lg text-slate-400 transition-colors">
                        <ArrowLeft className="w-5 h-5" />
                    </Link>
                    <h1 className="text-lg font-bold text-white bg-clip-text text-transparent bg-gradient-to-r from-indigo-400 to-purple-400">
                        AI Agent Builder
                    </h1>
                </div>
                <div className="flex items-center gap-4">
                     <div className="text-xs text-slate-500 hidden md:block">
                        {nodes.length} Nodes • {edges.length} Connections
                     </div>
                    <button
                        onClick={runAgent}
                        disabled={isRunning}
                        className="flex items-center gap-2 px-6 py-2 text-sm font-bold text-white bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 rounded-full shadow-lg shadow-emerald-500/20 disabled:opacity-50 transition-all transform hover:scale-105"
                    >
                        {isRunning ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4 fill-current" />}
                        {isRunning ? 'Running...' : 'Run Workflow'}
                    </button>
                </div>
            </div>

            {/* Main Workspace (Flex Row) */}
            <div className="flex flex-1 overflow-hidden relative">
                
                {/* Left Sidebar (Node Palette) - Fixed width, Flex-none */}
                <div className="w-64 flex-none bg-slate-900 border-r border-slate-800 p-4 flex flex-col gap-3 shadow-xl z-10 overflow-y-auto">
                    <div className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Logic Blocks</div>
                    
                    <button onClick={() => addNode('input', 'Start / User Input', '#10b981')} 
                        className="flex items-center gap-3 p-3 bg-slate-800 hover:bg-slate-700 rounded-lg border border-slate-700 transition-all text-sm font-medium text-left">
                        <Database className="w-4 h-4 text-emerald-400" /> Start Node
                    </button>

                    <button onClick={() => addNode('agent', 'Smart Agent', '#6366f1')} 
                        className="flex items-center gap-3 p-3 bg-slate-800 hover:bg-slate-700 rounded-lg border border-slate-700 transition-all text-sm font-medium text-left">
                        <Bot className="w-4 h-4 text-indigo-400" /> AI Agent
                    </button>

                    <div className="text-xs font-bold text-slate-500 uppercase tracking-wider mt-4 mb-1">Tools</div>

                    <button onClick={() => addNode('tool', 'Web Search', '#f59e0b')} 
                        className="flex items-center gap-3 p-3 bg-slate-800 hover:bg-slate-700 rounded-lg border border-slate-700 transition-all text-sm font-medium text-left">
                        <Search className="w-4 h-4 text-amber-400" /> Web Search
                    </button>

                    <button onClick={() => addNode('email', 'Email Sender', '#ec4899')} 
                        className="flex items-center gap-3 p-3 bg-slate-800 hover:bg-slate-700 rounded-lg border border-slate-700 transition-all text-sm font-medium text-left">
                        <Mail className="w-4 h-4 text-pink-400" /> Email Sender
                    </button>
                </div>

                {/* Center Canvas - Flex Grow */}
                <div className="flex-1 relative bg-slate-950 min-w-0">
                    <ReactFlow
                        nodes={nodes}
                        edges={edges}
                        onNodesChange={onNodesChange}
                        onEdgesChange={onEdgesChange}
                        onConnect={onConnect}
                        onNodeClick={onNodeClick}
                        onPaneClick={onPaneClick}
                        colorMode="dark"
                        fitView
                        className="bg-slate-950"
                    >
                        <Background color="#334155" gap={24} size={1} />
                        <Controls className="bg-slate-800 border-slate-700 fill-slate-300" />
                        <MiniMap className="bg-slate-900 border-slate-800" maskColor="rgba(30, 41, 59, 0.8)" nodeColor="#6366f1" />
                    </ReactFlow>

                    {/* Output Overlay */}
                    {result && (
                        <div className="absolute bottom-6 left-6 right-6 bg-slate-900/95 backdrop-blur-xl border border-slate-700 rounded-2xl p-6 shadow-2xl max-h-60 overflow-y-auto z-30 animate-in slide-in-from-bottom-10">
                            <div className="flex items-center justify-between mb-2">
                                <div className="text-xs font-bold text-emerald-400 uppercase tracking-wider">Workflow Output</div>
                                <button onClick={() => setResult(null)} className="text-slate-500 hover:text-white text-sm">Close</button>
                            </div>
                            <pre className="text-sm text-slate-300 whitespace-pre-wrap font-mono leading-relaxed">
                                {typeof result.result === 'string' ? result.result : JSON.stringify(result, null, 2)}
                            </pre>
                        </div>
                    )}
                </div>

                {/* Right Sidebar (Properties) - Flex None, Responsive */}
                {selectedNode && (
                    <div className="w-80 flex-none bg-slate-900 border-l border-slate-800 p-6 flex flex-col gap-4 shadow-xl overflow-y-auto animate-in slide-in-from-right-10 duration-200 z-20">
                        <div className="flex items-center justify-between mb-2">
                            <h2 className="text-sm font-bold text-white flex items-center gap-2">
                                <Settings className="w-4 h-4 text-indigo-400" /> Configuration
                            </h2>
                            <button onClick={() => setSelectedNodeId(null)} className="text-slate-500 hover:text-white">
                                <X className="w-4 h-4" />
                            </button>
                        </div>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-xs font-medium text-slate-400 mb-1">Display Label</label>
                                <input
                                    type="text"
                                    value={selectedNode.data.label as string}
                                    onChange={(e) => updateNodeData('label', e.target.value)}
                                    className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2 text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                />
                            </div>

                            {selectedNode.data.backendType === 'input' && (
                                <div>
                                    <label className="block text-xs font-bold text-emerald-400 mb-1">Initial User Prompt</label>
                                    <textarea
                                        value={selectedNode.data.userPrompt as string || ''}
                                        onChange={(e) => updateNodeData('userPrompt', e.target.value)}
                                        className="w-full h-32 bg-slate-800 border border-slate-700 rounded-lg p-3 text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-none"
                                        placeholder="Enter the starting prompt here..."
                                    />
                                    <p className="text-[10px] text-slate-500 mt-1">This text initiates the workflow.</p>
                                </div>
                            )}

                            {selectedNode.data.backendType === 'agent' && (
                                <>
                                    <div>
                                        <label className="block text-xs font-bold text-indigo-400 mb-1">System Instructions</label>
                                        <textarea
                                            value={selectedNode.data.systemInstruction as string || ''}
                                            onChange={(e) => updateNodeData('systemInstruction', e.target.value)}
                                            className="w-full h-32 bg-slate-800 border border-slate-700 rounded-lg p-3 text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
                                            placeholder="You are a helpful assistant..."
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-medium text-slate-400 mb-1">User Prompt Template</label>
                                        <input
                                            type="text"
                                            value={selectedNode.data.promptTemplate as string || '{input}'}
                                            onChange={(e) => updateNodeData('promptTemplate', e.target.value)}
                                            className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2 text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                        />
                                        <p className="text-[10px] text-slate-500 mt-1">Use <code>{'{input}'}</code> to insert data from previous node.</p>
                                    </div>
                                </>
                            )}

                            {selectedNode.data.backendType === 'email' && (
                                <div>
                                    <label className="block text-xs font-bold text-pink-400 mb-1">Receiver Email</label>
                                    <input
                                        type="email"
                                        value={selectedNode.data.receiverEmail as string || ''}
                                        onChange={(e) => updateNodeData('receiverEmail', e.target.value)}
                                        className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2 text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-pink-500"
                                        placeholder="client@example.com"
                                    />
                                </div>
                            )}

                            <div className="pt-4 border-t border-slate-800 mt-auto">
                                <button 
                                    onClick={deleteSelectedNode}
                                    className="w-full py-2 bg-red-500/10 hover:bg-red-500/20 text-red-500 border border-red-500/50 rounded-lg text-sm transition-colors flex items-center justify-center gap-2"
                                >
                                    <Trash2 className="w-4 h-4" /> Delete Node
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};