import React from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { Bot, LayoutDashboard, Settings, LogOut, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { supabase } from '@/lib/supabase';

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
        <div className="flex h-screen bg-slate-950 text-slate-50 overflow-hidden">
            {/* Sidebar */}
            <aside className="w-64 border-r border-slate-800 bg-slate-950 flex flex-col">
                <div className="p-6 flex items-center gap-3">
                    <div className="p-2 bg-indigo-500/10 rounded-lg border border-indigo-500/20">
                        <Bot className="w-6 h-6 text-indigo-400" />
                    </div>
                    <span className="font-bold text-xl tracking-tight">BotCraft</span>
                </div>

                <div className="px-4 mb-6">
                    <button className="w-full flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white py-2.5 rounded-lg transition-colors font-medium shadow-sm shadow-indigo-500/20">
                        <Plus className="w-4 h-4" />
                        <span>New Agent</span>
                    </button>
                </div>

                <nav className="flex-1 px-4 space-y-1">
                    <NavLink
                        to="/dashboard"
                        className={({ isActive }) => cn(
                            "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all",
                            isActive
                                ? "bg-slate-900 text-indigo-400 border border-slate-800"
                                : "text-slate-400 hover:text-slate-200 hover:bg-slate-900/50"
                        )}
                    >
                        <LayoutDashboard className="w-4 h-4" />
                        Dashboard
                    </NavLink>
                    <NavLink
                        to="/settings"
                        className={({ isActive }) => cn(
                            "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all",
                            isActive
                                ? "bg-slate-900 text-indigo-400 border border-slate-800"
                                : "text-slate-400 hover:text-slate-200 hover:bg-slate-900/50"
                        )}
                    >
                        <Settings className="w-4 h-4" />
                        Settings
                    </NavLink>
                </nav>

                <div className="p-4 border-t border-slate-800">
                    <button
                        onClick={handleSignOut}
                        className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-slate-400 hover:text-red-400 hover:bg-red-500/10 w-full transition-colors"
                    >
                        <LogOut className="w-4 h-4" />
                        Sign Out
                    </button>
                </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1 overflow-auto bg-slate-950">
                <div className="h-full w-full max-w-7xl mx-auto p-6 md:p-8">
                    <Outlet />
                </div>
            </main>
        </div>
    );
};
