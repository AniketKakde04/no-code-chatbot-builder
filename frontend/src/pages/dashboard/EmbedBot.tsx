import React, { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Copy, Check, ArrowLeft, Code } from 'lucide-react';

export const EmbedBot = () => {
    const { botId } = useParams();
    const [copied, setCopied] = useState(false);

    // In a real app, we might fetch bot details here.
    // For now, we assume if we have an ID, it's valid.

    const scriptCode = `<script 
  src="${window.location.origin}/chat-widget.js" 
  data-bot-id="${botId || 'your-bot-id'}">
</script>`;

    const handleCopy = () => {
        navigator.clipboard.writeText(scriptCode);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <div className="max-w-3xl mx-auto space-y-8">
            <div className="flex items-center gap-4">
                <Link to="/dashboard" className="p-2 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white transition-colors">
                    <ArrowLeft className="w-5 h-5" />
                </Link>
                <div>
                    <h1 className="text-3xl font-bold text-white">Embed Your Chatbot</h1>
                    <p className="text-slate-400">Add this agent to your website in seconds</p>
                </div>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 md:p-8 space-y-6">
                <div className="flex items-center gap-4 p-4 bg-indigo-500/10 border border-indigo-500/20 rounded-lg text-indigo-300">
                    <Code className="w-6 h-6 shrink-0" />
                    <p>Simply copy the code below and paste it before the closing <code>&lt;/body&gt;</code> tag of your website.</p>
                </div>

                <div className="relative group">
                    <pre className="bg-slate-950 border border-slate-800 rounded-xl p-6 overflow-x-auto text-sm font-mono text-slate-300 transition-colors group-hover:border-slate-700">
                        {scriptCode}
                    </pre>
                    <button
                        onClick={handleCopy}
                        className="absolute top-4 right-4 p-2 bg-slate-800 hover:bg-slate-700 rounded-lg text-slate-300 hover:text-white transition-all shadow-lg border border-slate-700"
                    >
                        {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                    </button>
                </div>
            </div>

            <div className="text-center">
                <Link to="/dashboard" className="text-indigo-400 hover:text-indigo-300 text-sm font-medium">
                    Return to Dashboard
                </Link>
            </div>
        </div>
    );
};
