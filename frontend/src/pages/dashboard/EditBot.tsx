import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, BrainCircuit, Database, Loader2, Upload, Link as LinkIcon, FileText } from 'lucide-react';
import { getWorkflows, linkWorkflowToBot } from '@/services/api'; 
import { supabase } from '@/lib/supabase';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

export const EditBot = () => {
    const { botId } = useParams();
    
    // --- State: Brain & Workflows ---
    const [workflows, setWorkflows] = useState<any[]>([]);
    const [selectedWorkflowId, setSelectedWorkflowId] = useState<string>("none");
    const [isSavingWorkflow, setIsSavingWorkflow] = useState(false);

    // --- State: Knowledge Base Update ---
    const [botName, setBotName] = useState("");
    const [files, setFiles] = useState<File[]>([]);
    const [csvFiles, setCsvFiles] = useState<File[]>([]);
    const [urls, setUrls] = useState("");
    const [clearHistory, setClearHistory] = useState(false);
    const [isUpdatingKb, setIsUpdatingKb] = useState(false);

    useEffect(() => {
        const fetchData = async () => {
            try {
                // Fetch Workflows for the dropdown
                const wfs = await getWorkflows();
                setWorkflows(wfs);
                
                // Fetch current Bot details
                const { data: { session } } = await supabase.auth.getSession();
                const token = session?.access_token;
                
                if (botId && token) {
                    const res = await fetch(`${API_URL}/bots/${botId}`, {
                        headers: { 'Authorization': `Bearer ${token}` }
                    });
                    if (res.ok) {
                        const botData = await res.json();
                        setBotName(botData.name || "");
                        setSelectedWorkflowId(botData.workflow_id || "none");
                    }
                }
            } catch (error) {
                console.error("Failed to load data:", error);
            }
        };
        fetchData();
    }, [botId]);

    // --- Handlers ---
    const handleLinkWorkflow = async () => {
        if (!botId) return;
        setIsSavingWorkflow(true);
        try {
            await linkWorkflowToBot(botId, selectedWorkflowId);
            alert("Brain connected successfully!");
        } catch (error) {
            console.error(error);
            alert("Failed to connect workflow.");
        } finally {
            setIsSavingWorkflow(false);
        }
    };

    const handleUpdateKnowledgeBase = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!botId) return;
        
        setIsUpdatingKb(true);
        try {
            const { data: { session } } = await supabase.auth.getSession();
            const token = session?.access_token;
            
            const formData = new FormData();
            if (botName) formData.append('name', botName);
            files.forEach(f => formData.append('files', f));
            csvFiles.forEach(f => formData.append('csvfiles', f));
            
            const urlArray = urls.split(',').map(u => u.trim()).filter(u => u);
            urlArray.forEach(u => formData.append('urls', u));
            
            formData.append('clear_history', clearHistory.toString());

            const res = await fetch(`${API_URL}/bots/${botId}`, {
                method: 'PATCH',
                headers: { 'Authorization': `Bearer ${token}` },
                body: formData
            });

            if (!res.ok) throw new Error("Failed to update bot");
            
            alert("Bot updated successfully! New sources are processing in the background.");
            setFiles([]);
            setCsvFiles([]);
            setUrls("");
            setClearHistory(false);
        } catch (error) {
            console.error(error);
            alert("Failed to update knowledge base.");
        } finally {
            setIsUpdatingKb(false);
        }
    };

    return (
        <div className="max-w-4xl mx-auto space-y-8 pb-12">
            {/* Header */}
            <div className="flex items-center gap-4">
                <Link to="/dashboard" className="p-2 hover:bg-slate-800 rounded-lg text-slate-400 transition-colors">
                    <ArrowLeft className="w-5 h-5" />
                </Link>
                <div>
                    <h1 className="text-3xl font-bold text-white">Bot Settings</h1>
                    <p className="text-slate-400">Configure your bot's brain and knowledge</p>
                </div>
            </div>

            <div className="grid grid-cols-1 gap-8">
                
                {/* --- THE BRAIN SETTINGS (AGENT WORKFLOW) --- */}
                <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-4 shadow-sm">
                    <div className="flex items-center gap-3 border-b border-slate-800 pb-4 mb-4">
                        <BrainCircuit className="w-6 h-6 text-indigo-400" />
                        <h2 className="text-xl font-semibold text-white">Agent Workflow (The Brain)</h2>
                    </div>
                    
                    <p className="text-sm text-slate-400">
                        Choose how this bot thinks. "Standard RAG" will answer questions from uploaded files. 
                        Selecting an Agent Workflow allows the bot to perform complex actions via LangGraph.
                    </p>

                    <div className="flex items-end gap-4 mt-4">
                        <div className="flex-1">
                            <label className="block text-sm font-medium text-slate-300 mb-2">Connect Agent Workflow</label>
                            <select 
                                value={selectedWorkflowId}
                                onChange={(e) => setSelectedWorkflowId(e.target.value)}
                                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-4 py-2.5 text-white focus:ring-2 focus:ring-indigo-500 outline-none appearance-none"
                            >
                                <option value="none">Standard RAG (Answer from Documents)</option>
                                {workflows.map(wf => (
                                    <option key={wf.id} value={wf.id}>
                                        {wf.name}
                                    </option>
                                ))}
                            </select>
                        </div>
                        
                        <button 
                            onClick={handleLinkWorkflow}
                            disabled={isSavingWorkflow}
                            className="flex items-center gap-2 px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 rounded-lg text-sm font-medium text-white transition-colors"
                        >
                            {isSavingWorkflow ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Apply Brain'}
                        </button>
                    </div>
                </div>

                {/* --- RAG KNOWLEDGE BASE UPLOADS --- */}
                <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-sm">
                    <div className="flex items-center gap-3 border-b border-slate-800 pb-4 mb-6">
                        <Database className="w-6 h-6 text-emerald-400" />
                        <h2 className="text-xl font-semibold text-white">Knowledge Base Updates</h2>
                    </div>
                    
                    <form onSubmit={handleUpdateKnowledgeBase} className="space-y-6">
                        <div>
                            <label className="block text-sm font-medium text-slate-300 mb-2">Bot Name</label>
                            <input 
                                type="text"
                                value={botName}
                                onChange={(e) => setBotName(e.target.value)}
                                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-4 py-2 text-white focus:border-emerald-500 outline-none"
                            />
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {/* PDFs */}
                            <div className="p-4 border border-slate-800 border-dashed rounded-lg bg-slate-950/50">
                                <label className="block text-sm font-medium text-slate-300 mb-2 flex items-center gap-2">
                                    <FileText className="w-4 h-4 text-rose-400" /> Upload PDFs
                                </label>
                                <input 
                                    type="file" 
                                    multiple 
                                    accept=".pdf"
                                    onChange={(e) => setFiles(Array.from(e.target.files || []))}
                                    className="text-sm text-slate-400 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-rose-500/10 file:text-rose-400 hover:file:bg-rose-500/20"
                                />
                            </div>

                            {/* CSVs */}
                            <div className="p-4 border border-slate-800 border-dashed rounded-lg bg-slate-950/50">
                                <label className="block text-sm font-medium text-slate-300 mb-2 flex items-center gap-2">
                                    <Database className="w-4 h-4 text-blue-400" /> Upload CSVs
                                </label>
                                <input 
                                    type="file" 
                                    multiple 
                                    accept=".csv"
                                    onChange={(e) => setCsvFiles(Array.from(e.target.files || []))}
                                    className="text-sm text-slate-400 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-500/10 file:text-blue-400 hover:file:bg-blue-500/20"
                                />
                            </div>
                        </div>

                        {/* URLs */}
                        <div>
                            <label className="block text-sm font-medium text-slate-300 mb-2 flex items-center gap-2">
                                <LinkIcon className="w-4 h-4 text-emerald-400" /> Scrape URLs (comma separated)
                            </label>
                            <textarea 
                                value={urls}
                                onChange={(e) => setUrls(e.target.value)}
                                placeholder="https://example.com, https://docs.example.com"
                                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-4 py-3 text-white focus:border-emerald-500 outline-none h-24 resize-none"
                            />
                        </div>

                        {/* Clear History Toggle */}
                        <div className="flex items-center gap-3 p-4 bg-red-500/10 border border-red-500/20 rounded-lg">
                            <input 
                                type="checkbox" 
                                id="clearHistory"
                                checked={clearHistory}
                                onChange={(e) => setClearHistory(e.target.checked)}
                                className="w-4 h-4 rounded border-slate-700 text-red-500 focus:ring-red-500 focus:ring-offset-slate-900 bg-slate-950"
                            />
                            <label htmlFor="clearHistory" className="text-sm font-medium text-red-400 cursor-pointer">
                                Clear existing knowledge base before uploading new files
                            </label>
                        </div>

                        <div className="pt-4 border-t border-slate-800 flex justify-end">
                            <button 
                                type="submit"
                                disabled={isUpdatingKb}
                                className="flex items-center gap-2 px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 rounded-lg text-sm font-medium text-white transition-colors"
                            >
                                {isUpdatingKb ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                                Update Knowledge Base
                            </button>
                        </div>
                    </form>
                </div>

            </div>
        </div>
    );
};