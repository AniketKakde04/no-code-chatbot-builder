import React from 'react';
import { Outlet } from 'react-router-dom';
import { Bot, Sparkles } from 'lucide-react';

export const AuthLayout = () => {
    return (
        <div className="flex h-screen w-full bg-slate-950 text-slate-50">
            {/* Left Side - Branding */}
            <div className="hidden lg:flex w-1/2 flex-col justify-center items-center bg-slate-900 border-r border-slate-800 relative overflow-hidden">
                <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1635070041078-e363dbe005cb?q=80&w=2070&auto=format&fit=crop')] bg-cover bg-center opacity-10"></div>
                <div className="relative z-10 flex flex-col items-center">
                    <div className="p-4 bg-indigo-500/10 rounded-2xl border border-indigo-500/20 mb-6 backdrop-blur-sm">
                        <Bot className="w-16 h-16 text-indigo-400" />
                    </div>
                    <h1 className="text-4xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-indigo-400 to-purple-400 mb-2">
                        BotCraft AI
                    </h1>
                    <p className="text-slate-400 text-lg max-w-md text-center">
                        Build, train, and deploy intelligent custom AI agents in minutes. No coding required.
                    </p>
                </div>

                {/* Decorative elements */}
                <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-indigo-600/20 rounded-full blur-3xl"></div>
                <div className="absolute bottom-1/4 right-1/4 w-64 h-64 bg-purple-600/20 rounded-full blur-3xl"></div>
            </div>

            {/* Right Side - Form */}
            <div className="flex-1 flex flex-col justify-center items-center p-8 bg-slate-950 relative">
                <div className="w-full max-w-md">
                    <Outlet />
                </div>
                <div className="absolute bottom-6 text-slate-600 text-sm">
                    &copy; 2025 BotCraft AI. All rights reserved.
                </div>
            </div>
        </div>
    );
};
