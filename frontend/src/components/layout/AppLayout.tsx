import React from 'react';
import { Outlet, NavLink, useNavigate, Link } from 'react-router-dom';
import { Bot, LayoutDashboard, Settings, LogOut, Plus, Sparkles, MessageSquare } from 'lucide-react';
import { cn } from '../../lib/utils';
import { supabase } from '../../lib/supabase';

export const AppLayout = () => {
    const navigate = useNavigate();

    const handleSignOut = async () => {
        try {
            const { error } = await supabase.auth.signOut();
            if (error) throw error;
            navigate('/login');
        } catch (error) {
            console.error('Error signing out:', error);
        }
    };

    return (
        <div className="flex h-screen bg-slate-950 text-slate-50 overflow-hidden font-sans">
            {/* Sidebar */}
            <aside className="w-64 border-r border-slate-800/50 bg-slate-950/50 backdrop-blur-xl flex flex-col z-20">
                <div className="p-6 flex items-center gap-3">
                    <div className="p-2 bg-gradient-to-br from-indigo-500/20 to-purple-500/20 rounded-xl border border-indigo-500/20 shadow-lg shadow-indigo-500/5">
                        <Bot className="w-6 h-6 text-indigo-400" />
                    </div>
                    <div className="flex flex-col">
                        <span className="font-bold text-xl tracking-tight leading-none bg-gradient-to-r from-white to-slate-400 bg-clip-text text-transparent">BotCraft</span>
                        <span className="text-[10px] text-indigo-400/80 font-bold tracking-widest uppercase mt-1">Studio</span>
                    </div>
                </div>

                <div className="px-4 mb-8">
                    <Link
                        to="/create-bot"
                        className="group relative flex items-center justify-center gap-2 w-full bg-indigo-600 hover:bg-indigo-500 text-white py-3 rounded-xl font-semibold transition-all shadow-lg shadow-indigo-500/20 overflow-hidden"
                    >
                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:animate-[shimmer_1.5s_infinite] pointer-events-none" />
                        <Plus className="w-4 h-4" />
                        <span>Create Agent</span>
                    </Link>
                </div>

                <nav className="flex-1 px-3 space-y-1.5">
                    <div className="px-3 mb-2">
                        <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Main Menu</p>
                    </div>
                    <NavLink
                        to="/dashboard"
                        className={({ isActive }) => cn(
                            "group flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all relative",
                            isActive
                                ? "bg-indigo-500/5 text-indigo-400 border border-indigo-500/10 shadow-sm"
                                : "text-slate-400 hover:text-slate-200 hover:bg-slate-900/40"
                        )}
                    >
                        <LayoutDashboard className="w-4 h-4" />
                        Dashboard
                        {({ isActive }) => isActive && (
                            <div className="absolute left-[-12px] w-1 h-5 bg-indigo-500 rounded-r-full" />
                        )}
                    </NavLink>

                    <NavLink
                        to="/agent-builder"
                        className={({ isActive }) => cn(
                            "group flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all relative",
                            isActive
                                ? "bg-indigo-500/5 text-indigo-400 border border-indigo-500/10 shadow-sm"
                                : "text-slate-400 hover:text-slate-200 hover:bg-slate-900/40"
                        )}
                    >
                        <Sparkles className="w-4 h-4" />
                        Agent Builder
                        {({ isActive }) => isActive && (
                            <div className="absolute left-[-12px] w-1 h-5 bg-indigo-500 rounded-r-full" />
                        )}
                    </NavLink>

                    <div className="px-3 mt-6 mb-2">
                        <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Platform</p>
                    </div>
                    <NavLink
                        to="/settings"
                        className={({ isActive }) => cn(
                            "group flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all relative",
                            isActive
                                ? "bg-indigo-500/5 text-indigo-400 border border-indigo-500/10 shadow-sm"
                                : "text-slate-400 hover:text-slate-200 hover:bg-slate-900/40"
                        )}
                    >
                        <Settings className="w-4 h-4" />
                        Settings
                    </NavLink>
                </nav>

                <div className="p-4 border-t border-slate-800/50">
                    <button
                        onClick={handleSignOut}
                        className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-slate-400 hover:text-red-400 hover:bg-red-500/10 w-full transition-all"
                    >
                        <LogOut className="w-4 h-4" />
                        Sign Out
                    </button>
                </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1 overflow-auto bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-slate-900/20 via-slate-950 to-slate-950">
                <div className="h-full w-full">
                    <Outlet />
                </div>
            </main>
        </div>
    );
};