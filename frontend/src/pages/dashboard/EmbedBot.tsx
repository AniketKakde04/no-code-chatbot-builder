import React, { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Copy, Check, ArrowLeft, Code, Palette, Globe } from 'lucide-react';

export const EmbedBot = () => {
    const { botId } = useParams();
    const [copied, setCopied] = useState(false);
    const [theme, setTheme] = useState<'dark' | 'light'>('dark');
    const [accent, setAccent] = useState('#6366f1');

    const scriptCode = `<script 
  src="${window.location.origin}/chat-widget.js" 
  data-bot-id="${botId || 'your-bot-id'}"
  data-theme="${theme}"
  data-accent="${accent}"
  data-title="AI Assistant">
</script>`;

    const handleCopy = () => {
        navigator.clipboard.writeText(scriptCode);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const accentColors = [
        { label: 'Indigo', value: '#6366f1' },
        { label: 'Violet', value: '#8b5cf6' },
        { label: 'Blue', value: '#3b82f6' },
        { label: 'Cyan', value: '#06b6d4' },
        { label: 'Emerald', value: '#10b981' },
        { label: 'Rose', value: '#f43f5e' },
        { label: 'Amber', value: '#f59e0b' },
        { label: 'Orange', value: '#f97316' },
    ];

    return (
        <div className="max-w-3xl mx-auto space-y-8 p-6">
            <div className="flex items-center gap-4">
                <Link to="/dashboard" className="p-2 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white transition-colors">
                    <ArrowLeft className="w-5 h-5" />
                </Link>
                <div>
                    <h1 className="text-3xl font-bold text-white">Embed Your Chatbot</h1>
                    <p className="text-slate-400">Customize and add this agent to your website</p>
                </div>
            </div>

            {/* Customization Panel */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-6">
                <div className="flex items-center gap-3 mb-2">
                    <Palette className="w-5 h-5 text-indigo-400" />
                    <h2 className="text-lg font-bold text-white">Customize Widget</h2>
                </div>

                {/* Theme Toggle */}
                <div>
                    <label className="text-sm font-semibold text-slate-300 mb-3 block">Theme</label>
                    <div className="flex gap-3">
                        <button
                            onClick={() => setTheme('dark')}
                            className={`flex-1 py-3 rounded-xl border text-sm font-semibold transition-all ${theme === 'dark'
                                    ? 'bg-slate-800 border-indigo-500 text-white shadow-lg shadow-indigo-500/10'
                                    : 'bg-slate-950 border-slate-700 text-slate-400 hover:border-slate-600'
                                }`}
                        >
                            🌙 Dark
                        </button>
                        <button
                            onClick={() => setTheme('light')}
                            className={`flex-1 py-3 rounded-xl border text-sm font-semibold transition-all ${theme === 'light'
                                    ? 'bg-slate-800 border-indigo-500 text-white shadow-lg shadow-indigo-500/10'
                                    : 'bg-slate-950 border-slate-700 text-slate-400 hover:border-slate-600'
                                }`}
                        >
                            ☀️ Light
                        </button>
                    </div>
                </div>

                {/* Accent Color */}
                <div>
                    <label className="text-sm font-semibold text-slate-300 mb-3 block">Accent Color</label>
                    <div className="flex gap-3 flex-wrap">
                        {accentColors.map(c => (
                            <button
                                key={c.value}
                                onClick={() => setAccent(c.value)}
                                title={c.label}
                                className={`w-10 h-10 rounded-xl border-2 transition-all hover:scale-110 ${accent === c.value
                                        ? 'border-white scale-110 shadow-lg'
                                        : 'border-transparent'
                                    }`}
                                style={{ backgroundColor: c.value }}
                            />
                        ))}
                    </div>
                </div>
            </div>

            {/* Code Block */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 md:p-8 space-y-6">
                <div className="flex items-center gap-4 p-4 bg-indigo-500/10 border border-indigo-500/20 rounded-xl text-indigo-300">
                    <Code className="w-6 h-6 shrink-0" />
                    <p className="text-sm">Copy and paste this before the closing <code className="bg-slate-800 px-2 py-0.5 rounded text-xs">&lt;/body&gt;</code> tag of your website.</p>
                </div>

                <div className="relative group">
                    <pre className="bg-slate-950 border border-slate-800 rounded-xl p-6 overflow-x-auto text-sm font-mono text-slate-300 transition-colors group-hover:border-slate-700">
                        {scriptCode}
                    </pre>
                    <button
                        onClick={handleCopy}
                        className="absolute top-4 right-4 px-4 py-2 bg-slate-800 hover:bg-slate-700 rounded-lg text-slate-300 hover:text-white transition-all shadow-lg border border-slate-700 flex items-center gap-2 text-xs font-semibold"
                    >
                        {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                        {copied ? 'Copied!' : 'Copy'}
                    </button>
                </div>
            </div>

            {/* Preview Hint */}
            <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-5 flex items-center gap-4">
                <Globe className="w-5 h-5 text-slate-500 shrink-0" />
                <p className="text-sm text-slate-400">
                    The widget will appear as a floating chat button on the bottom-right of your website. Visitors can click it to start chatting with your bot.
                </p>
            </div>

            <div className="text-center">
                <Link to="/dashboard" className="text-indigo-400 hover:text-indigo-300 text-sm font-medium">
                    Return to Dashboard
                </Link>
            </div>
        </div>
    );
};
