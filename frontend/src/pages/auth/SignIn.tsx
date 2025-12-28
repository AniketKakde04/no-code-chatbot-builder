import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Mail, Lock, Loader2, ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';

export const SignIn = () => {
    const navigate = useNavigate();
    const [isLoading, setIsLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        // Simulate API call
        setTimeout(() => {
            setIsLoading(false);
            navigate('/dashboard');
        }, 1500);
    };

    return (
        <div className="w-full">
            <div className="mb-8">
                <h2 className="text-3xl font-bold tracking-tight text-white mb-2">Welcome back</h2>
                <p className="text-slate-400">Enter your credentials to access your agents</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
                <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-300" htmlFor="email">Email</label>
                    <div className="relative">
                        <Mail className="absolute left-3 top-2.5 h-5 w-5 text-slate-500" />
                        <input
                            id="email"
                            type="email"
                            placeholder="name@example.com"
                            className="flex h-10 w-full rounded-md border border-slate-800 bg-slate-900 px-3 pl-10 py-2 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                            required
                        />
                    </div>
                </div>

                <div className="space-y-2">
                    <div className="flex items-center justify-between">
                        <label className="text-sm font-medium text-slate-300" htmlFor="password">Password</label>
                        <Link to="#" className="text-sm text-indigo-400 hover:text-indigo-300">Forgot password?</Link>
                    </div>
                    <div className="relative">
                        <Lock className="absolute left-3 top-2.5 h-5 w-5 text-slate-500" />
                        <input
                            id="password"
                            type="password"
                            placeholder="••••••••"
                            className="flex h-10 w-full rounded-md border border-slate-800 bg-slate-900 px-3 pl-10 py-2 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                            required
                        />
                    </div>
                </div>

                <button
                    type="submit"
                    disabled={isLoading}
                    className={cn(
                        "w-full flex items-center justify-center gap-2 rounded-md bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 transition-all",
                        isLoading && "opacity-50 cursor-not-allowed"
                    )}
                >
                    {isLoading ? <Loader2 className="animate-spin h-5 w-5" /> : "Sign In"}
                    {!isLoading && <ArrowRight className="h-4 w-4" />}
                </button>
            </form>

            <div className="mt-6 text-center text-sm">
                <p className="text-slate-400">
                    Don't have an account?{' '}
                    <Link to="/signup" className="font-semibold text-indigo-400 hover:text-indigo-300">
                        Create one
                    </Link>
                </p>
            </div>
        </div>
    );
};
