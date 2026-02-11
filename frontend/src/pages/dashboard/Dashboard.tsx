import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Plus, MessageSquare, MoreVertical, Trash2, Bot, Code, Settings, Edit, Workflow } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '@/services/api';

export function Dashboard() {
  const navigate = useNavigate();
  const [bots, setBots] = useState<any[]>([]);
  const [stats, setStats] = useState({ total_bots: 0, total_messages: 0, total_conversations: 0 });
  const [loading, setLoading] = useState(true);
  const [menuOpen, setMenuOpen] = useState<string | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [botsData, statsData] = await Promise.all([
        api.getBots(),
        api.getStats()
      ]);
      setBots(botsData);
      setStats(statsData);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (botId: string) => {
    if (confirm('Are you sure you want to delete this bot? This action cannot be undone.')) {
      try {
        await api.deleteBot(botId);
        fetchData(); // Refresh list
      } catch (error) {
        alert('Failed to delete bot');
      }
    }
  };

  if (loading) {
    return <div className="p-8 text-white">Loading...</div>;
  }

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">Dashboard</h1>
          <p className="text-slate-400">Manage your AI chatbots and view performance</p>
        </div>
        <div className="flex gap-4">
          <Link 
            to="/agent-builder"
            className="bg-slate-800 hover:bg-slate-700 text-white px-6 py-3 rounded-xl font-medium flex items-center gap-2 transition-all border border-slate-700 hover:border-slate-600"
          >
            <Workflow className="w-5 h-5 text-indigo-400" />
            Agent Builder
          </Link>
          <Link 
            to="/create-bot"
            className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3 rounded-xl font-medium flex items-center gap-2 transition-all shadow-lg shadow-indigo-500/25"
          >
            <Plus className="w-5 h-5" />
            Create New Bot
          </Link>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {[
          { label: 'Total Bots', value: stats.total_bots, icon: Bot, color: 'text-indigo-400' },
          { label: 'Total Messages', value: stats.total_messages, icon: MessageSquare, color: 'text-emerald-400' },
          { label: 'Active Conversations', value: stats.total_conversations, icon: MessageSquare, color: 'text-purple-400' },
        ].map((stat, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className="bg-slate-900 border border-slate-800 p-6 rounded-2xl"
          >
            <div className="flex items-center gap-4">
              <div className={`p-3 rounded-xl bg-slate-950 ${stat.color}`}>
                <stat.icon className="w-6 h-6" />
              </div>
              <div>
                <p className="text-slate-400 text-sm font-medium">{stat.label}</p>
                <p className="text-2xl font-bold text-white">{stat.value}</p>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Bots Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {bots.map((bot, i) => (
          <motion.div
            key={bot.id}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: i * 0.1 }}
            className="group bg-slate-900 border border-slate-800 rounded-2xl p-6 hover:border-indigo-500/50 transition-all relative"
          >
            <div className="absolute top-4 right-4">
              <div className="relative">
                <button 
                  onClick={() => setMenuOpen(menuOpen === bot.id ? null : bot.id)}
                  className="p-2 hover:bg-slate-800 rounded-lg text-slate-400 transition-colors"
                >
                  <MoreVertical className="w-5 h-5" />
                </button>
                
                {menuOpen === bot.id && (
                  <div className="absolute right-0 mt-2 w-48 bg-slate-950 border border-slate-800 rounded-xl shadow-xl z-10 overflow-hidden bg-slate-950">
                     <button
                      onClick={() => navigate(`/edit-bot/${bot.id}`)}
                      className="w-full px-4 py-3 text-left text-sm text-slate-300 hover:bg-slate-900 hover:text-white flex items-center gap-2"
                    >
                      <Edit className="w-4 h-4" />
                      Edit Bot
                    </button>
                    <button
                      onClick={() => navigate(`/embed/${bot.id}`)}
                      className="w-full px-4 py-3 text-left text-sm text-slate-300 hover:bg-slate-900 hover:text-white flex items-center gap-2"
                    >
                      <Code className="w-4 h-4" />
                      Embed Code
                    </button>
                    <button
                      onClick={() => navigate(`/bot/${bot.id}/telegram`)}
                      className="w-full px-4 py-3 text-left text-sm text-slate-300 hover:bg-slate-900 hover:text-white flex items-center gap-2"
                    >
                      <Settings className="w-4 h-4" />
                      Telegram
                    </button>
                    <button
                      onClick={() => handleDelete(bot.id)}
                      className="w-full px-4 py-3 text-left text-sm text-red-400 hover:bg-red-500/10 flex items-center gap-2"
                    >
                      <Trash2 className="w-4 h-4" />
                      Delete Bot
                    </button>
                  </div>
                )}
              </div>
            </div>

            <div className="mb-6">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-bold text-xl mb-4">
                {bot.name.substring(0, 2).toUpperCase()}
              </div>
              <h3 className="text-xl font-bold text-white mb-1">{bot.name}</h3>
              <p className="text-slate-400 text-sm">Created {new Date(bot.created_at).toLocaleDateString()}</p>
            </div>

            <button 
              onClick={() => {
                navigate(`/embed/${bot.id}`);
              }}
              className="w-full py-3 bg-slate-950 hover:bg-slate-800 text-indigo-400 hover:text-indigo-300 rounded-xl border border-slate-800 transition-all font-medium flex items-center justify-center gap-2"
            >
              <MessageSquare className="w-4 h-4" />
              Test Chatbot
            </button>
          </motion.div>
        ))}
      </div>
    </div>
  );
}