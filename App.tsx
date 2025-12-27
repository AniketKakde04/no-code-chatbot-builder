
import React, { useState, useEffect } from 'react';
import { 
  MessageSquare, Database, Bot, Settings, LogOut, 
  Plus, Search, Bell, Sparkles, User, ChevronRight,
  Github, Mail, Lock
} from 'lucide-react';
import { ChatbotConfig } from './types';
import Dashboard from './components/Dashboard';
import BuilderSteps from './components/BuilderSteps';

// Simulating Supabase Client logic
const supabase = {
  auth: {
    signIn: async (data: any) => ({ error: null }),
    signUp: async (data: any) => ({ error: null }),
    signOut: async () => {},
  }
};

type View = 'login' | 'dashboard' | 'builder' | 'knowledge';

const App: React.FC = () => {
  const [view, setView] = useState<View>('login');
  const [authTab, setAuthTab] = useState<'signin' | 'signup'>('signin');
  const [bots, setBots] = useState<ChatbotConfig[]>([]);
  const [currentBot, setCurrentBot] = useState<ChatbotConfig | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem('botbuilder_bots');
    if (saved) setBots(JSON.parse(saved));
  }, []);

  useEffect(() => {
    localStorage.setItem('botbuilder_bots', JSON.stringify(bots));
  }, [bots]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    // Simulate auth delay
    setTimeout(() => {
      setIsLoading(false);
      setView('dashboard');
    }, 1000);
  };

  const startNewBot = () => {
    const newBot: ChatbotConfig = {
      id: Math.random().toString(36).substr(2, 9),
      name: "New Assistant",
      tone: 'Professional',
      useCase: 'Support',
      brandColor: '#6366f1',
      welcomeMessage: "Hello! How can I help you today?",
      position: 'right',
      isDarkMode: true,
      dataSources: [],
      createdAt: Date.now(),
      status: 'Paused',
    };
    setCurrentBot(newBot);
    setView('builder');
  };

  const editBot = (bot: ChatbotConfig) => {
    setCurrentBot(bot);
    setView('builder');
  };

  if (view === 'login') {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 bg-slate-950">
        <div className="w-full max-w-md space-y-8">
          <div className="text-center space-y-2">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-indigo-600 mb-4">
              <Bot className="text-white" size={28} />
            </div>
            <h1 className="text-3xl font-bold tracking-tight text-slate-50">Welcome to BotBuilder</h1>
            <p className="text-slate-400">The intelligence layer for your website.</p>
          </div>

          <div className="p-1 linear-border bg-slate-900/50 rounded-2xl backdrop-blur-xl">
            <div className="flex p-1 gap-1">
              <button 
                onClick={() => setAuthTab('signin')}
                className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all ${authTab === 'signin' ? 'bg-slate-800 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'}`}
              >
                Sign In
              </button>
              <button 
                onClick={() => setAuthTab('signup')}
                className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all ${authTab === 'signup' ? 'bg-slate-800 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'}`}
              >
                Create Account
              </button>
            </div>

            <div className="p-6 space-y-6">
              <button className="w-full flex items-center justify-center gap-3 px-4 py-2.5 linear-border bg-slate-950 rounded-xl text-sm font-medium hover:bg-slate-800 transition-colors">
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                  <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                  <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" />
                  <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                </svg>
                Continue with Google
              </button>

              <div className="relative">
                <div className="absolute inset-0 flex items-center"><span className="w-full border-t border-slate-800" /></div>
                <div className="relative flex justify-center text-xs uppercase"><span className="bg-slate-900 px-2 text-slate-500">Or continue with email</span></div>
              </div>

              <form onSubmit={handleLogin} className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-400">Email Address</label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-600" size={18} />
                    <input type="email" required className="w-full pl-10 pr-4 py-2 bg-slate-950 linear-border rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/50" placeholder="name@company.com" />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-400">Password</label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-600" size={18} />
                    <input type="password" required className="w-full pl-10 pr-4 py-2 bg-slate-950 linear-border rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/50" placeholder="••••••••" />
                  </div>
                </div>
                <button 
                  type="submit" 
                  disabled={isLoading}
                  className="w-full py-2.5 bg-slate-50 text-slate-950 rounded-xl font-bold hover:bg-slate-200 transition-all disabled:opacity-50"
                >
                  {isLoading ? 'Processing...' : authTab === 'signin' ? 'Sign In' : 'Create Account'}
                </button>
              </form>
            </div>
          </div>
          <p className="text-center text-sm text-slate-500">
            By continuing, you agree to our <a href="#" className="text-slate-300 underline">Terms of Service</a>.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 flex">
      {/* PERSISTENT SIDEBAR */}
      <aside className="w-64 linear-border border-r bg-slate-950 flex flex-col fixed inset-y-0 z-50">
        <div className="p-6 flex items-center gap-3">
          <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center text-white">
            <Bot size={20} />
          </div>
          <span className="font-bold text-lg text-slate-50 tracking-tight">BotBuilder</span>
        </div>

        <nav className="flex-1 px-4 space-y-1 mt-4">
          <button 
            onClick={() => setView('dashboard')}
            className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl transition-all ${view === 'dashboard' ? 'bg-slate-800 text-slate-50 font-medium' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'}`}
          >
            <MessageSquare size={18} />
            <span className="text-sm">My Chatbots</span>
          </button>
          
          <button 
            onClick={() => setView('knowledge')}
            className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl transition-all ${view === 'knowledge' ? 'bg-slate-800 text-slate-50 font-medium' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'}`}
          >
            <Database size={18} />
            <span className="text-sm">Knowledge Base</span>
          </button>

          <div className="w-full flex items-center justify-between gap-3 px-4 py-2.5 rounded-xl text-slate-600 cursor-not-allowed group">
            <div className="flex items-center gap-3">
              <Bot size={18} />
              <span className="text-sm">AI Agents</span>
            </div>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full badge-soon text-white uppercase">Soon</span>
          </div>
        </nav>

        <div className="px-4 py-4 space-y-1">
          <button className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-slate-400 hover:text-slate-200 hover:bg-slate-900 transition-all">
            <Settings size={18} />
            <span className="text-sm">Settings</span>
          </button>
          
          <div className="pt-4 border-t border-slate-800 mt-4">
            <div className="flex items-center gap-3 px-4 py-3">
              <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center border border-slate-700">
                <User size={16} className="text-slate-400" />
              </div>
              <div className="flex-1 overflow-hidden">
                <p className="text-xs font-bold text-slate-200 truncate">Alex Rivera</p>
                <p className="text-[10px] text-slate-500 truncate">alex@botbuilder.io</p>
              </div>
              <button 
                onClick={() => setView('login')}
                className="p-1.5 text-slate-500 hover:text-red-400 transition-colors"
              >
                <LogOut size={16} />
              </button>
            </div>
          </div>
        </div>
      </aside>

      {/* MAIN CONTENT AREA */}
      <main className="flex-1 ml-64 min-h-screen flex flex-col">
        <header className="h-16 linear-border border-b px-8 flex items-center justify-between sticky top-0 bg-slate-950/80 backdrop-blur-md z-40">
          <div className="flex items-center gap-4">
            <div className="text-sm font-medium text-slate-400">Workspace / <span className="text-slate-50">My Chatbots</span></div>
          </div>
          <div className="flex items-center gap-4">
            <button className="p-2 text-slate-400 hover:text-slate-100"><Bell size={20} /></button>
            <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-indigo-500 to-violet-600 border border-white/10" />
          </div>
        </header>

        <div className="p-10 flex-1">
          {view === 'dashboard' ? (
            <Dashboard 
              bots={bots} 
              onCreateNew={startNewBot} 
              onEdit={editBot} 
            />
          ) : view === 'builder' && currentBot ? (
            <div className="max-w-5xl mx-auto h-full">
              <BuilderSteps 
                config={currentBot} 
                onUpdate={(updates) => setCurrentBot({...currentBot, ...updates})} 
                onComplete={() => {
                  const botToSave = { ...currentBot, status: 'Active' as const };
                  setBots(prev => {
                    const exists = prev.find(b => b.id === botToSave.id);
                    if (exists) return prev.map(b => b.id === botToSave.id ? botToSave : b);
                    return [botToSave, ...prev];
                  });
                  setView('dashboard');
                }}
              />
            </div>
          ) : view === 'knowledge' ? (
             <div className="flex flex-col items-center justify-center h-[60vh] text-center space-y-4">
                <Database size={48} className="text-slate-800" />
                <h2 className="text-xl font-bold">Knowledge Base</h2>
                <p className="text-slate-500 max-w-sm">Manage your global data clusters here. Coming in the next update.</p>
             </div>
          ) : null}
        </div>
      </main>
    </div>
  );
};

export default App;
