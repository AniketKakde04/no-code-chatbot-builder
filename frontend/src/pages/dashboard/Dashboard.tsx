import React from 'react';
import { Plus, MessageSquare, BarChart3, ArrowUpRight, Bot } from 'lucide-react';
import { Link } from 'react-router-dom';
import { cn } from '@/lib/utils';

export const Dashboard = () => {
    // Mock data
    const stats = [
        { label: 'Active Agents', value: '3', change: '+1', icon: MessageSquare, color: 'text-blue-400' },
        { label: 'Total Conversations', value: '1,234', change: '+12%', icon: BarChart3, color: 'text-purple-400' },
    ];

    const agents = [
        { id: 1, name: 'Support Bot V1', status: 'Active', conversations: 450, lastActive: '2 min ago' },
        { id: 2, name: 'Sales Associate', status: 'Training', conversations: 0, lastActive: '1 hr ago' },
        { id: 3, name: 'Internal HR', status: 'Active', conversations: 120, lastActive: '5 hr ago' },
    ];

    return (
        <div className="space-y-8">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-white mb-2">Dashboard</h1>
                    <p className="text-slate-400">Manage your AI agents and view performance</p>
                </div>
                <button className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded-lg font-medium transition-colors shadow-lg shadow-indigo-500/20">
                    <Plus className="w-4 h-4" />
                    Create New Agent
                </button>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {stats.map((stat, index) => (
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

            {/* Agents List */}
            <div>
                <h2 className="text-xl font-bold text-white mb-4">Your Agents</h2>
                <div className="rounded-xl border border-slate-800 bg-slate-900/50 overflow-hidden">
                    <table className="w-full text-left">
                        <thead className="bg-slate-900 text-slate-400 text-xs uppercase font-medium">
                            <tr>
                                <th className="px-6 py-4">Agent Name</th>
                                <th className="px-6 py-4">Status</th>
                                <th className="px-6 py-4">Conversations</th>
                                <th className="px-6 py-4">Last Active</th>
                                <th className="px-6 py-4 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800">
                            {agents.map((agent) => (
                                <tr key={agent.id} className="hover:bg-slate-900/80 transition-colors">
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-lg bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
                                                <Bot className="w-4 h-4" />
                                            </div>
                                            <span className="font-medium text-slate-200">{agent.name}</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className={cn(
                                            "inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border",
                                            agent.status === 'Active'
                                                ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                                                : "bg-amber-500/10 text-amber-400 border-amber-500/20"
                                        )}>
                                            {agent.status}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-slate-400">{agent.conversations}</td>
                                    <td className="px-6 py-4 text-slate-400">{agent.lastActive}</td>
                                    <td className="px-6 py-4 text-right">
                                        <Link to={`/agent/${agent.id}`} className="text-sm font-medium text-indigo-400 hover:text-indigo-300 inline-flex items-center gap-1">
                                            Manage <ArrowUpRight className="w-3 h-3" />
                                        </Link>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};
