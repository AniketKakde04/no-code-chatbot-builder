import React, { useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
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
    ArrowLeft, Play, Search, Mail, Bot, Loader2, X, Settings, Trash2, Database,
    Server, MessageSquare, Sparkles, PanelLeftClose, PanelLeftOpen, BookOpen, FileText
} from 'lucide-react';

const initialNodes: Node[] = [
    { 
        id: '1', 
        position: { x: 50, y: 250 }, 
        data: { label: 'Start', backendType: 'input', userPrompt: 'Find me the latest AI news.' }, 
        type: 'input',
        style: { background: '#10b981', color: 'white', border: 'none', width: 160, padding: '10px', borderRadius: '8px', textAlign: 'center', fontWeight: 'bold' }
    },
    { 
        id: '2', 
        position: { x: 300, y: 250 }, 
        data: { label: 'Researcher', backendType: 'agent', systemInstruction: 'You are a helpful assistant.' }, 
        type: 'default',
        style: { background: '#6366f1', color: 'white', border: 'none', width: 200, padding: '10px', borderRadius: '8px', textAlign: 'center' }
    },
];

const initialEdges: Edge[] = [
    { id: 'e1-2', source: '1', target: '2', animated: true, style: { stroke: '#fff' } }
];

export const AgentBuilder = () => {
    // State
    const [nodes, setNodes] = useNodesState(initialNodes);
    const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
    const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
    const [isRunning, setIsRunning] = useState(false);
    const [isGenerating, setIsGenerating] = useState(false);
    const [result, setResult] = useState<any | null>(null);
    const [isSidebarOpen, setIsSidebarOpen] = useState(true);
    const [showMagicModal, setShowMagicModal] = useState(false);
    const [magicPrompt, setMagicPrompt] = useState("");

    // --- MAGIC BUILD ---
    const handleMagicBuild = async () => {
        if (!magicPrompt.trim()) return;
        setIsGenerating(true);
        try {
            const response = await fetch('http://localhost:8000/generate-workflow', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ prompt: magicPrompt })
            });
            const data = await response.json();
            if (data.status === 'success') {
                setNodes(data.data.nodes.map((n: any) => ({
                    ...n,
                    type: n.data.backendType === 'input' ? 'input' : 'default',
                    style: getStyleForType(n.data.backendType)
                })));
                setEdges(data.data.edges.map((e: any) => ({ ...e, animated: true, style: { stroke: '#fff' } })));
                setShowMagicModal(false);
                setMagicPrompt("");
            }
        } catch (e) { alert("Magic Build failed"); } 
        finally { setIsGenerating(false); }
    };

    // --- EXECUTE ---
    const runAgent = async () => {
        setIsRunning(true);
        setResult(null);
        const payload = {
            nodes: nodes.map(n => ({ id: n.id, type: n.type, data: n.data })),
            edges: edges.map(e => ({ source: e.source, target: e.target })),
            initial_input: "" 
        };
        try {
            const res = await fetch('http://localhost:8000/execute-workflow', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            const data = await res.json();
            setResult(data);
        } catch (e) { setResult({ result: "Error running workflow" }); } 
        finally { setIsRunning(false); }
    };

    // --- HELPERS ---
    const onNodesChange = useCallback((c: NodeChange[]) => setNodes((ns) => applyNodeChanges(c, ns)), [setNodes]);
    const onConnect = useCallback((p: Connection | Edge) => setEdges((es) => addEdge({ ...p, animated: true, style: { stroke: '#fff' } }, es)), [setEdges]);
    const updateNodeData = (k: string, v: string) => setNodes((ns) => ns.map((n) => n.id === selectedNodeId ? { ...n, data: { ...n.data, [k]: v } } : n));
    const deleteSelectedNode = () => { setNodes((ns) => ns.filter((n) => n.id !== selectedNodeId)); setSelectedNodeId(null); };

    const getStyleForType = (type: string) => {
        const base = { color: 'white', border: 'none', padding: '10px', borderRadius: '8px', textAlign: 'center', minWidth: '150px' };
        switch(type) {
            case 'input': return { ...base, background: '#10b981' };
            case 'agent': return { ...base, background: '#6366f1' };
            case 'tool': return { ...base, background: '#f59e0b' };
            case 'knowledge': return { ...base, background: '#0ea5e9' };
            case 'email': return { ...base, background: '#ec4899' };
            case 'whatsapp': return { ...base, background: '#25D366' };
            case 'doc_writer': return { ...base, background: '#f97316' }; // Orange for Files
            case 'mcp': return { ...base, background: '#8b5cf6' };
            default: return base;
        }
    };

    const addNode = (type: string, label: string, color: string) => {
        const id = Math.random().toString(36).substr(2, 9);
        const newNode: Node = {
            id,
            position: { x: Math.random() * 300 + 100, y: Math.random() * 300 + 100 },
            data: { 
                label, backendType: type,
                systemInstruction: type === 'agent' ? 'You are a helpful assistant.' : undefined,
                userPrompt: type === 'input' ? 'Start here...' : undefined,
                receiverEmail: type === 'email' ? '' : undefined,
                receiverPhone: type === 'whatsapp' ? '' : undefined,
                serverCommand: type === 'mcp' ? 'python local_mcp.py' : undefined,
                knowledgeBotId: type === 'knowledge' ? '' : undefined,
                filename: type === 'doc_writer' ? 'report.docx' : undefined
            }, 
            type: type === 'input' ? 'input' : 'default',
            style: { ...getStyleForType(type), background: color }
        };
        setNodes((nds) => [...nds, newNode]);
    };

    const selectedNode = nodes.find(n => n.id === selectedNodeId);

    return (
        <div className="h-screen w-screen bg-slate-950 flex flex-col font-sans text-slate-100 overflow-hidden">
            {/* Header */}
            <div className="h-16 flex-none border-b border-slate-800 bg-slate-900/50 flex items-center justify-between px-6 z-20 backdrop-blur-sm">
                <div className="flex items-center gap-4">
                    <Link to="/dashboard" className="p-2 hover:bg-slate-800 rounded-lg text-slate-400"><ArrowLeft className="w-5 h-5" /></Link>
                    <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="p-2 hover:bg-slate-800 rounded-lg text-slate-400">
                        {isSidebarOpen ? <PanelLeftClose className="w-5 h-5" /> : <PanelLeftOpen className="w-5 h-5" />}
                    </button>
                    <h1 className="text-lg font-bold text-white bg-clip-text text-transparent bg-gradient-to-r from-indigo-400 to-purple-400">AI Agent Builder</h1>
                </div>
                <div className="flex gap-3">
                    <button onClick={() => setShowMagicModal(true)} className="flex items-center gap-2 px-4 py-2 text-sm font-bold text-white bg-purple-600 hover:bg-purple-500 rounded-lg shadow-lg shadow-purple-500/20 transition-all border border-purple-400/20">
                        <Sparkles className="w-4 h-4" /> Magic Build
                    </button>
                    <button onClick={runAgent} disabled={isRunning} className="flex items-center gap-2 px-6 py-2 text-sm font-bold text-white bg-emerald-600 hover:bg-emerald-500 rounded-lg shadow-lg">
                        {isRunning ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4 fill-current" />} Run
                    </button>
                </div>
            </div>

            <div className="flex flex-1 overflow-hidden relative">
                {/* Palette */}
                <div className={`${isSidebarOpen ? 'w-64' : 'w-0'} transition-all duration-300 flex-none bg-slate-900 border-r border-slate-800 overflow-hidden`}>
                    <div className="w-64 p-4 flex flex-col gap-3 h-full overflow-y-auto">
                        <div className="text-xs font-bold text-slate-500 uppercase">Logic</div>
                        <button onClick={() => addNode('input', 'Start', '#10b981')} className="flex items-center gap-3 p-3 bg-slate-800 hover:bg-slate-700 rounded-lg border border-slate-700 text-sm"><Database className="w-4 h-4 text-emerald-400" /> Start</button>
                        <button onClick={() => addNode('agent', 'Agent', '#6366f1')} className="flex items-center gap-3 p-3 bg-slate-800 hover:bg-slate-700 rounded-lg border border-slate-700 text-sm"><Bot className="w-4 h-4 text-indigo-400" /> Agent</button>
                        
                        <div className="text-xs font-bold text-slate-500 uppercase mt-4">Tools</div>
                        <button onClick={() => addNode('tool', 'Search', '#f59e0b')} className="flex items-center gap-3 p-3 bg-slate-800 hover:bg-slate-700 rounded-lg border border-slate-700 text-sm"><Search className="w-4 h-4 text-amber-400" /> Web Search</button>
                        <button onClick={() => addNode('mcp', 'MCP Tool', '#8b5cf6')} className="flex items-center gap-3 p-3 bg-slate-800 hover:bg-slate-700 rounded-lg border border-slate-700 text-sm"><Server className="w-4 h-4 text-violet-400" /> MCP Server</button>
                        <button onClick={() => addNode('knowledge', 'Knowledge Base', '#0ea5e9')} className="flex items-center gap-3 p-3 bg-slate-800 hover:bg-slate-700 rounded-lg border border-slate-700 text-sm"><BookOpen className="w-4 h-4 text-sky-400" /> Knowledge RAG</button>

                        <div className="text-xs font-bold text-slate-500 uppercase mt-4">Actions</div>
                        <button onClick={() => addNode('email', 'Email', '#ec4899')} className="flex items-center gap-3 p-3 bg-slate-800 hover:bg-slate-700 rounded-lg border border-slate-700 text-sm"><Mail className="w-4 h-4 text-pink-400" /> Email</button>
                        <button onClick={() => addNode('whatsapp', 'WhatsApp', '#25D366')} className="flex items-center gap-3 p-3 bg-slate-800 hover:bg-slate-700 rounded-lg border border-slate-700 text-sm"><MessageSquare className="w-4 h-4 text-green-400" /> WhatsApp</button>
                        <button onClick={() => addNode('doc_writer', 'Doc / Word', '#f97316')} className="flex items-center gap-3 p-3 bg-slate-800 hover:bg-slate-700 rounded-lg border border-slate-700 text-sm"><FileText className="w-4 h-4 text-orange-400" /> Write Word Doc</button>
                    </div>
                </div>

                {/* Canvas */}
                <div className="flex-1 relative bg-slate-950 min-w-0">
                    <ReactFlow nodes={nodes} edges={edges} onNodesChange={onNodesChange} onConnect={onConnect} onNodeClick={(_, n) => setSelectedNodeId(n.id)} colorMode="dark" fitView>
                        <Background color="#334155" gap={24} size={1} />
                        <Controls className="bg-slate-800 border-slate-700 fill-slate-300" />
                        <MiniMap className="bg-slate-900 border-slate-800" maskColor="rgba(30, 41, 59, 0.8)" nodeColor="#6366f1" />
                    </ReactFlow>
                    {result && <div className="absolute bottom-6 left-6 right-6 bg-slate-900/95 backdrop-blur-xl border border-slate-700 rounded-2xl p-6 shadow-2xl max-h-60 overflow-y-auto z-30"><pre className="text-sm text-slate-300 whitespace-pre-wrap font-mono">{typeof result.result === 'string' ? result.result : JSON.stringify(result, null, 2)}</pre><button onClick={() => setResult(null)} className="absolute top-4 right-4 text-slate-500 hover:text-white"><X className="w-5 h-5" /></button></div>}
                </div>

                {/* Properties Panel */}
                {selectedNode && (
                    <div className="w-80 flex-none bg-slate-900 border-l border-slate-800 p-6 flex flex-col gap-4 shadow-xl overflow-y-auto z-20">
                        <div className="flex justify-between"><h2 className="text-sm font-bold text-white">Config</h2><button onClick={() => setSelectedNodeId(null)}><X className="w-4 h-4 text-slate-500" /></button></div>
                        <div className="space-y-4">
                            <div><label className="text-xs text-slate-400">Label</label><input type="text" value={selectedNode.data.label as string} onChange={(e) => updateNodeData('label', e.target.value)} className="w-full bg-slate-800 border border-slate-700 rounded p-2 text-sm text-white" /></div>
                            
                            {selectedNode.data.backendType === 'input' && <div><label className="text-xs text-emerald-400 font-bold">User Prompt</label><textarea value={selectedNode.data.userPrompt as string} onChange={(e) => updateNodeData('userPrompt', e.target.value)} className="w-full h-32 bg-slate-800 border border-slate-700 rounded p-2 text-sm text-white" /></div>}
                            
                            {selectedNode.data.backendType === 'agent' && <div><label className="text-xs text-indigo-400 font-bold">System Instructions</label><textarea value={selectedNode.data.systemInstruction as string} onChange={(e) => updateNodeData('systemInstruction', e.target.value)} className="w-full h-32 bg-slate-800 border border-slate-700 rounded p-2 text-sm text-white" /></div>}
                            
                            {selectedNode.data.backendType === 'mcp' && <div><label className="text-xs text-violet-400 font-bold">Command</label><input type="text" value={selectedNode.data.serverCommand as string} onChange={(e) => updateNodeData('serverCommand', e.target.value)} className="w-full bg-slate-800 border border-slate-700 rounded p-2 text-sm text-white font-mono" /></div>}

                            {selectedNode.data.backendType === 'knowledge' && <div><label className="text-xs text-sky-400 font-bold">Bot ID (for RAG)</label><input type="text" value={selectedNode.data.knowledgeBotId as string} onChange={(e) => updateNodeData('knowledgeBotId', e.target.value)} className="w-full bg-slate-800 border border-slate-700 rounded p-2 text-sm text-white" placeholder="UUID from Dashboard" /><p className="text-[10px] text-slate-500 mt-1">Copy ID from Dashboard URL</p></div>}

                            {selectedNode.data.backendType === 'email' && <div><label className="text-xs text-pink-400 font-bold">Receiver Email</label><input type="email" value={selectedNode.data.receiverEmail as string} onChange={(e) => updateNodeData('receiverEmail', e.target.value)} className="w-full bg-slate-800 border border-slate-700 rounded p-2 text-sm text-white" /></div>}

                            {selectedNode.data.backendType === 'whatsapp' && <div><label className="text-xs text-green-400 font-bold">Receiver Phone</label><input type="text" value={selectedNode.data.receiverPhone as string} onChange={(e) => updateNodeData('receiverPhone', e.target.value)} className="w-full bg-slate-800 border border-slate-700 rounded p-2 text-sm text-white" placeholder="+123..." /></div>}

                            {selectedNode.data.backendType === 'doc_writer' && <div><label className="text-xs text-orange-400 font-bold">Filename (Word)</label><input type="text" value={selectedNode.data.filename as string} onChange={(e) => updateNodeData('filename', e.target.value)} className="w-full bg-slate-800 border border-slate-700 rounded p-2 text-sm text-white" placeholder="report.docx" /></div>}

                            <div className="pt-4 mt-auto border-t border-slate-800"><button onClick={deleteSelectedNode} className="w-full py-2 text-red-500 bg-red-500/10 border border-red-500/50 rounded flex justify-center items-center gap-2 text-sm"><Trash2 className="w-4 h-4" /> Delete</button></div>
                        </div>
                    </div>
                )}
            </div>

            {/* Magic Modal */}
            {showMagicModal && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-slate-900 border border-slate-700 rounded-2xl p-6 w-full max-w-lg shadow-2xl relative">
                        <button onClick={() => setShowMagicModal(false)} className="absolute top-4 right-4 text-slate-500 hover:text-white"><X className="w-5 h-5" /></button>
                        <div className="flex gap-3 mb-4"><Sparkles className="w-6 h-6 text-purple-400" /><h2 className="text-xl font-bold text-white">Magic Build</h2></div>
                        <textarea value={magicPrompt} onChange={(e) => setMagicPrompt(e.target.value)} className="w-full h-32 bg-slate-800 border border-slate-700 rounded-xl p-4 text-slate-200 focus:ring-2 focus:ring-purple-500 mb-6 resize-none" placeholder="Describe your agent..." />
                        <button onClick={handleMagicBuild} disabled={isGenerating} className="w-full py-3 bg-purple-600 hover:bg-purple-500 text-white rounded-xl font-bold flex justify-center items-center gap-2">{isGenerating ? <Loader2 className="animate-spin" /> : "Generate Workflow"}</button>
                    </div>
                </div>
            )}
        </div>
    );
};