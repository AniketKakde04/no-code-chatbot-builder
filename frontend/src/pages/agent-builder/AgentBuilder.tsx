import React, { useState, useCallback } from 'react';
import { ReactFlow, Background, Controls, MiniMap, addEdge, useNodesState, useEdgesState, Connection, Edge, Node } from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { ArrowLeft, Play, Plus, Search, FileText, Bot, Loader2 } from 'lucide-react';
import { Link } from 'react-router-dom';

const initialNodes: Node[] = [
    { id: '1', position: { x: 100, y: 100 }, data: { label: 'Resume Input (Start)' }, type: 'input' },
    { id: '2', position: { x: 300, y: 100 }, data: { label: 'Extract Skills' }, type: 'llm' },
];
const initialEdges: Edge[] = [{ id: 'e1-2', source: '1', target: '2' }];

export const AgentBuilder = () => {
    const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
    const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
    const [isRunning, setIsRunning] = useState(false);
    const [result, setResult] = useState<string | null>(null);

    const onConnect = useCallback(
        (params: Connection | Edge) => setEdges((eds) => addEdge(params, eds)),
        [setEdges],
    );

    const addNode = (type: string, label: string) => {
        const id = Math.random().toString(36).substr(2, 9);
        const newNode: Node = {
            id,
            position: { x: 400, y: 200 },
            data: { label },
            type: type === 'input' ? 'input' : 'default', // Fixed: 'input' triggers 'input' type
            // In a real app, we'd store the 'type' (llm, search) in data or use custom node components
            // For this MVP, we map them in the run function below based on label/type
        };
        // Hack for MVP: Store the 'real' type in a custom property we send to backend
        (newNode as any).backendType = type;

        setNodes((nds) => [...nds, newNode]);
    };

    const runAgent = async () => {
        setIsRunning(true);
        setResult(null);

        // 1. Convert ReactFlow nodes to Backend Format
        const backendNodes = nodes.map(n => ({
            id: n.id,
            type: (n as any).backendType || (n.type === 'input' ? 'input' : 'llm'), // Default to LLM if unknown
            data: n.data
        }));

        const backendEdges = edges.map(e => ({
            source: e.source,
            target: e.target
        }));

        try {
            const response = await fetch('http://localhost:8000/execute-workflow', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    nodes: backendNodes,
                    edges: backendEdges,
                    initial_input: "Sample Resume: Experience in Python, React, and LangGraph." // Hardcoded for demo
                })
            });

            const data = await response.json();
            setResult(typeof data.result === 'string' ? data.result : JSON.stringify(data.result, null, 2));
        } catch (error) {
            console.error(error);
            setResult("Error running workflow. Check console.");
        } finally {
            setIsRunning(false);
        }
    };

    return (
        <div className="h-screen w-screen bg-slate-950 flex flex-col">
            {/* Header */}
            <div className="h-16 border-b border-slate-800 bg-slate-900/50 flex items-center justify-between px-6 z-10">
                <div className="flex items-center gap-4">
                    <Link to="/dashboard" className="p-2 hover:bg-slate-800 rounded-lg text-slate-400 transition-colors">
                        <ArrowLeft className="w-5 h-5" />
                    </Link>
                    <div>
                        <h1 className="text-lg font-bold text-white">Internship Finder Workflow</h1>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={runAgent}
                        disabled={isRunning}
                        className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-500 rounded-lg shadow-lg shadow-emerald-500/20 disabled:opacity-50"
                    >
                        {isRunning ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
                        {isRunning ? 'Running...' : 'Run Agent'}
                    </button>
                </div>
            </div>

            <div className="flex flex-1 overflow-hidden">
                {/* Sidebar Palette */}
                <div className="w-64 bg-slate-900 border-r border-slate-800 p-4 flex flex-col gap-3">
                    <div className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Tools</div>
                    <button onClick={() => addNode('llm', 'AI Extraction')} className="flex items-center gap-3 p-3 bg-slate-800 hover:bg-slate-700 rounded-lg border border-slate-700 text-slate-300 transition-all text-sm font-medium text-left">
                        <Bot className="w-4 h-4 text-purple-400" /> AI Process
                    </button>
                    <button onClick={() => addNode('search', 'Web Search')} className="flex items-center gap-3 p-3 bg-slate-800 hover:bg-slate-700 rounded-lg border border-slate-700 text-slate-300 transition-all text-sm font-medium text-left">
                        <Search className="w-4 h-4 text-blue-400" /> Web Search
                    </button>
                    <button onClick={() => addNode('input', 'File Input')} className="flex items-center gap-3 p-3 bg-slate-800 hover:bg-slate-700 rounded-lg border border-slate-700 text-slate-300 transition-all text-sm font-medium text-left">
                        <FileText className="w-4 h-4 text-emerald-400" /> PDF Input
                    </button>
                </div>

                {/* Canvas */}
                <div className="flex-1 relative">
                    <ReactFlow
                        nodes={nodes}
                        edges={edges}
                        onNodesChange={onNodesChange}
                        onEdgesChange={onEdgesChange}
                        onConnect={onConnect}
                        colorMode="dark"
                        fitView
                    >
                        <Background color="#334155" gap={16} />
                        <Controls className="bg-slate-800 border-slate-700 fill-slate-300" />
                        <MiniMap className="bg-slate-900 border-slate-800" maskColor="rgba(30, 41, 59, 0.8)" nodeColor="#6366f1" />
                    </ReactFlow>

                    {/* Output Panel */}
                    {result && (
                        <div className="absolute bottom-4 left-4 right-4 bg-slate-900/90 backdrop-blur border border-slate-700 rounded-xl p-4 shadow-2xl max-h-60 overflow-y-auto">
                            <div className="text-xs font-bold text-emerald-400 uppercase mb-2">Agent Output</div>
                            <pre className="text-sm text-slate-300 whitespace-pre-wrap font-mono">{result}</pre>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};