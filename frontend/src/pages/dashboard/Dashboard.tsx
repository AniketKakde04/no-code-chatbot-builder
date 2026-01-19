import React, { useEffect, useState } from 'react';
import { Plus, MessageSquare, BarChart3, ArrowUpRight, Bot as BotIcon, Loader2, Trash2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { api, Bot } from '@/services/api';
import { useAuth } from '@/contexts/AuthContext';

import { Modal } from '@/components/ui/Modal';
import { Toast, ToastType } from '@/components/ui/Toast';

export const Dashboard = () => {
    const { session } = useAuth();
    const [bots, setBots] = useState<Bot[]>([]);
    const [stats, setStats] = useState({ total_bots: 0, total_messages: 0, total_conversations: 0 });
    const [loading, setLoading] = useState(true);

    // UI State
    const [deleteModal, setDeleteModal] = useState<{ isOpen: boolean; botId: string; botName: string; isLoading: boolean }>({
        isOpen: false, botId: '', botName: '', isLoading: false
    });
    const [toast, setToast] = useState<{ message: string; type: ToastType } | null>(null);

    useEffect(() => {
        if (session?.access_token) {
            loadData();
        }
    }, [session]);

    const loadData = async () => {
        try {
            const [botsData, statsData] = await Promise.all([
                api.getBots(session!.access_token),
                api.getStats(session!.access_token)
            ]);
            setBots(botsData);
            setStats(statsData);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const showToast = (message: string, type: ToastType) => {
        setToast({ message, type });
    };

    const handleDeleteClick = (botId: string, botName: string) => {
        setDeleteModal({ isOpen: true, botId, botName, isLoading: false });
    };

    const confirmDelete = async () => {
        if (!deleteModal.botId) return;

        setDeleteModal(prev => ({ ...prev, isLoading: true }));

        try {
            await api.deleteBot(deleteModal.botId, session!.access_token);

            // Remove from local state
            setBots(prev => prev.filter(b => b.id !== deleteModal.botId));
            showToast('Bot deleted successfully', 'success');
            setDeleteModal(prev => ({ ...prev, isOpen: false }));
        } catch (error) {
            console.error("Failed to delete bot:", error);
            showToast('Failed to delete bot. Please try again.', 'error');
            setDeleteModal(prev => ({ ...prev, isOpen: false })); // Close regardless on error? User might want to retry. Let's close for now.
        }
    };

    const statsCards = [
        { label: 'Active Agents', value: stats.total_bots.toString(), change: '+0', icon: MessageSquare, color: 'text-blue-400' },
        { label: 'Total Conversations', value: stats.total_conversations.toString(), change: '+0%', icon: BarChart3, color: 'text-purple-400' },
    ];

    return (
        <div className="space-y-8">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-white mb-2">Dashboard</h1>
                    <p className="text-slate-400">Manage your AI agents and view performance</p>
                </div>
                <Link to="/create-bot" className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded-lg font-medium transition-colors shadow-lg shadow-indigo-500/20">
                    <Plus className="w-4 h-4" />
                    Create New Agent
                </Link>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {statsCards.map((stat, index) => (
                    <div key={index} className="p-6 rounded-xl bg-slate-900 border border-slate-800 backdrop-blur-sm">
                        <div className="flex items-center justify-between mb-4">
                            <div className={`p-2 rounded-lg bg-slate-950 border border-slate-800 ${stat.color}`}>
                                <stat.icon className="w-5 h-5" />
                            </div>
                            <span className="text-xs font-medium text-emerald-400 bg-emerald-500/10 px-2 py-1 rounded-full">
                                {stat.change}
                            </span>
                        </div>
                        <h3 className="text-2xl font-bold text-white mb-1">{stat.value}</h3>
                        <p className="text-sm text-slate-400">{stat.label}</p>
                    </div>
                ))}
                <div className="p-6 rounded-xl bg-gradient-to-br from-indigo-500/10 to-purple-500/10 border border-indigo-500/20 flex flex-col justify-center items-center text-center">
                    <h3 className="text-lg font-semibold text-white mb-2">Upgrade to Pro</h3>
                    <p className="text-sm text-slate-400 mb-4">Get access to GPT-4o and unlimited vector storage.</p>
                    <button className="text-sm font-medium text-indigo-400 hover:text-indigo-300">View Plans &rarr;</button>
                </div>
            </div>

            <div className="bg-gradient-to-r from-indigo-900/50 to-purple-900/50 rounded-xl p-6 border border-indigo-500/30 flex items-center justify-between">
                <div>
                    <h2 className="text-xl font-bold text-white mb-2">AI Agent Workflows</h2>
                    <p className="text-slate-300 max-w-xl">
                        Build complex multi-step agents (e.g. Internship Finders) with our drag-and-drop editor.
                    </p>
                </div>
                <Link to="/agent-builder" className="flex items-center gap-2 bg-white text-indigo-900 px-6 py-3 rounded-lg font-bold hover:bg-indigo-50 transition-colors shadow-lg">
                    <BotIcon className="w-5 h-5" />
                    Launch Builder
                </Link>
            </div>




            {/* Agents List */}
            <div>
                <h2 className="text-xl font-bold text-white mb-4">Your Agents</h2>
                <div className="rounded-xl border border-slate-800 bg-slate-900/50 overflow-hidden">
                    <table className="w-full text-left">
                        <thead className="bg-slate-900 text-slate-400 text-xs uppercase font-medium">
                            <tr>
                                <th className="px-6 py-4">Agent Name</th>
                                <th className="px-6 py-4">Status</th>
                                <th className="px-6 py-4">Created At</th>
                                <th className="px-6 py-4 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800">
                            {loading ? (
                                <tr>
                                    <td colSpan={4} className="px-6 py-8 text-center text-slate-400">
                                        <div className="flex items-center justify-center gap-2">
                                            <Loader2 className="w-4 h-4 animate-spin" /> Loading your agents...
                                        </div>
                                    </td>
                                </tr>
                            ) : bots.length === 0 ? (
                                <tr>
                                    <td colSpan={4} className="px-6 py-8 text-center text-slate-400">
                                        No agents found. Create your first one above!
                                    </td>
                                </tr>
                            ) : (
                                bots.map((bot) => (
                                    <tr key={bot.id} className="hover:bg-slate-900/80 transition-colors">
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-lg bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
                                                    <BotIcon className="w-4 h-4" />
                                                </div>
                                                <span className="font-medium text-slate-200">{bot.name}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={cn(
                                                "inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border",
                                                bot.status === 'Active'
                                                    ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                                                    : "bg-amber-500/10 text-amber-400 border-amber-500/20"
                                            )}>
                                                {bot.status}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-slate-400">
                                            {new Date(bot.created_at).toLocaleDateString()}
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="flex items-center justify-end gap-3">
                                                <Link to={`/embed/${bot.id}`} className="text-sm font-medium text-indigo-400 hover:text-indigo-300 inline-flex items-center gap-1">
                                                    Embed <ArrowUpRight className="w-3 h-3" />
                                                </Link>
                                                <button
                                                    onClick={() => handleDeleteClick(bot.id, bot.name)}
                                                    className="text-slate-400 hover:text-red-400 transition-colors p-1"
                                                    title="Delete Bot"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                                <Link 
  to={`/bot/${bot.id}/telegram`}
  className="text-sm text-blue-400 hover:text-blue-300"
>
  Connect Telegram
</Link>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
            {/* UI Overlays */}
            <Modal
                isOpen={deleteModal.isOpen}
                onClose={() => setDeleteModal(prev => ({ ...prev, isOpen: false }))}
                onConfirm={confirmDelete}
                title="Delete Agent"
                message={`Are you sure you want to delete "${deleteModal.botName}"? This action cannot be undone and will remove all associated data and memory.`}
                confirmText="Delete Agent"
                type="danger"
                isLoading={deleteModal.isLoading}
            />
            {
                toast && (
                    <Toast
                        message={toast.message}
                        type={toast.type}
                        onClose={() => setToast(null)}
                    />
                )
            }
        </div >
    );
};
