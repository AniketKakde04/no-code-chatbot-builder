import React, { useState, useCallback, useEffect, useRef } from 'react';
import { Link, useParams } from 'react-router-dom';
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
import { FileSpreadsheet, Table } from 'lucide-react';


import {
    ArrowLeft, Play, Search, Mail, Bot, Loader2, X, Settings, Trash2, Database,
    Server, MessageSquare, Sparkles, PanelLeftClose, PanelLeftOpen, BookOpen, FileText, Save, BrainCircuit
} from 'lucide-react';

import { supabase } from '@/lib/supabase'; // Import supabase directly for auth
import { api } from '@/services/api';
import { useAuth } from '../../contexts/AuthContext';
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
        data: { label: 'AI Agent', backendType: 'agent', systemInstruction: 'You are an AI assistant.' },
        type: 'default',
        style: { background: '#4f46e5', color: 'white', border: 'none', width: 160, padding: '10px', borderRadius: '8px', textAlign: 'center', fontWeight: 'bold' }
    }
];

const initialEdges: Edge[] = [
    { id: 'e1-2', source: '1', target: '2', animated: true, style: { stroke: '#4f46e5', strokeWidth: 2 } }
];

let id = 3;
const getId = () => `${id++}`;

export const AgentBuilder = () => {
    const { workflowId } = useParams<{ workflowId?: string }>();
    const [nodes, setNodes] = useNodesState(initialNodes);
    const [edges, setEdges] = useEdgesState(initialEdges);
    const [reactFlowInstance, setReactFlowInstance] = useState<any>(null);
    const [selectedNode, setSelectedNode] = useState<Node | null>(null);
    const { user } = useAuth();
    // Run / Generate State
    const [isGenerating, setIsGenerating] = useState(false);
    const [result, setResult] = useState<any>(null);

    // Layout Toggles
    const [isSidebarOpen, setIsSidebarOpen] = useState(true);
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);

    // Magic Modal
    const [showMagicModal, setShowMagicModal] = useState(false);
    const [magicPrompt, setMagicPrompt] = useState("");

    // Save Workflow Modal State
    const [isSaveModalOpen, setIsSaveModalOpen] = useState(false);
    const [workflowName, setWorkflowName] = useState('');
    const [workflowDesc, setWorkflowDesc] = useState('');
    const [isSavingWorkflow, setIsSavingWorkflow] = useState(false);
    const [editingWorkflowId, setEditingWorkflowId] = useState<string | null>(null);
    const [loadingWorkflow, setLoadingWorkflow] = useState(false);
    const [isConnected, setIsConnected] = useState(false);
    const [googleConnected, setGoogleConnected] = useState(false);

    const checkGoogleConnection = async () => {
        if (!user) return;

        const { data, error } = await supabase
            .from('user_integrations')
            .select('id')
            .eq('user_id', user.id)
            .eq('provider', 'google')
            .single();

        if (data) {
            setGoogleConnected(true);
        }
    };
    // Load existing workflow when editing
    useEffect(() => {
        if (workflowId) {
            setLoadingWorkflow(true);
            api.getWorkflows().then((workflows) => {
                const wf = workflows.find((w: any) => w.id === workflowId);
                if (wf) {
                    setNodes(wf.nodes || initialNodes);
                    setEdges(wf.edges || initialEdges);
                    setWorkflowName(wf.name || '');
                    setWorkflowDesc(wf.description || '');
                    setEditingWorkflowId(wf.id);
                    // Update the id counter to avoid collisions
                    const maxId = Math.max(...(wf.nodes || []).map((n: any) => parseInt(n.id) || 0), id);
                    id = maxId + 1;
                }
            }).catch((err) => {
                console.error('Failed to load workflow:', err);
            }).finally(() => {
                setLoadingWorkflow(false);
            });
        }
    }, [workflowId]);

    useEffect(() => {
        // Check if we just came back from the login
        if (window.location.search.includes('integration=success')) {
            setGoogleConnected(true);
            const newUrl = window.location.pathname;
            window.history.replaceState({}, document.title, newUrl);
        } else {
            // Otherwise, check the database to see if they connected previously
            checkGoogleConnection();
        }
    }, [user]);

    const onNodesChange = useCallback((changes: NodeChange[]) => {
        setNodes((nds) => applyNodeChanges(changes, nds));
    }, [setNodes]);

    const onConnect = useCallback((params: Connection | Edge) => {
        setEdges((eds) => addEdge({ ...params, animated: true, style: { stroke: '#4f46e5', strokeWidth: 2 } }, eds));
    }, [setEdges]);

    const onDragStart = (event: React.DragEvent, nodeType: string, label: string, color: string, backendType: string) => {
        event.dataTransfer.setData('application/reactflow', nodeType);
        event.dataTransfer.setData('application/label', label);
        event.dataTransfer.setData('application/color', color);
        event.dataTransfer.setData('application/backendType', backendType);
        event.dataTransfer.effectAllowed = 'move';
    };

    const onDrop = useCallback(
        (event: React.DragEvent) => {
            event.preventDefault();
            const type = event.dataTransfer.getData('application/reactflow');
            const label = event.dataTransfer.getData('application/label');
            const color = event.dataTransfer.getData('application/color');
            const backendType = event.dataTransfer.getData('application/backendType');

            if (!type || !reactFlowInstance) return;

            const position = reactFlowInstance.screenToFlowPosition({ x: event.clientX, y: event.clientY });

            // Fix: Create all nodes as 'default' so they have both input and output handles, 
            // except for the 'input' trigger which should only have output.
            let nodeType = 'default';
            if (backendType === 'input') nodeType = 'input';

            const newNode: Node = {
                id: getId(),
                type: nodeType,
                position,
                data: backendType === 'google_sheets' ? { label, backendType, action: 'append', spreadsheetId: '', sheetName: 'Sheet1', dataPayload: '{{current_data}}' } : { label, backendType },
                style: { background: color, color: 'white', border: 'none', width: 160, padding: '10px', borderRadius: '8px', textAlign: 'center', fontWeight: 'bold' }
            };

            setNodes((nds) => nds.concat(newNode));
        },
        [reactFlowInstance, setNodes],
    );

    const onDragOver = useCallback((event: React.DragEvent) => {
        event.preventDefault();
        event.dataTransfer.dropEffect = 'move';
    }, []);

    const onNodeClick = (_: React.MouseEvent, node: Node) => {
        setSelectedNode(node);
        setIsSettingsOpen(true);
    };

    const updateNodeData = (key: string, value: string) => {
        if (!selectedNode) return;
        setNodes((nds) =>
            nds.map((node) => {
                if (node.id === selectedNode.id) {
                    return { ...node, data: { ...node.data, [key]: value } };
                }
                return node;
            })
        );
        setSelectedNode({ ...selectedNode, data: { ...selectedNode.data, [key]: value } });
    };

    const handleDeleteNode = () => {
        if (!selectedNode) return;
        setNodes((nds) => nds.filter((n) => n.id !== selectedNode.id));
        setEdges((eds) => eds.filter((e) => e.source !== selectedNode.id && e.target !== selectedNode.id));
        setSelectedNode(null);
        setIsSettingsOpen(false);
    };

    const handleRunWorkflow = async () => {
        setIsGenerating(true);
        setResult(null);

        const payload = {
            nodes: nodes.map(n => ({ id: n.id, data: n.data })),
            edges: edges.map(e => ({ source: e.source, target: e.target })),
            initial_input: nodes.find(n => n.data.backendType === 'input')?.data.userPrompt || "Start"
        };

        try {
            // Get the auth token from Supabase session
            const { data: { session } } = await supabase.auth.getSession();
            const token = session?.access_token;

            if (!token) {
                setResult({ result: "Error: Not authenticated" });
                setIsGenerating(false);
                return;
            }

            const res = await fetch('http://localhost:8000/execute-workflow', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(payload)
            });
            const data = await res.json();
            setResult(data);
        } catch (e) {
            console.error(e);
            setResult({ result: "Execution Error" });
        } finally {
            setIsGenerating(false);
        }
    };

    const handleMagicBuild = () => {
        setIsGenerating(true);
        setTimeout(() => {
            const promptLower = magicPrompt.toLowerCase();
            let newNodes: Node[] = [
                { id: '1', position: { x: 50, y: 250 }, data: { label: 'Start', backendType: 'input', userPrompt: magicPrompt }, type: 'input', style: { background: '#10b981', color: 'white', border: 'none', width: 160, padding: '10px', borderRadius: '8px', textAlign: 'center', fontWeight: 'bold' } },
                { id: '2', position: { x: 300, y: 250 }, data: { label: 'AI Agent', backendType: 'agent', systemInstruction: 'You are a smart AI.' }, type: 'default', style: { background: '#4f46e5', color: 'white', border: 'none', width: 160, padding: '10px', borderRadius: '8px', textAlign: 'center', fontWeight: 'bold' } }
            ];
            let newEdges: Edge[] = [
                { id: 'e1-2', source: '1', target: '2', animated: true, style: { stroke: '#4f46e5', strokeWidth: 2 } }
            ];

            if (promptLower.includes('search') || promptLower.includes('news')) {
                newNodes.push({ id: '3', position: { x: 550, y: 150 }, data: { label: 'Web Search', backendType: 'search' }, type: 'default', style: { background: '#ec4899', color: 'white', border: 'none', width: 160, padding: '10px', borderRadius: '8px', textAlign: 'center', fontWeight: 'bold' } });
                newEdges.push({ id: 'e2-3', source: '2', target: '3', animated: true, style: { stroke: '#ec4899', strokeWidth: 2 } });
            }

            if (promptLower.includes('email')) {
                newNodes.push({ id: '4', position: { x: 550, y: 350 }, data: { label: 'Send Email', backendType: 'email' }, type: 'default', style: { background: '#f59e0b', color: 'white', border: 'none', width: 160, padding: '10px', borderRadius: '8px', textAlign: 'center', fontWeight: 'bold' } });
                newEdges.push({ id: 'e2-4', source: '2', target: '4', animated: true, style: { stroke: '#f59e0b', strokeWidth: 2 } });
            }

            setNodes(newNodes);
            setEdges(newEdges);
            setShowMagicModal(false);
            setMagicPrompt("");
            setIsGenerating(false);
        }, 1500);
    };

    // --- Handle Save Workflow to Database Directly ---
    const handleSaveWorkflowToDB = async () => {
        if (!workflowName) {
            alert("Please provide a name for the workflow.");
            return;
        }
        setIsSavingWorkflow(true);
        try {
            const workflowData = {
                name: workflowName,
                description: workflowDesc,
                nodes: nodes,
                edges: edges
            };

            if (editingWorkflowId) {
                // Update existing workflow
                await api.updateWorkflow(editingWorkflowId, workflowData);
                alert("Workflow updated successfully!");
            } else {
                // Create new workflow
                const result = await api.saveWorkflow(workflowData);
                setEditingWorkflowId(result.id);
                alert("Workflow saved successfully! You can now link it to a Bot.");
            }
            setIsSaveModalOpen(false);
        } catch (error) {
            console.error(error);
            alert("Failed to save workflow. See console for details.");
        } finally {
            setIsSavingWorkflow(false);
        }
    };


    return (
        <div className="flex flex-col h-screen bg-slate-950 font-sans overflow-hidden">
            {/* Nav Bar */}
            <div className="h-16 border-b border-slate-800 flex items-center justify-between px-6 bg-slate-900 z-10 shrink-0 shadow-sm">
                <div className="flex items-center gap-4">
                    <Link to="/dashboard" className="text-slate-400 hover:text-white transition-colors"><ArrowLeft className="w-5 h-5" /></Link>
                    <h1 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
                        <Bot className="w-6 h-6 text-indigo-500" />
                        BotCraft Builder
                    </h1>
                </div>
                <div className="flex items-center gap-3">
                    <button onClick={() => setShowMagicModal(true)} className="flex items-center gap-2 bg-purple-600/20 text-purple-400 border border-purple-500/30 px-4 py-2 rounded-lg hover:bg-purple-600 hover:text-white transition-all text-sm font-semibold">
                        <Sparkles className="w-4 h-4" /> Magic Build
                    </button>
                    {/* --- Trigger Save Modal --- */}
                    <button
                        onClick={() => setIsSaveModalOpen(true)}
                        className="flex items-center gap-2 bg-slate-800 border border-slate-700 text-slate-200 px-4 py-2 rounded-lg hover:bg-slate-700 transition-all text-sm font-semibold"
                    >
                        <Save className="w-4 h-4" /> Save Workflow
                    </button>
                    <button onClick={handleRunWorkflow} disabled={isGenerating} className="flex items-center gap-2 bg-indigo-600 text-white px-5 py-2 rounded-lg hover:bg-indigo-500 transition-all shadow-lg shadow-indigo-500/20 disabled:opacity-50 font-bold text-sm">
                        {isGenerating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4 fill-current" />}
                        Run Test
                    </button>
                </div>
            </div>

            <div className="flex flex-1 relative overflow-hidden">
                {/* Left Sidebar - Tools */}
                <div className={`${isSidebarOpen ? 'w-64' : 'w-0'} transition-all duration-300 bg-slate-900 border-r border-slate-800 flex flex-col z-20 shrink-0 overflow-y-auto`}>
                    <div className="p-4">
                        <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Nodes</h3>
                        <div className="space-y-2">
                            <div draggable onDragStart={(e) => onDragStart(e, 'input', 'Start', '#10b981', 'input')} className="bg-emerald-500/10 border border-emerald-500/20 p-3 rounded-xl cursor-grab hover:bg-emerald-500/20 transition-colors flex items-center gap-3 group">
                                <div className="bg-emerald-500 p-1.5 rounded-lg"><MessageSquare className="w-4 h-4 text-white" /></div>
                                <span className="text-sm font-semibold text-emerald-100 group-hover:text-white">User Input</span>
                            </div>
                            <div draggable onDragStart={(e) => onDragStart(e, 'default', 'Agent', '#4f46e5', 'agent')} className="bg-indigo-500/10 border border-indigo-500/20 p-3 rounded-xl cursor-grab hover:bg-indigo-500/20 transition-colors flex items-center gap-3 group">
                                <div className="bg-indigo-500 p-1.5 rounded-lg"><BrainCircuit className="w-4 h-4 text-white" /></div>
                                <span className="text-sm font-semibold text-indigo-100 group-hover:text-white">LLM Agent</span>
                            </div>
                            <div draggable onDragStart={(e) => onDragStart(e, 'default', 'Search', '#ec4899', 'search')} className="bg-pink-500/10 border border-pink-500/20 p-3 rounded-xl cursor-grab hover:bg-pink-500/20 transition-colors flex items-center gap-3 group">
                                <div className="bg-pink-500 p-1.5 rounded-lg"><Search className="w-4 h-4 text-white" /></div>
                                <span className="text-sm font-semibold text-pink-100 group-hover:text-white">Web Search</span>
                            </div>
                            <div draggable onDragStart={(e) => onDragStart(e, 'default', 'Email', '#f59e0b', 'email')} className="bg-amber-500/10 border border-amber-500/20 p-3 rounded-xl cursor-grab hover:bg-amber-500/20 transition-colors flex items-center gap-3 group">
                                <div className="bg-amber-500 p-1.5 rounded-lg"><Mail className="w-4 h-4 text-white" /></div>
                                <span className="text-sm font-semibold text-amber-100 group-hover:text-white">Send Email</span>
                            </div>
                            <div draggable onDragStart={(e) => onDragStart(e, 'default', 'Doc Writer', '#3b82f6', 'doc_writer')} className="bg-blue-500/10 border border-blue-500/20 p-3 rounded-xl cursor-grab hover:bg-blue-500/20 transition-colors flex items-center gap-3 group">
                                <div className="bg-blue-500 p-1.5 rounded-lg"><FileText className="w-4 h-4 text-white" /></div>
                                <span className="text-sm font-semibold text-blue-100 group-hover:text-white">Write Document</span>
                            </div>
                            <div draggable onDragStart={(e) => onDragStart(e, 'default', 'Excel Writer', '#10b981', 'excel_writer')} className="bg-emerald-500/10 border border-emerald-500/20 p-3 rounded-xl cursor-grab hover:bg-emerald-500/20 transition-colors flex items-center gap-3 group">
                                <div className="bg-emerald-500 p-1.5 rounded-lg"><FileSpreadsheet className="w-4 h-4 text-white" /></div>
                                <span className="text-sm font-semibold text-emerald-100 group-hover:text-white">Excel Writer</span>
                            </div>
                            {/* Drag and Drop Google Sheets Node */}
                            <div draggable onDragStart={(e) => onDragStart(e, 'default', 'Google Sheets', '#10b981', 'google_sheets')} className="bg-emerald-500/10 border border-emerald-500/20 p-3 rounded-xl cursor-grab hover:bg-emerald-500/20 transition-colors flex items-center gap-3 group">
                                <div className="bg-emerald-500 p-1.5 rounded-lg"><Database className="w-4 h-4 text-white" /></div>
                                <span className="text-sm font-semibold text-emerald-100 group-hover:text-white">Google Sheets</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Main Canvas Area */}
                <div className="flex-1 relative bg-slate-950 flex flex-col">
                    <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="absolute top-4 left-4 z-30 bg-slate-800 border border-slate-700 p-2 rounded-lg text-slate-400 hover:text-white shadow-lg">
                        {isSidebarOpen ? <PanelLeftClose className="w-5 h-5" /> : <PanelLeftOpen className="w-5 h-5" />}
                    </button>

                    <div className="flex-1 relative" onDrop={onDrop} onDragOver={onDragOver}>
                        <ReactFlow
                            nodes={nodes}
                            edges={edges}
                            onNodesChange={onNodesChange}
                            onConnect={onConnect}
                            onInit={setReactFlowInstance}
                            onNodeClick={onNodeClick}
                            onPaneClick={() => { setSelectedNode(null); setIsSettingsOpen(false); }}
                            fitView
                        >
                            <Background color="#334155" gap={20} size={2} />
                            <Controls className="bg-slate-900 border-slate-700 fill-white" />
                        </ReactFlow>

                        {/* Floating Result Panel */}
                        {result && (
                            <div className="absolute bottom-6 left-1/2 -translate-x-1/2 w-full max-w-2xl bg-slate-900/95 backdrop-blur-md border border-slate-700 rounded-2xl p-6 shadow-2xl z-40 max-h-64 overflow-y-auto">
                                <div className="flex justify-between items-start mb-2">
                                    <h3 className="text-emerald-400 font-bold flex items-center gap-2"><Sparkles className="w-4 h-4" /> Execution Complete</h3>
                                    <button onClick={() => setResult(null)} className="text-slate-500 hover:text-white"><X className="w-5 h-5" /></button>
                                </div>
                                <div className="prose prose-invert max-w-none text-slate-300 text-sm mt-2">
                                    {typeof result.result === 'string' ? result.result : JSON.stringify(result.result, null, 2)}
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Right Sidebar - Node Settings */}
                {selectedNode && isSettingsOpen && (
                    <div className="w-80 bg-slate-900 border-l border-slate-800 flex flex-col z-20 shrink-0 shadow-2xl">
                        <div className="p-4 border-b border-slate-800 flex justify-between items-center bg-slate-800/50">
                            <h3 className="font-bold text-white flex items-center gap-2"><Settings className="w-4 h-4 text-indigo-400" /> Config</h3>
                            <button onClick={() => setIsSettingsOpen(false)} className="text-slate-400 hover:text-white"><X className="w-5 h-5" /></button>
                        </div>
                        <div className="p-5 flex-1 overflow-y-auto space-y-6">

                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Node Label</label>
                                <input type="text" value={selectedNode.data.label as string} onChange={(e) => updateNodeData('label', e.target.value)} className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-sm text-white focus:ring-2 focus:ring-indigo-500 outline-none" />
                            </div>

                            {selectedNode.data.backendType === 'input' && (
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Test Prompt</label>
                                    <textarea value={selectedNode.data.userPrompt as string || ''} onChange={(e) => updateNodeData('userPrompt', e.target.value)} className="w-full h-32 bg-slate-950 border border-slate-700 rounded-lg p-3 text-sm text-white focus:ring-2 focus:ring-indigo-500 outline-none resize-none" />
                                </div>
                            )}

                            {selectedNode.data.backendType === 'agent' && (
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">System Instructions</label>
                                    <textarea value={selectedNode.data.systemInstruction as string || ''} onChange={(e) => updateNodeData('systemInstruction', e.target.value)} className="w-full h-48 bg-slate-950 border border-slate-700 rounded-lg p-3 text-sm text-white focus:ring-2 focus:ring-indigo-500 outline-none resize-none" placeholder="You are a helpful assistant..." />
                                </div>
                            )}

                            {selectedNode.data.backendType === 'email' && (
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Receiver Email (Optional)</label>
                                    <input type="email" value={selectedNode.data.receiverEmail as string || ''} onChange={(e) => updateNodeData('receiverEmail', e.target.value)} className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-sm text-white focus:ring-2 focus:ring-indigo-500 outline-none" placeholder="Overrides default receiver" />
                                </div>
                            )}

                            {selectedNode.data.backendType === 'doc_writer' && (
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Filename</label>
                                    <input type="text" value={selectedNode.data.filename as string || ''} onChange={(e) => updateNodeData('filename', e.target.value)} className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-sm text-white focus:ring-2 focus:ring-indigo-500 outline-none" placeholder="report.docx" />
                                </div>

                            )}
                            {selectedNode.data.backendType === 'excel_writer' && (
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Filename</label>
                                    <input
                                        type="text"
                                        value={selectedNode.data.filename as string || ''}
                                        onChange={(e) => updateNodeData('filename', e.target.value)}
                                        className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-sm text-white focus:ring-2 focus:ring-indigo-500 outline-none"
                                        placeholder="reports.xlsx"
                                    />
                                    <p className="text-[10px] text-slate-500 mt-1">Make sure the LLM is instructed to output a Markdown table or CSV format.</p>
                                </div>
                            )}


                            {/* --- GOOGLE SHEETS NODE SETTINGS --- */}
                            {selectedNode.data.backendType === 'google_sheets' && (
                                <div className="space-y-4">
                                    <div className="p-4 border border-emerald-200 bg-emerald-50 rounded-lg">
                                        <h3 className="font-semibold text-emerald-800 text-sm mb-1">Account Connection</h3>

                                        {/* THIS IS THE CONDITIONAL PART */}
                                        {googleConnected ? (
                                            <div className="flex items-center gap-2 text-emerald-700 font-bold text-sm bg-white p-2 rounded border border-emerald-100">
                                                <span className="text-lg">✅</span> Google Account Linked
                                            </div>
                                        ) : (
                                            <>
                                                <p className="text-xs text-emerald-600 mb-3">
                                                    Connect your account to allow this bot to edit your spreadsheets.
                                                </p>
                                                <button
                                                    onClick={() => {
                                                        if (user) {
                                                            const returnTo = encodeURIComponent(window.location.href);
                                                            window.location.href = `http://localhost:8000/auth/google/login?user_id=${user.id}&return_to=${returnTo}`;
                                                        }
                                                    }}
                                                    className="w-full bg-white border border-gray-300 text-gray-700 font-medium text-sm px-4 py-2 rounded shadow-sm hover:bg-gray-50 flex items-center justify-center gap-2"
                                                >
                                                    <img src="https://www.google.com/favicon.ico" alt="Google" className="w-4 h-4" />
                                                    Sign in with Google
                                                </button>
                                            </>
                                        )}
                                    </div>

                                    {/* The standard inputs for the node */}
                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Spreadsheet ID</label>
                                        <input
                                            type="text"
                                            placeholder="e.g., 1BxiMVs0XRY..."
                                            className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-sm text-white focus:ring-2 focus:ring-indigo-500 outline-none"
                                            value={selectedNode.data.spreadsheetId || ''}
                                            onChange={(e) => updateNodeData('spreadsheetId', e.target.value)}
                                        />
                                        <p className="text-[10px] text-slate-500 mt-1">The long string of random characters in your Google Sheet URL.</p>
                                    </div>

                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Sheet Name</label>
                                        <input
                                            type="text"
                                            placeholder="e.g., Sheet1"
                                            className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-sm text-white focus:ring-2 focus:ring-indigo-500 outline-none"
                                            value={selectedNode.data.sheetName || 'Sheet1'}
                                            onChange={(e) => updateNodeData('sheetName', e.target.value)}
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Data to Append</label>
                                        <textarea
                                            rows={2}
                                            placeholder="{{current_data}}"
                                            className="w-full bg-slate-950 border border-slate-700 rounded-lg p-3 text-sm text-white focus:ring-2 focus:ring-indigo-500 outline-none resize-none"
                                            value={selectedNode.data.dataPayload || '{{current_data}}'}
                                            onChange={(e) => updateNodeData('dataPayload', e.target.value)}
                                        />
                                    </div>
                                </div>
                            )}


                            <div className="pt-4 border-t border-slate-800"><button onClick={handleDeleteNode} className="w-full flex items-center justify-center gap-2 py-2.5 bg-rose-500/10 text-rose-500 hover:bg-rose-500 hover:text-white rounded-lg transition-colors font-bold text-sm"><Trash2 className="w-4 h-4" /> Delete</button></div>
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
                        <button onClick={handleMagicBuild} disabled={isGenerating} className="w-full py-3 bg-purple-600 hover:bg-purple-500 text-white rounded-xl font-bold flex justify-center items-center gap-2">
                            {isGenerating ? <Loader2 className="w-5 h-5 animate-spin" /> : <Sparkles className="w-5 h-5" />} Generate Graph
                        </button>
                    </div>
                </div>
            )}

            {/* --- Save Workflow Modal --- */}
            {isSaveModalOpen && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-slate-900 border border-slate-700 rounded-2xl p-6 w-full max-w-lg shadow-2xl relative">
                        <button onClick={() => setIsSaveModalOpen(false)} className="absolute top-4 right-4 text-slate-500 hover:text-white"><X className="w-5 h-5" /></button>
                        <div className="flex gap-3 mb-4"><Save className="w-6 h-6 text-indigo-400" /><h2 className="text-xl font-bold text-white">{editingWorkflowId ? 'Update Workflow' : 'Save Workflow'}</h2></div>

                        <div className="space-y-4 mb-6">
                            <div>
                                <label className="block text-sm font-medium text-slate-400 mb-1">Workflow Name</label>
                                <input
                                    type="text"
                                    value={workflowName}
                                    onChange={(e) => setWorkflowName(e.target.value)}
                                    placeholder="e.g. Email Sender Agent"
                                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-indigo-500 outline-none"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-400 mb-1">Description (Optional)</label>
                                <textarea
                                    value={workflowDesc}
                                    onChange={(e) => setWorkflowDesc(e.target.value)}
                                    placeholder="What does this workflow do?"
                                    className="w-full h-24 bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-indigo-500 outline-none resize-none"
                                />
                            </div>
                        </div>

                        <button
                            onClick={handleSaveWorkflowToDB}
                            disabled={isSavingWorkflow || !workflowName}
                            className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl font-bold flex justify-center items-center gap-2"
                        >
                            {isSavingWorkflow ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />} {editingWorkflowId ? 'Update Workflow' : 'Save to Database'}
                        </button>
                    </div>
                </div>
            )}

        </div>
    );
};