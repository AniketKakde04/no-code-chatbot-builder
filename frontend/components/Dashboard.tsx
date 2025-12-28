
import React from 'react';
import { 
  Plus, MessageSquare, ExternalLink, Settings, 
  Clock, Activity, ChevronRight, LayoutGrid
} from 'lucide-react';
import { ChatbotConfig } from '../types';

interface DashboardProps {
  bots: ChatbotConfig[];
  onCreateNew: () => void;
  onEdit: (bot: ChatbotConfig) => void;
}

const Dashboard: React.FC<DashboardProps> = ({ bots, onCreateNew, onEdit }) => {
  if (bots.length === 0) {
    return (
      <div className="h-[70vh] flex flex-col items-center justify-center text-center space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
        <div className="w-20 h-20 rounded-3xl bg-slate-900 linear-border flex items-center justify-center text-slate-700">
          <MessageSquare size={40} />
        </div>
        <div className="space-y-2">
          <h2 className="text-2xl font-bold text-slate-50">You haven't created any chatbots yet</h2>
          <p className="text-slate-500 max-w-xs mx-auto">
            Build your first AI assistant by uploading a PDF or linking your website.
          </p>
        </div>
        <button 
          onClick={onCreateNew}
          className="px-6 py-3 bg-slate-50 text-slate-950 rounded-xl font-bold hover:bg-slate-200 transition-all shadow-lg flex items-center gap-2"
        >
          <Plus size={20} />
          Create New Bot
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-50 tracking-tight">Your Chatbots</h1>
          <p className="text-slate-500 mt-1">Manage and deploy your intelligent assistants.</p>
        </div>
        <button 
          onClick={onCreateNew}
          className="px-4 py-2.5 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-500 transition-all shadow-lg shadow-indigo-600/20 flex items-center gap-2"
        >
          <Plus size={18} />
          Create New Bot
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {bots.map((bot) => (
          <div 
            key={bot.id} 
            className="group linear-border bg-slate-900/50 rounded-2xl p-6 hover:bg-slate-900 transition-all flex flex-col gap-6 relative overflow-hidden"
          >
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-4">
                <div 
                  className="w-12 h-12 rounded-xl flex items-center justify-center text-white font-bold text-xl"
                  style={{ backgroundColor: bot.brandColor }}
                >
                  {bot.name.charAt(0)}
                </div>
                <div>
                  <h3 className="font-bold text-slate-50 group-hover:text-indigo-400 transition-colors">{bot.name}</h3>
                  <div className="flex items-center gap-2 mt-1">
                    <div className={`w-1.5 h-1.5 rounded-full ${bot.status === 'Active' ? 'bg-emerald-500' : 'bg-slate-600'}`} />
                    <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500">{bot.status}</span>
                  </div>
                </div>
              </div>
              <button className="text-slate-500 hover:text-slate-300">
                <ExternalLink size={18} />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="p-3 bg-slate-950/50 rounded-xl linear-border">
                <div className="flex items-center gap-2 text-slate-500 mb-1">
                  <MessageSquare size={12} />
                  <span className="text-[10px] font-bold uppercase">Chats</span>
                </div>
                <p className="text-lg font-bold text-slate-200">0</p>
              </div>
              <div className="p-3 bg-slate-950/50 rounded-xl linear-border">
                <div className="flex items-center gap-2 text-slate-500 mb-1">
                  <Activity size={12} />
                  <span className="text-[10px] font-bold uppercase">Success</span>
                </div>
                <p className="text-lg font-bold text-slate-200">0%</p>
              </div>
            </div>

            <div className="flex items-center gap-2 mt-auto">
              <button 
                onClick={() => onEdit(bot)}
                className="flex-1 py-2 bg-slate-800 text-slate-200 rounded-lg text-xs font-bold hover:bg-slate-700 transition-colors flex items-center justify-center gap-2"
              >
                <Settings size={14} />
                Edit Bot
              </button>
              <button className="flex-1 py-2 bg-slate-800 text-slate-200 rounded-lg text-xs font-bold hover:bg-slate-700 transition-colors flex items-center justify-center gap-2">
                <LayoutGrid size={14} />
                Embed
              </button>
            </div>
            
            <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/5 blur-3xl pointer-events-none" />
          </div>
        ))}
      </div>
    </div>
  );
};

export default Dashboard;
