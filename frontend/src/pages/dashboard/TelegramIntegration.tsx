import React, { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Send, CheckCircle, AlertCircle, Loader2, ArrowLeft } from 'lucide-react';
import { api } from '@/services/api';
import { useAuth } from '@/contexts/AuthContext';

export const TelegramIntegration = () => {
    const { botId } = useParams();
    const { session } = useAuth();
    
    const [token, setToken] = useState('');
    const [loading, setLoading] = useState(false);
    const [status, setStatus] = useState<{type: 'success'|'error', msg: string} | null>(null);

    const handleConnect = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!session?.access_token || !botId) return;

        setLoading(true);
        setStatus(null);

        try {
            await api.connectTelegram(botId, token, session.access_token);
            setStatus({ type: 'success', msg: 'Bot connected! Go to Telegram and start chatting.' });
        } catch (err: any) {
            setStatus({ type: 'error', msg: err.message || 'Connection failed' });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="max-w-2xl mx-auto space-y-8">
            <div className="flex items-center gap-4">
                <Link to="/dashboard" className="p-2 hover:bg-slate-800 rounded-lg text-slate-400 transition">
                    <ArrowLeft className="w-5 h-5" />
                </Link>
                <h1 className="text-3xl font-bold text-white">Connect Telegram</h1>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-xl p-8 space-y-6">
                <div className="space-y-4">
                    <h2 className="text-xl font-semibold text-white flex items-center gap-2">
                        <Send className="w-6 h-6 text-blue-400" />
                        Telegram Bot Setup
                    </h2>
                    
                    <ol className="list-decimal list-inside text-slate-400 space-y-2 ml-2">
                        <li>Open Telegram and search for <strong>@BotFather</strong>.</li>
                        <li>Send the command <code>/newbot</code>.</li>
                        <li>Name your bot and give it a username.</li>
                        <li>Copy the <strong>HTTP API Token</strong> provided.</li>
                    </ol>
                </div>

                <form onSubmit={handleConnect} className="space-y-6">
                    <div>
                        <label className="block text-sm font-medium text-slate-300 mb-2">
                            Paste Bot Token
                        </label>
                        <input 
                            type="text" 
                            value={token}
                            onChange={(e) => setToken(e.target.value)}
                            placeholder="123456:ABC-DEF1234ghIkl-zyx57W2v1u123ew11"
                            className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-3 text-white focus:ring-2 focus:ring-blue-500 outline-none"
                        />
                    </div>

                    {status && (
                        <div className={`p-4 rounded-lg flex items-center gap-3 ${
                            status.type === 'success' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'
                        }`}>
                            {status.type === 'success' ? <CheckCircle className="w-5 h-5"/> : <AlertCircle className="w-5 h-5"/>}
                            <p>{status.msg}</p>
                        </div>
                    )}

                    <button 
                        type="submit" 
                        disabled={loading || !token}
                        className="w-full bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white px-6 py-3 rounded-lg font-medium transition flex justify-center items-center gap-2"
                    >
                        {loading ? <Loader2 className="w-5 h-5 animate-spin"/> : 'Connect Telegram'}
                    </button>
                </form>
            </div>
        </div>
    );
};