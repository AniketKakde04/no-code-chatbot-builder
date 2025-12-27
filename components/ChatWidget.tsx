
import React, { useState, useEffect, useRef } from 'react';
import { Send, X, MessageSquare, Bot, Loader2, Minus } from 'lucide-react';
import { ChatbotConfig, ChatMessage } from '../types';
import { gemini } from '../services/geminiService';

interface ChatWidgetProps {
  config: ChatbotConfig;
  previewMode?: boolean;
}

const ChatWidget: React.FC<ChatWidgetProps> = ({ config, previewMode = false }) => {
  const [isOpen, setIsOpen] = useState(previewMode);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (messages.length === 0) {
      setMessages([
        {
          role: 'model',
          content: config.welcomeMessage,
          timestamp: Date.now(),
        },
      ]);
    }
  }, [config.welcomeMessage]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isLoading]);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;
    const userMsg: ChatMessage = { role: 'user', content: input, timestamp: Date.now() };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsLoading(true);
    try {
      const response = await gemini.chat(config, messages, input);
      setMessages(prev => [...prev, { role: 'model', content: response, timestamp: Date.now() }]);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const widgetBg = config.isDarkMode ? 'rgba(3, 0, 20, 0.95)' : 'rgba(255, 255, 255, 0.98)';
  const textColor = config.isDarkMode ? '#f8fafc' : '#1e293b';
  const borderColor = config.isDarkMode ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.05)';

  return (
    <div className={`${previewMode ? 'relative h-full w-full' : `fixed bottom-8 ${config.position === 'right' ? 'right-8' : 'left-8'} z-50`} flex flex-col items-end`}>
      {isOpen && (
        <div 
          className={`${previewMode ? 'h-full w-full' : 'mb-6 w-[380px] h-[580px]'} rounded-[2.5rem] shadow-3xl overflow-hidden flex flex-col border backdrop-blur-3xl animate-in zoom-in-95 fade-in duration-300`}
          style={{ backgroundColor: widgetBg, color: textColor, borderColor: borderColor }}
        >
          {/* Header */}
          <div className="p-6 flex items-center justify-between" style={{ backgroundColor: `${config.brandColor}15` }}>
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl flex items-center justify-center shadow-lg relative" style={{ backgroundColor: config.brandColor }}>
                <Bot size={24} className="text-white" />
                <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-emerald-500 rounded-full border-2" style={{ borderColor: widgetBg }} />
              </div>
              <div>
                <h3 className="font-black text-sm tracking-tight">{config.name}</h3>
                <span className="text-[10px] font-black uppercase tracking-widest text-emerald-500">Node Active</span>
              </div>
            </div>
            {!previewMode && (
              <button onClick={() => setIsOpen(false)} className="p-2 hover:bg-white/10 rounded-xl transition-all text-slate-400">
                <Minus size={20} />
              </button>
            )}
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6 scrollbar-hide" ref={scrollRef}>
            {messages.map((msg, idx) => (
              <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div 
                  className={`max-w-[85%] p-4 rounded-3xl text-sm font-medium leading-relaxed shadow-sm ${
                    msg.role === 'user' 
                      ? 'bg-indigo-600 text-white rounded-tr-none' 
                      : 'bg-white/5 border border-white/5 rounded-tl-none'
                  }`}
                  style={msg.role === 'model' && !config.isDarkMode ? { backgroundColor: '#f1f5f9', border: 'none' } : {}}
                >
                  {msg.content}
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-white/5 p-4 rounded-3xl rounded-tl-none border border-white/5">
                  <div className="flex gap-1">
                    <div className="w-1.5 h-1.5 bg-slate-500 rounded-full animate-bounce" />
                    <div className="w-1.5 h-1.5 bg-slate-500 rounded-full animate-bounce [animation-delay:0.2s]" />
                    <div className="w-1.5 h-1.5 bg-slate-500 rounded-full animate-bounce [animation-delay:0.4s]" />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Input */}
          <div className="p-6">
            <div className="relative glass-panel rounded-2xl border-white/5 overflow-hidden">
              <input
                type="text"
                placeholder="Neural interface query..."
                className="w-full pl-5 pr-14 py-4 bg-transparent text-sm focus:outline-none placeholder:text-slate-500 font-medium"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                disabled={isLoading}
              />
              <button 
                onClick={handleSend}
                disabled={isLoading || !input.trim()}
                className="absolute right-2 top-1/2 -translate-y-1/2 w-10 h-10 rounded-xl text-white transition-all disabled:opacity-50 flex items-center justify-center hover:scale-105"
                style={{ backgroundColor: config.brandColor }}
              >
                <Send size={18} />
              </button>
            </div>
            <p className="text-[9px] font-black tracking-widest text-center mt-4 opacity-30 uppercase">Neural Infrastructure v4.2</p>
          </div>
        </div>
      )}

      {!previewMode && (
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="w-16 h-16 rounded-[1.5rem] shadow-2xl flex items-center justify-center text-white transition-all hover:scale-110 active:scale-95 group relative"
          style={{ backgroundColor: config.brandColor }}
        >
          <div className="absolute inset-0 bg-white/20 rounded-[1.5rem] scale-0 group-hover:scale-100 transition-transform duration-500" />
          {isOpen ? <X size={32} /> : <MessageSquare size={32} />}
        </button>
      )}
    </div>
  );
};

export default ChatWidget;
