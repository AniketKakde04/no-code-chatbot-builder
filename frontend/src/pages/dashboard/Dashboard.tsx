import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Plus,
  MessageSquare,
  MoreVertical,
  Trash2,
  Bot,
  Code,
  Settings,
  Edit,
  Workflow,
  ChevronRight,
  Send,
  ExternalLink,
  History,
  Activity,
  GitBranch,
  Smartphone
} from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
// Using deeper relative paths to ensure resolution from src/pages/dashboard/
import { api } from '../../../src/services/api';
import { cn } from '../../../src/lib/utils';

export function Dashboard() {
  const navigate = useNavigate();
  const [bots, setBots] = useState<any[]>([]);
  const [workflows, setWorkflows] = useState<any[]>([]);
  const [stats, setStats] = useState({ total_bots: 0, total_messages: 0, total_conversations: 0 });
  const [loading, setLoading] = useState(true);
  const [menuOpen, setMenuOpen] = useState<string | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [botsData, statsData, workflowsData] = await Promise.all([
        api.getBots(),
        api.getStats(),
        api.getWorkflows().catch(() => [])
      ]);
      setBots(botsData);
      setStats(statsData);
      setWorkflows(workflowsData);
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
        fetchData();
      } catch (error) {
        alert('Failed to delete bot');
      }
    }
  };

  // Generate a consistent color based on bot name
  const getBotColor = (name: string) => {
    const colors = [
      'from-indigo-500 to-purple-600',
      'from-emerald-500 to-teal-600',
      'from-orange-500 to-red-600',
      'from-blue-500 to-indigo-600',
      'from-pink-500 to-rose-600',
    ];
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
      hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    return colors[Math.abs(hash) % colors.length];
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin" />
          <p className="text-slate-400 font-medium animate-pulse">Initializing dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-10">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
          <h1 className="text-4xl font-black text-white tracking-tight mb-2">
            Dashboard
          </h1>
          <div className="flex items-center gap-2 text-slate-400 font-medium">
            {/* <Activity className="w-4 h-4 text-emerald-500" /> */}
            <span className="mx-2 text-slate-700">•</span>
            <span>{bots.length} active agents</span>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Link
            to="/agent-builder"
            className="hidden sm:flex bg-slate-900 hover:bg-slate-800 text-slate-200 px-5 py-2.5 rounded-xl font-semibold items-center gap-2 transition-all border border-slate-800 hover:border-slate-700 shadow-xl"
          >
            <Workflow className="w-4 h-4 text-indigo-400" />
            Workflow Editor
          </Link>
          <Link
            to="/create-bot"
            className="bg-indigo-600 hover:bg-indigo-500 text-white px-6 py-2.5 rounded-xl font-bold flex items-center gap-2 transition-all shadow-lg shadow-indigo-600/30 hover:-translate-y-0.5"
          >
            <Plus className="w-5 h-5" />
            New Bot
          </Link>
        </div>
      </div>

      {/* Stats Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {[
          { label: 'Total Bots', value: stats.total_bots, icon: Bot, color: 'text-indigo-400', bg: 'bg-indigo-500/10' },
          { label: 'Total Messages', value: stats.total_messages, icon: Send, color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
          { label: 'Active Sessions', value: stats.total_conversations, icon: History, color: 'text-purple-400', bg: 'bg-purple-500/10' },
        ].map((stat, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1, ease: "easeOut" }}
            className="group relative bg-slate-900/50 backdrop-blur-sm border border-slate-800/50 p-6 rounded-3xl hover:border-slate-700 transition-all"
          >
            <div className="flex items-center gap-5">
              <div className={cn("p-4 rounded-2xl transition-transform group-hover:scale-110 duration-300", stat.bg)}>
                <stat.icon className={cn("w-6 h-6", stat.color)} />
              </div>
              <div>
                <p className="text-slate-500 text-xs font-bold uppercase tracking-widest mb-1">{stat.label}</p>
                <div className="flex items-baseline gap-2">
                  <p className="text-3xl font-black text-white tabular-nums">{stat.value}</p>
                </div>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Bots Section Header */}
      <div className="flex items-center justify-between border-b border-slate-900 pb-4">
        <h2 className="text-lg font-bold text-slate-200">Your AI Fleet</h2>
        <div className="flex gap-2">
          <button className="text-xs font-bold text-slate-500 hover:text-white transition-colors">Sort by Name</button>
          <span className="text-slate-800">|</span>
          <button className="text-xs font-bold text-indigo-500">Most Recent</button>
        </div>
      </div>

      {/* Bots List / Empty State */}
      {bots.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 bg-slate-900/20 border-2 border-dashed border-slate-800 rounded-3xl">
          <div className="p-4 bg-slate-900 rounded-2xl mb-4">
            <Bot className="w-12 h-12 text-slate-700" />
          </div>
          <h3 className="text-xl font-bold text-white mb-2">No Bots Found</h3>
          <p className="text-slate-400 mb-8 max-w-xs text-center">Get started by creating your first AI agent to handle customer interactions.</p>
          <Link
            to="/create-bot"
            className="bg-white text-slate-950 px-8 py-3 rounded-xl font-bold hover:bg-slate-200 transition-all flex items-center gap-2"
          >
            <Plus className="w-5 h-5" />
            Create My First Bot
          </Link>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {bots.map((bot, i) => (
            <motion.div
              key={bot.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className="group relative flex flex-col md:flex-row items-center gap-6 bg-slate-900/40 border border-slate-800/60 rounded-2xl p-4 hover:border-indigo-500/40 transition-all duration-300 hover:bg-slate-900/60 hover:shadow-lg hover:shadow-indigo-500/5"
            >
              {/* Left: Icon & Info */}
              <div className="flex items-center gap-4 w-full md:w-auto flex-1">
                <div className={cn(
                  "w-12 h-12 rounded-xl flex items-center justify-center text-white font-black text-lg shadow-lg transition-transform group-hover:scale-105 duration-300 bg-gradient-to-br flex-shrink-0",
                  getBotColor(bot.name)
                )}>
                  {bot.name.substring(0, 2).toUpperCase()}
                </div>

                <div className="min-w-0">
                  <h3 className="text-lg font-bold text-white tracking-tight group-hover:text-indigo-400 transition-colors truncate">
                    {bot.name}
                  </h3>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    <p className="text-slate-500 text-xs font-medium truncate">
                      Created on {new Date(bot.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                    </p>
                  </div>
                </div>
              </div>

              {/* Right: Actions */}
              <div className="flex items-center gap-3 w-full md:w-auto justify-end border-t md:border-t-0 border-slate-800/50 pt-4 md:pt-0">
                <button
                  onClick={() => navigate(`/chat/${bot.id}`)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-sm font-semibold rounded-lg border border-slate-700 hover:border-slate-600 transition-all flex items-center gap-2"
                >
                  <MessageSquare className="w-4 h-4 text-indigo-400" />
                  Chat
                </button>
                <button
                  onClick={() => navigate(`/edit-bot/${bot.id}`)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-sm font-semibold rounded-lg border border-slate-700 hover:border-slate-600 transition-all flex items-center gap-2"
                >
                  <Settings className="w-4 h-4 text-slate-400" />
                  Config
                </button>

                {/* Context Menu */}
                <div className="relative ml-1">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setMenuOpen(menuOpen === bot.id ? null : bot.id);
                    }}
                    className={cn(
                      "p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-all",
                      menuOpen === bot.id && "bg-slate-800 text-white"
                    )}
                  >
                    <MoreVertical className="w-5 h-5" />
                  </button>

                  <AnimatePresence>
                    {menuOpen === bot.id && (
                      <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 10, x: 0 }}
                        animate={{ opacity: 1, scale: 1, y: 0, x: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 10 }}
                        className="absolute right-0 top-full mt-2 w-56 bg-slate-950 border border-slate-800 rounded-xl shadow-xl z-50 overflow-hidden ring-1 ring-white/5"
                      >
                        <button
                          onClick={() => navigate(`/edit-bot/${bot.id}`)}
                          className="w-full px-4 py-3 text-left text-sm text-slate-300 hover:bg-indigo-500/10 hover:text-indigo-400 flex items-center gap-3 transition-colors"
                        >
                          <Edit className="w-4 h-4" />
                          Edit Configuration
                        </button>
                        <button
                          onClick={() => navigate(`/embed/${bot.id}`)}
                          className="w-full px-4 py-3 text-left text-sm text-slate-300 hover:bg-indigo-500/10 hover:text-indigo-400 flex items-center gap-3 transition-colors"
                        >
                          <Code className="w-4 h-4" />
                          View Embed Code
                        </button>
                        <button
                          onClick={() => navigate(`/bot/${bot.id}/telegram`)}
                          className="w-full px-4 py-3 text-left text-sm text-slate-300 hover:bg-indigo-500/10 hover:text-indigo-400 flex items-center gap-3 transition-colors"
                        >
                          <Send className="w-4 h-4" />
                          Telegram Link
                        </button>
                        <button
                          onClick={() => navigate(`/bot/${bot.id}/whatsapp`)}
                          className="w-full px-4 py-3 text-left text-sm text-slate-300 hover:bg-green-500/10 hover:text-green-400 flex items-center gap-3 transition-colors"
                        >
                          <Smartphone className="w-4 h-4" />
                          WhatsApp Link
                        </button>
                        <div className="h-px bg-slate-800/50 mx-2 my-1" />
                        <button
                          onClick={() => handleDelete(bot.id)}
                          className="w-full px-4 py-3 text-left text-sm text-red-400 hover:bg-red-500/10 flex items-center gap-3 transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                          Delete Forever
                        </button>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Saved Workflows Section */}
      <div className="flex items-center justify-between border-b border-slate-900 pb-4 mt-4">
        <div className="flex items-center gap-3">
          <h2 className="text-lg font-bold text-slate-200">Saved Workflows</h2>
          <span className="text-xs font-bold text-slate-500 bg-slate-800 px-2.5 py-1 rounded-full">{workflows.length}</span>
        </div>
        <Link
          to="/agent-builder"
          className="text-xs font-bold text-indigo-500 hover:text-indigo-400 transition-colors flex items-center gap-1"
        >
          <Plus className="w-3.5 h-3.5" />
          New Workflow
        </Link>
      </div>

      {workflows.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 bg-slate-900/20 border-2 border-dashed border-slate-800 rounded-3xl">
          <div className="p-4 bg-slate-900 rounded-2xl mb-4">
            <Workflow className="w-10 h-10 text-slate-700" />
          </div>
          <h3 className="text-lg font-bold text-white mb-2">No Workflows Yet</h3>
          <p className="text-slate-400 mb-6 max-w-xs text-center text-sm">
            Design multi-step AI agent workflows in the visual editor.
          </p>
          <Link
            to="/agent-builder"
            className="bg-white text-slate-950 px-6 py-2.5 rounded-xl font-bold hover:bg-slate-200 transition-all flex items-center gap-2 text-sm"
          >
            <Workflow className="w-4 h-4" />
            Open Workflow Editor
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {workflows.map((wf, i) => (
            <motion.div
              key={wf.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className="group relative bg-slate-900/40 border border-slate-800/60 rounded-2xl p-5 hover:border-indigo-500/40 transition-all duration-300 hover:bg-slate-900/60 hover:shadow-lg hover:shadow-indigo-500/5 flex flex-col"
            >
              <div className="flex items-start gap-3 mb-3">
                <div className="p-2.5 rounded-xl bg-indigo-500/10 flex-shrink-0">
                  <GitBranch className="w-5 h-5 text-indigo-400" />
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="text-base font-bold text-white group-hover:text-indigo-400 transition-colors truncate">
                    {wf.name}
                  </h3>
                  {wf.description && (
                    <p className="text-slate-500 text-xs mt-1 line-clamp-2">{wf.description}</p>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-4 text-xs text-slate-500 mt-auto pt-3 border-t border-slate-800/40">
                <span className="flex items-center gap-1">
                  <Bot className="w-3.5 h-3.5" />
                  {wf.nodes?.length || 0} nodes
                </span>
                <span>
                  {new Date(wf.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                </span>
              </div>

              <Link
                to={`/agent-builder/${wf.id}`}
                className="mt-3 w-full text-center px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-lg border border-slate-700 hover:border-slate-600 transition-all flex items-center justify-center gap-2"
              >
                <ExternalLink className="w-3.5 h-3.5 text-indigo-400" />
                Open in Editor
              </Link>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}