import React, { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, Bot, User, Loader2, Sparkles } from 'lucide-react';
import { api } from '@/services/api';

interface Message {
    role: 'user' | 'bot';
    content: string;
}

export const PublicChat = () => {
    const { shareId } = useParams<{ shareId: string }>();
    const [messages, setMessages] = useState<Message[]>([]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [botName, setBotName] = useState('AI Assistant');
    const [notFound, setNotFound] = useState(false);
    const [initialLoading, setInitialLoading] = useState(true);

    const messagesEndRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLTextAreaElement>(null);

    useEffect(() => {
        if (!shareId) return;
        api.getPublicBot(shareId)
            .then(data => {
                setBotName(data.name);
                setInitialLoading(false);
            })
            .catch(() => {
                setNotFound(true);
                setInitialLoading(false);
            });
    }, [shareId]);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const handleSend = async () => {
        const trimmed = input.trim();
        if (!trimmed || isLoading || !shareId) return;

        setMessages(prev => [...prev, { role: 'user', content: trimmed }]);
        setInput('');
        setIsLoading(true);

        try {
            const data = await api.sendPublicMessage(shareId, trimmed);
            setMessages(prev => [...prev, { role: 'bot', content: data.answer || 'No response.' }]);
        } catch {
            setMessages(prev => [...prev, { role: 'bot', content: '⚠️ Something went wrong. Please try again.' }]);
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

    if (initialLoading) {
        return (
            <div className="flex items-center justify-center h-screen bg-slate-950">
                <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
            </div>
        );
    }

    if (notFound) {
        return (
            <div className="flex flex-col items-center justify-center h-screen bg-slate-950 text-center px-4">
                <div className="w-16 h-16 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-center mb-4">
                    <Bot className="w-8 h-8 text-slate-600" />
                </div>
                <h1 className="text-2xl font-bold text-white mb-2">Bot Not Found</h1>
                <p className="text-slate-400 max-w-sm">This bot doesn't exist or is no longer publicly available.</p>
            </div>
        );
    }

    return (
        <div className="flex flex-col h-screen bg-slate-950 font-sans">
            {/* Header */}
            <div className="h-16 border-b border-slate-800 flex items-center justify-center px-6 bg-slate-900/80 backdrop-blur-md shrink-0">
                <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/20">
                        <Bot className="w-5 h-5 text-white" />
                    </div>
                    <h1 className="text-base font-bold text-white">{botName}</h1>
                </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto px-4 py-6">
                <div className="max-w-3xl mx-auto space-y-6">
                    {messages.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-24 text-center">
                            <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-indigo-500/20 to-purple-500/20 border border-indigo-500/20 flex items-center justify-center mb-6">
                                <Sparkles className="w-10 h-10 text-indigo-400" />
                            </div>
                            <h2 className="text-2xl font-bold text-white mb-2">Chat with {botName}</h2>
                            <p className="text-slate-400 max-w-sm text-sm">Send a message to start the conversation.</p>
                        </div>
                    ) : (
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
                                    <div className={`max-w-[75%] rounded-2xl px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap ${msg.role === 'user'
                                            ? 'bg-indigo-600 text-white rounded-br-md'
                                            : 'bg-slate-800/80 text-slate-200 border border-slate-700/50 rounded-bl-md'
                                        }`}>
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

                    {isLoading && (
                        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex gap-3">
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

            {/* Input */}
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
                        {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                    </button>
                </div>
                <p className="text-center mt-3 text-xs text-slate-600">
                    Powered by <span className="text-indigo-400 font-semibold">BotCraft</span>
                </p>
            </div>
        </div>
    );
};
