import React, { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { CheckCircle, AlertCircle, Loader2, ArrowLeft, ExternalLink } from 'lucide-react';
import { api } from '@/services/api';

export const WhatsAppIntegration = () => {
    const { botId } = useParams();

    const [phoneId, setPhoneId] = useState('');
    const [accessToken, setAccessToken] = useState('');
    const [loading, setLoading] = useState(false);
    const [status, setStatus] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);

    const handleConnect = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!botId) return;

        setLoading(true);
        setStatus(null);

        try {
            await api.connectWhatsApp(botId, phoneId, accessToken);
            setStatus({
                type: 'success',
                msg: 'WhatsApp credentials saved! Now configure the webhook URL in your Meta dashboard.'
            });
        } catch (err: any) {
            setStatus({ type: 'error', msg: err.message || 'Connection failed' });
        } finally {
            setLoading(false);
        }
    };

    const webhookUrl = `${window.location.origin.replace('5173', '8000')}/whatsapp-webhook`;

    return (
        <div className="max-w-2xl mx-auto space-y-8 p-6">
            <div className="flex items-center gap-4">
                <Link to="/dashboard" className="p-2 hover:bg-slate-800 rounded-lg text-slate-400 transition">
                    <ArrowLeft className="w-5 h-5" />
                </Link>
                <div>
                    <h1 className="text-3xl font-bold text-white">Connect WhatsApp</h1>
                    <p className="text-slate-400">Link your bot to WhatsApp Business API</p>
                </div>
            </div>

            {/* Setup Instructions */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-8 space-y-6">
                <div className="space-y-4">
                    <h2 className="text-xl font-semibold text-white flex items-center gap-2">
                        <span className="text-2xl">💬</span>
                        WhatsApp Business Setup
                    </h2>

                    <ol className="list-decimal list-inside text-slate-400 space-y-3 ml-2 text-sm leading-relaxed">
                        <li>
                            Go to{' '}
                            <a href="https://developers.facebook.com" target="_blank" rel="noreferrer"
                                className="text-indigo-400 hover:text-indigo-300 underline inline-flex items-center gap-1">
                                Meta for Developers <ExternalLink className="w-3 h-3" />
                            </a>{' '}
                            and create a Business app.
                        </li>
                        <li>Add the <strong className="text-slate-200">WhatsApp</strong> product to your app.</li>
                        <li>
                            <div className="bg-indigo-500/10 border border-indigo-500/20 rounded-lg p-3 my-2 text-indigo-300 text-xs">
                                <strong>Tip: Use your own number?</strong><br />
                                By default, Meta gives you a "Test Number". To use your own:<br />
                                1. Go to <strong>WhatsApp &gt; API Setup</strong><br />
                                2. Scroll to <strong>Step 5: Add Phone Number</strong><br />
                                3. Follow the steps to verify your real number via SMS.<br />
                                4. Use the <strong>Phone Number ID</strong> of your real number below.
                            </div>
                        </li>
                        <li>Copy your <strong className="text-slate-200">Phone Number ID</strong> and <strong className="text-slate-200">Permanent Access Token</strong>.</li>
                        <li>Paste them below and click <strong className="text-slate-200">Connect</strong>.</li>
                        <li>Then configure your webhook in Meta dashboard (next step).</li>
                    </ol>
                </div>

                <form onSubmit={handleConnect} className="space-y-5">
                    <div>
                        <label className="block text-sm font-semibold text-slate-300 mb-2">Phone Number ID</label>
                        <input
                            type="text"
                            value={phoneId}
                            onChange={(e) => setPhoneId(e.target.value)}
                            placeholder="e.g. 123456789012345"
                            className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white placeholder-slate-600 focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none text-sm"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-semibold text-slate-300 mb-2">Permanent Access Token</label>
                        <input
                            type="password"
                            value={accessToken}
                            onChange={(e) => setAccessToken(e.target.value)}
                            placeholder="EAAxxxxxxx..."
                            className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white placeholder-slate-600 focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none text-sm"
                        />
                    </div>

                    {status && (
                        <div className={`p-4 rounded-xl flex items-start gap-3 ${status.type === 'success' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-red-500/10 text-red-400 border border-red-500/20'
                            }`}>
                            {status.type === 'success' ? <CheckCircle className="w-5 h-5 mt-0.5 shrink-0" /> : <AlertCircle className="w-5 h-5 mt-0.5 shrink-0" />}
                            <p className="text-sm">{status.msg}</p>
                        </div>
                    )}

                    <button
                        type="submit"
                        disabled={loading || !phoneId || !accessToken}
                        className="w-full bg-green-600 hover:bg-green-500 disabled:opacity-50 disabled:cursor-not-allowed text-white px-6 py-3 rounded-xl font-semibold transition-all flex justify-center items-center gap-2 shadow-lg shadow-green-500/20"
                    >
                        {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : '💬 Connect WhatsApp'}
                    </button>
                </form>
            </div>

            {/* Webhook Configuration */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-8 space-y-5">
                <h2 className="text-lg font-bold text-white flex items-center gap-2">
                    🔗 Step 2: Configure Webhook
                </h2>
                <p className="text-sm text-slate-400">
                    After saving your credentials above, go to your Meta app's WhatsApp Configuration and set:
                </p>

                <div className="space-y-4">
                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Callback URL</label>
                        <div className="bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 font-mono text-sm text-green-400 break-all">
                            {webhookUrl}
                        </div>
                        <p className="text-xs text-slate-600 mt-1">⚠️ Must be a public HTTPS URL (use ngrok for development)</p>
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Verify Token</label>
                        <div className="bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 font-mono text-sm text-green-400">
                            (The value of WHATSAPP_VERIFY_TOKEN in your backend .env)
                        </div>
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Webhook Fields</label>
                        <div className="bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm text-slate-300">
                            Subscribe to: <code className="bg-slate-800 px-2 py-0.5 rounded text-xs text-green-400">messages</code>
                        </div>
                    </div>
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
