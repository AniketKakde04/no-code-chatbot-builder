import React, { useState, useEffect, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
    ArrowLeft, Send, Bot, User, Trash2, Share2, Check, Copy, X,
    Loader2, Workflow, ChevronDown, Sparkles, MessageSquare
} from 'lucide-react';
import { api } from '@/services/api';

interface Message {
    id?: string;
    role: 'user' | 'bot';
    content: string;
    created_at?: string;
}

export const ChatPage = () => {
    const { botId } = useParams<{ botId: string }>();
    const [messages, setMessages] = useState<Message[]>([]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [isFetchingHistory, setIsFetchingHistory] = useState(true);
    const [botName, setBotName] = useState('AI Assistant');
    const [botWorkflowId, setBotWorkflowId] = useState<string | null>(null);

    // Workflow selector
    const [workflows, setWorkflows] = useState<any[]>([]);
    const [showWorkflowDropdown, setShowWorkflowDropdown] = useState(false);

    // Share modal
    const [showShareModal, setShowShareModal] = useState(false);
    const [shareLink, setShareLink] = useState('');
    const [isPublic, setIsPublic] = useState(false);
    const [isTogglingShare, setIsTogglingShare] = useState(false);
    const [copied, setCopied] = useState(false);

    const messagesEndRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLTextAreaElement>(null);

    // Load bot info, messages, and workflows on mount
    useEffect(() => {
        if (!botId) return;

        const loadAll = async () => {
            try {
                const [botData, msgs, wfs] = await Promise.all([
                    api.getBotDetails(botId),
                    api.getMessages(botId),
                    api.getWorkflows().catch(() => [])
                ]);
                setBotName(botData.name || 'AI Assistant');
                setBotWorkflowId(botData.workflow_id || null);
                setIsPublic(botData.is_public || false);
                setMessages(msgs || []);
                setWorkflows(wfs || []);

                // Build share link if already public
                if (botData.share_id && botData.is_public) {
                    setShareLink(`${window.location.origin}/s/${botData.share_id}`);
                }
            } catch (err) {
                console.error('Failed to load chat data:', err);
            } finally {
                setIsFetchingHistory(false);
            }
        };
        loadAll();
    }, [botId]);

    // Auto-scroll to bottom
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const handleSend = async () => {
        const trimmed = input.trim();
        if (!trimmed || isLoading || !botId) return;

        const userMsg: Message = { role: 'user', content: trimmed };
        setMessages(prev => [...prev, userMsg]);
        setInput('');
        setIsLoading(true);

        try {
            const data = await api.sendMessage(botId, trimmed);
            const botMsg: Message = { role: 'bot', content: data.answer || 'No response received.' };
            setMessages(prev => [...prev, botMsg]);
        } catch (err) {
            setMessages(prev => [...prev, { role: 'bot', content: '⚠️ Failed to get a response. Please try again.' }]);
        } finally {
            setIsLoading(false);
            inputRef.current?.focus();
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    const handleClearChat = async () => {
        if (!botId || !confirm('Clear all chat history for this bot?')) return;
        try {
            await api.clearMessages(botId);
            setMessages([]);
        } catch (err) {
            console.error('Failed to clear messages:', err);
        }
    };

    const handleToggleShare = async () => {
        if (!botId) return;
        setIsTogglingShare(true);
        try {
            const newPublic = !isPublic;
            const data = await api.toggleShare(botId, newPublic);
            setIsPublic(newPublic);
            if (newPublic && data.share_id) {
                const link = `${window.location.origin}/s/${data.share_id}`;
                setShareLink(link);
            } else {
                setShareLink('');
            }
        } catch (err) {
            console.error('Failed to toggle share:', err);
        } finally {
            setIsTogglingShare(false);
        }
    };

    const handleCopyLink = () => {
        navigator.clipboard.writeText(shareLink);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const handleSwitchWorkflow = async (workflowId: string) => {
        if (!botId) return;
        try {
            await api.linkWorkflowToBot(botId, workflowId);
            setBotWorkflowId(workflowId === 'none' ? null : workflowId);
        } catch (err) {
            console.error('Failed to switch workflow:', err);
        }
        setShowWorkflowDropdown(false);
    };

    const currentWorkflowName = botWorkflowId
        ? workflows.find(w => w.id === botWorkflowId)?.name || 'Agent Workflow'
        : 'Standard RAG';

    return (
        <div className="flex flex-col h-full bg-slate-950">
            {/* Header */}
            <div className="h-16 border-b border-slate-800 flex items-center justify-between px-6 bg-slate-900/80 backdrop-blur-md shrink-0 z-10">
                <div className="flex items-center gap-4">
                    <Link to="/dashboard" className="text-slate-400 hover:text-white transition-colors">
                        <ArrowLeft className="w-5 h-5" />
                    </Link>
                    <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/20">
                            <Bot className="w-5 h-5 text-white" />
                        </div>
                        <div>
                            <h1 className="text-base font-bold text-white leading-tight">{botName}</h1>
                            <p className="text-xs text-slate-500">{currentWorkflowName}</p>
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    {/* Workflow Selector */}
                    <div className="relative">
                        <button
                            onClick={() => setShowWorkflowDropdown(!showWorkflowDropdown)}
                            className="flex items-center gap-2 px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-xs font-semibold text-slate-300 hover:bg-slate-700 transition-all"
                        >
                            <Workflow className="w-3.5 h-3.5 text-indigo-400" />
                            Brain
                            <ChevronDown className="w-3 h-3" />
                        </button>
                        {showWorkflowDropdown && (
                            <div className="absolute right-0 top-full mt-2 w-64 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl z-50 overflow-hidden">
                                <div className="p-2">
                                    <button
                                        onClick={() => handleSwitchWorkflow('none')}
                                        className={`w-full text-left px-3 py-2.5 rounded-lg text-sm transition-colors ${!botWorkflowId ? 'bg-indigo-500/10 text-indigo-400' : 'text-slate-300 hover:bg-slate-800'}`}
                                    >
                                        Standard RAG
                                    </button>
                                    {workflows.map(wf => (
                                        <button
                                            key={wf.id}
                                            onClick={() => handleSwitchWorkflow(wf.id)}
                                            className={`w-full text-left px-3 py-2.5 rounded-lg text-sm transition-colors ${botWorkflowId === wf.id ? 'bg-indigo-500/10 text-indigo-400' : 'text-slate-300 hover:bg-slate-800'}`}
                                        >
                                            {wf.name}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Share */}
                    <button
                        onClick={() => setShowShareModal(true)}
                        className="flex items-center gap-2 px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-xs font-semibold text-slate-300 hover:bg-slate-700 transition-all"
                    >
                        <Share2 className="w-3.5 h-3.5 text-emerald-400" />
                        Share
                    </button>

                    {/* Clear Chat */}
                    <button
                        onClick={handleClearChat}
                        className="p-2 bg-slate-800 border border-slate-700 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 hover:border-rose-500/30 transition-all"
                        title="Clear chat history"
                    >
                        <Trash2 className="w-4 h-4" />
                    </button>
                </div>
            </div>

            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto px-4 py-6">
                <div className="max-w-3xl mx-auto space-y-6">
                    {isFetchingHistory ? (
                        <div className="flex items-center justify-center py-20">
                            <Loader2 className="w-6 h-6 text-indigo-500 animate-spin" />
                        </div>
                    ) : messages.length === 0 ? (
                        /* Empty State */
                        <div className="flex flex-col items-center justify-center py-24 text-center">
                            <div className="relative mb-6">
                                <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-indigo-500/20 to-purple-500/20 border border-indigo-500/20 flex items-center justify-center">
                                    <Sparkles className="w-10 h-10 text-indigo-400" />
                                </div>
                            </div>
                            <h2 className="text-2xl font-bold text-white mb-2">Start a conversation</h2>
                            <p className="text-slate-400 max-w-sm text-sm mb-8">
                                Ask {botName} anything. It will respond using {botWorkflowId ? 'its connected agent workflow' : 'its trained knowledge base'}.
                            </p>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full max-w-md">
                                {['What can you help me with?', 'Summarize your capabilities', 'Tell me about yourself', 'How do you work?'].map((suggestion, i) => (
                                    <button
                                        key={i}
                                        onClick={() => { setInput(suggestion); inputRef.current?.focus(); }}
                                        className="text-left px-4 py-3 bg-slate-900/60 border border-slate-800 rounded-xl text-sm text-slate-400 hover:text-white hover:border-indigo-500/30 hover:bg-slate-800/80 transition-all"
                                    >
                                        {suggestion}
                                    </button>
                                ))}
                            </div>
                        </div>
                    ) : (
                        /* Message Bubbles */
                        <AnimatePresence initial={false}>
                            {messages.map((msg, i) => (
                                <motion.div
                                    key={i}
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ duration: 0.2 }}
                                    className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                                >
                                    {msg.role === 'bot' && (
                                        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center flex-shrink-0 mt-1 shadow-md">
                                            <Bot className="w-4 h-4 text-white" />
                                        </div>
                                    )}
                                    <div
                                        className={`max-w-[75%] rounded-2xl px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap ${msg.role === 'user'
                                                ? 'bg-indigo-600 text-white rounded-br-md'
                                                : 'bg-slate-800/80 text-slate-200 border border-slate-700/50 rounded-bl-md'
                                            }`}
                                    >
                                        {msg.content}
                                    </div>
                                    {msg.role === 'user' && (
                                        <div className="w-8 h-8 rounded-lg bg-slate-700 flex items-center justify-center flex-shrink-0 mt-1">
                                            <User className="w-4 h-4 text-slate-300" />
                                        </div>
                                    )}
                                </motion.div>
                            ))}
                        </AnimatePresence>
                    )}

                    {/* Typing Indicator */}
                    {isLoading && (
                        <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="flex gap-3"
                        >
                            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center flex-shrink-0 mt-1 shadow-md">
                                <Bot className="w-4 h-4 text-white" />
                            </div>
                            <div className="bg-slate-800/80 border border-slate-700/50 rounded-2xl rounded-bl-md px-5 py-4">
                                <div className="flex gap-1.5">
                                    <div className="w-2 h-2 rounded-full bg-slate-400 animate-bounce" style={{ animationDelay: '0ms' }} />
                                    <div className="w-2 h-2 rounded-full bg-slate-400 animate-bounce" style={{ animationDelay: '150ms' }} />
                                    <div className="w-2 h-2 rounded-full bg-slate-400 animate-bounce" style={{ animationDelay: '300ms' }} />
                                </div>
                            </div>
                        </motion.div>
                    )}
                    <div ref={messagesEndRef} />
                </div>
            </div>

            {/* Input Bar */}
            <div className="border-t border-slate-800 bg-slate-900/80 backdrop-blur-md px-4 py-4 shrink-0">
                <div className="max-w-3xl mx-auto flex gap-3 items-end">
                    <textarea
                        ref={inputRef}
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder="Type your message..."
                        rows={1}
                        className="flex-1 bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-sm text-white placeholder-slate-500 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none resize-none min-h-[44px] max-h-[120px]"
                        style={{ height: 'auto', overflow: 'hidden' }}
                        onInput={(e) => {
                            const target = e.target as HTMLTextAreaElement;
                            target.style.height = 'auto';
                            target.style.height = Math.min(target.scrollHeight, 120) + 'px';
                        }}
                    />
                    <button
                        onClick={handleSend}
                        disabled={!input.trim() || isLoading}
                        className="h-[44px] px-5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-xl font-semibold transition-all flex items-center gap-2 shadow-lg shadow-indigo-500/20"
                    >
                        {isLoading ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                            <Send className="w-4 h-4" />
                        )}
                    </button>
                </div>
            </div>

            {/* Share Modal */}
            <AnimatePresence>
                {showShareModal && (
                    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            className="bg-slate-900 border border-slate-700 rounded-2xl p-6 w-full max-w-md shadow-2xl relative"
                        >
                            <button onClick={() => setShowShareModal(false)} className="absolute top-4 right-4 text-slate-500 hover:text-white">
                                <X className="w-5 h-5" />
                            </button>

                            <div className="flex items-center gap-3 mb-5">
                                <div className="p-2.5 bg-emerald-500/10 rounded-xl">
                                    <Share2 className="w-5 h-5 text-emerald-400" />
                                </div>
                                <h2 className="text-xl font-bold text-white">Share Bot</h2>
                            </div>

                            <p className="text-sm text-slate-400 mb-5">
                                Anyone with the link can chat with this bot without logging in.
                            </p>

                            {/* Toggle */}
                            <div className="flex items-center justify-between p-4 bg-slate-800/50 border border-slate-700/50 rounded-xl mb-5">
                                <span className="text-sm font-medium text-slate-200">Public access</span>
                                <button
                                    onClick={handleToggleShare}
                                    disabled={isTogglingShare}
                                    className={`w-12 h-7 rounded-full transition-all flex items-center px-1 ${isPublic ? 'bg-emerald-500' : 'bg-slate-700'}`}
                                >
                                    <div className={`w-5 h-5 rounded-full bg-white shadow transition-transform ${isPublic ? 'translate-x-5' : 'translate-x-0'}`} />
                                </button>
                            </div>

                            {/* Share Link */}
                            {isPublic && shareLink && (
                                <div className="flex gap-2">
                                    <input
                                        type="text"
                                        readOnly
                                        value={shareLink}
                                        className="flex-1 bg-slate-950 border border-slate-700 rounded-lg px-3 py-2.5 text-sm text-slate-300 outline-none"
                                    />
                                    <button
                                        onClick={handleCopyLink}
                                        className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg font-semibold text-sm flex items-center gap-2 transition-all"
                                    >
                                        {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                                        {copied ? 'Copied!' : 'Copy'}
                                    </button>
                                </div>
                            )}
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
};
