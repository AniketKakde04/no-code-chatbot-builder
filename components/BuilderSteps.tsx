
import React, { useState } from 'react';
import { 
  FileText, Globe, Type, Settings, Palette, Code, 
  Upload, Plus, Trash2, CheckCircle2, ChevronRight, 
  Loader2, Sparkles, Wand2, Terminal
} from 'lucide-react';
import { ChatbotConfig, DataSource, ChatbotTone, UseCase } from '../types';
import { gemini } from '../services/geminiService';

interface BuilderStepsProps {
  config: ChatbotConfig;
  onUpdate: (updates: Partial<ChatbotConfig>) => void;
  onComplete: () => void;
}

const BuilderSteps: React.FC<BuilderStepsProps> = ({ config, onUpdate, onComplete }) => {
  const [activeStep, setActiveStep] = useState(0);
  const [urlInput, setUrlInput] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  const steps = [
    { label: 'Ingestion', icon: FileText },
    { label: 'Neural Path', icon: Settings },
    { label: 'Interface', icon: Palette },
    { label: 'Protocol', icon: Code },
  ];

  const handleAddUrl = async () => {
    if (!urlInput.trim()) return;
    setIsProcessing(true);
    const content = await gemini.extractContentFromUrl(urlInput);
    const newSource: DataSource = {
      id: Math.random().toString(36).substr(2, 9),
      type: 'url',
      name: urlInput,
      content,
      status: 'ready'
    };
    onUpdate({ dataSources: [...config.dataSources, newSource] });
    setUrlInput('');
    setIsProcessing(false);
  };

  const removeSource = (id: string) => {
    onUpdate({ dataSources: config.dataSources.filter(s => s.id !== id) });
  };

  return (
    <div className="flex flex-col h-full pb-10">
      {/* High-end Step Indicator */}
      <div className="flex items-center justify-between mb-12 glass-panel p-6 rounded-[2rem] border-white/5">
        {steps.map((step, idx) => (
          <React.Fragment key={idx}>
            <button 
              onClick={() => idx < activeStep && setActiveStep(idx)}
              className="flex flex-col items-center gap-3 group transition-all"
            >
              <div 
                className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all duration-500 relative ${
                  activeStep === idx 
                    ? 'bg-indigo-600 text-white shadow-xl shadow-indigo-600/30 border-white/20' 
                    : activeStep > idx 
                      ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' 
                      : 'bg-white/5 text-slate-500 border-white/5'
                } border`}
              >
                <step.icon size={22} />
                {activeStep === idx && (
                   <div className="absolute -top-1 -right-1 w-3 h-3 bg-indigo-400 rounded-full animate-ping" />
                )}
              </div>
              <span className={`text-[10px] font-black uppercase tracking-[0.2em] transition-colors ${activeStep === idx ? 'text-white' : 'text-slate-500'}`}>
                {step.label}
              </span>
            </button>
            {idx < steps.length - 1 && (
              <div className={`flex-1 h-[2px] mx-6 rounded-full transition-all duration-1000 ${activeStep > idx ? 'bg-gradient-to-r from-emerald-500 to-indigo-600' : 'bg-white/5'}`} />
            )}
          </React.Fragment>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto pr-4 scrollbar-hide space-y-10">
        {activeStep === 0 && (
          <div className="space-y-10 animate-in fade-in slide-in-from-bottom-6 duration-700">
            <div className="space-y-3">
              <h2 className="text-4xl font-black text-white tracking-tighter">Knowledge Clusters</h2>
              <p className="text-slate-400 font-medium">Ingest unstructured data into the vector database.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="glass-panel border-dashed border-2 border-white/10 rounded-3xl p-12 flex flex-col items-center justify-center gap-6 hover:border-indigo-500/50 hover:bg-white/[0.05] transition-all cursor-pointer group">
                <div className="w-16 h-16 rounded-2xl bg-white/5 flex items-center justify-center text-slate-500 group-hover:text-indigo-400 transition-colors">
                  <Upload size={32} />
                </div>
                <div className="text-center">
                  <p className="font-black text-lg text-white">Upload Cluster</p>
                  <p className="text-xs font-bold text-slate-500 tracking-wider mt-1">PDF, MARKDOWN, TXT</p>
                </div>
              </div>

              <div className="glass-panel rounded-3xl p-10 space-y-6 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/5 blur-3xl rounded-full" />
                <div className="flex items-center gap-3">
                  <Globe size={20} className="text-indigo-400" />
                  <p className="font-black text-lg text-white">Live Sync URL</p>
                </div>
                <div className="flex gap-3">
                  <input 
                    type="url" 
                    placeholder="https://docs.neural.ai"
                    className="flex-1 px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white font-medium focus:outline-none focus:border-indigo-500/50"
                    value={urlInput}
                    onChange={(e) => setUrlInput(e.target.value)}
                  />
                  <button 
                    onClick={handleAddUrl}
                    disabled={isProcessing}
                    className="px-6 py-3 bg-white text-black rounded-xl font-black hover:bg-slate-200 disabled:opacity-50 transition-all shadow-lg"
                  >
                    {isProcessing ? <Loader2 className="animate-spin" size={20} /> : 'Sync'}
                  </button>
                </div>
              </div>
            </div>

            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-black text-slate-400 uppercase tracking-widest flex items-center gap-3">
                   <Terminal size={16} /> Cluster Nodes ({config.dataSources.length})
                </h3>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {config.dataSources.map(source => (
                  <div key={source.id} className="flex items-center justify-between p-5 glass-panel rounded-2xl border-white/5 group">
                    <div className="flex items-center gap-4">
                      <div className="text-indigo-400 p-2.5 bg-indigo-500/5 rounded-xl border border-indigo-500/20">
                        {source.type === 'url' ? <Globe size={20} /> : <FileText size={20} />}
                      </div>
                      <div className="max-w-[140px]">
                        <p className="text-sm font-bold text-white truncate">{source.name}</p>
                        <p className="text-[10px] text-emerald-400 font-black tracking-widest uppercase mt-0.5">Ready</p>
                      </div>
                    </div>
                    <button onClick={() => removeSource(source.id)} className="p-2.5 glass-panel text-slate-500 hover:text-rose-400 rounded-xl transition-all">
                      <Trash2 size={16} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {activeStep === 1 && (
          <div className="space-y-10 animate-in fade-in slide-in-from-bottom-6 duration-700">
             <div className="space-y-3">
              <h2 className="text-4xl font-black text-white tracking-tighter">Neural Settings</h2>
              <p className="text-slate-400 font-medium">Fine-tune the cognitive behavior of the agent.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-3 glass-panel p-8 rounded-3xl">
                <label className="text-xs font-black text-slate-500 uppercase tracking-widest">Agent Designation</label>
                <input 
                  type="text" 
                  className="w-full px-5 py-4 bg-white/5 border border-white/10 rounded-2xl text-white font-bold focus:border-indigo-500/50 outline-none"
                  value={config.name}
                  onChange={(e) => onUpdate({ name: e.target.value })}
                />
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-3 glass-panel p-8 rounded-3xl">
                  <label className="text-xs font-black text-slate-500 uppercase tracking-widest">Core Tone</label>
                  <select 
                    className="w-full bg-transparent text-white font-bold outline-none cursor-pointer"
                    value={config.tone}
                    onChange={(e) => onUpdate({ tone: e.target.value as ChatbotTone })}
                  >
                    <option className="bg-[#030014]">Friendly</option>
                    <option className="bg-[#030014]">Professional</option>
                    <option className="bg-[#030014]">Analytical</option>
                    <option className="bg-[#030014]">Concise</option>
                  </select>
                </div>
                <div className="space-y-3 glass-panel p-8 rounded-3xl">
                  <label className="text-xs font-black text-slate-500 uppercase tracking-widest">Utility</label>
                  <select 
                    className="w-full bg-transparent text-white font-bold outline-none cursor-pointer"
                    value={config.useCase}
                    onChange={(e) => onUpdate({ useCase: e.target.value as UseCase })}
                  >
                    <option className="bg-[#030014]">Support</option>
                    <option className="bg-[#030014]">Sales</option>
                    <option className="bg-[#030014]">Data FAQ</option>
                  </select>
                </div>
              </div>

              <div className="md:col-span-2 space-y-3 glass-panel p-8 rounded-3xl">
                <label className="text-xs font-black text-slate-500 uppercase tracking-widest">System Initialization Greeting</label>
                <textarea 
                  className="w-full px-5 py-4 bg-white/5 border border-white/10 rounded-2xl text-white font-bold focus:border-indigo-500/50 outline-none min-h-[120px] resize-none"
                  value={config.welcomeMessage}
                  onChange={(e) => onUpdate({ welcomeMessage: e.target.value })}
                />
              </div>
            </div>
          </div>
        )}

        {activeStep === 2 && (
          <div className="space-y-10 animate-in fade-in slide-in-from-bottom-6 duration-700">
             <div className="space-y-3">
              <h2 className="text-4xl font-black text-white tracking-tighter">Interface Design</h2>
              <p className="text-slate-400 font-medium">Customize the visual projection of your agent.</p>
            </div>

            <div className="space-y-8 glass-panel p-10 rounded-[2.5rem] border-white/5">
              <div className="space-y-4">
                <label className="text-xs font-black text-slate-500 uppercase tracking-widest">Core Aesthetic Color</label>
                <div className="flex gap-4">
                  {['#6366f1', '#10b981', '#f43f5e', '#f59e0b', '#ffffff'].map(color => (
                    <button 
                      key={color}
                      onClick={() => onUpdate({ brandColor: color })}
                      className={`w-12 h-12 rounded-2xl border-4 transition-all active:scale-90 ${config.brandColor === color ? 'border-indigo-500 shadow-xl shadow-indigo-500/20 scale-110' : 'border-white/5'}`}
                      style={{ backgroundColor: color }}
                    />
                  ))}
                  <input 
                    type="color" 
                    value={config.brandColor} 
                    onChange={(e) => onUpdate({ brandColor: e.target.value })}
                    className="w-12 h-12 p-0 border-0 bg-transparent cursor-pointer rounded-2xl overflow-hidden"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-8">
                 <div className="space-y-4">
                    <label className="text-xs font-black text-slate-500 uppercase tracking-widest">Positioning Vector</label>
                    <div className="flex p-1.5 glass-panel rounded-2xl border-white/5">
                      {['left', 'right'].map((pos) => (
                        <button 
                          key={pos}
                          onClick={() => onUpdate({ position: pos as 'left' | 'right' })}
                          className={`flex-1 py-3 text-xs font-black uppercase tracking-widest rounded-xl transition-all ${config.position === pos ? 'bg-white text-black shadow-lg' : 'text-slate-500 hover:text-white'}`}
                        >
                          {pos}
                        </button>
                      ))}
                    </div>
                 </div>
                 <div className="space-y-4">
                    <label className="text-xs font-black text-slate-500 uppercase tracking-widest">Interface Luminosity</label>
                    <button 
                      onClick={() => onUpdate({ isDarkMode: !config.isDarkMode })}
                      className="w-full glass-panel py-3 rounded-2xl border-white/5 flex items-center justify-center gap-3 transition-all"
                    >
                       <div className={`w-3 h-3 rounded-full ${config.isDarkMode ? 'bg-indigo-400 shadow-indigo-400/50' : 'bg-slate-700 shadow-none'} shadow-lg`} />
                       <span className={`text-[10px] font-black uppercase tracking-widest ${config.isDarkMode ? 'text-white' : 'text-slate-500'}`}>
                         {config.isDarkMode ? 'DARK_MODE_ENGAGED' : 'LIGHT_MODE_ACTIVE'}
                       </span>
                    </button>
                 </div>
              </div>
            </div>
          </div>
        )}

        {activeStep === 3 && (
          <div className="space-y-10 animate-in fade-in slide-in-from-bottom-6 duration-700 text-center py-10">
            <div className="w-24 h-24 bg-emerald-500/10 text-emerald-400 rounded-[2rem] flex items-center justify-center mx-auto mb-6 shadow-2xl shadow-emerald-500/10 border border-emerald-500/20">
              <CheckCircle2 size={48} strokeWidth={1.5} />
            </div>
            <div className="space-y-4">
              <h2 className="text-5xl font-black text-white tracking-tighter">Neural Network Ready</h2>
              <p className="text-slate-400 font-medium max-w-md mx-auto">The deployment script is synthesized. Integrate the following protocol into your web architecture.</p>
            </div>

            <div className="bg-[#030014] rounded-3xl p-10 relative group border border-white/5 shadow-inner">
              <div className="absolute top-4 left-4 flex gap-1.5">
                <div className="w-2 h-2 rounded-full bg-white/10" />
                <div className="w-2 h-2 rounded-full bg-white/10" />
                <div className="w-2 h-2 rounded-full bg-white/10" />
              </div>
              <pre className="text-sm text-indigo-400 whitespace-pre-wrap font-mono mt-6 text-left selection:bg-indigo-500/30">
                {`<script \n  src="https://cdn.botcraft.ai/v4/neural.js" \n  data-bot-id="${config.id}" \n  type="module"\n  async\n></script>`}
              </pre>
              <button 
                onClick={() => {
                  navigator.clipboard.writeText(`<script src="https://cdn.botcraft.ai/v4/neural.js" data-bot-id="${config.id}" type="module" async></script>`);
                  alert('Integration Script Copied.');
                }}
                className="absolute bottom-4 right-4 px-5 py-2.5 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-500 transition-all text-sm"
              >
                Copy Protocol
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="mt-8 flex items-center justify-between">
        <button 
          onClick={() => setActiveStep(prev => Math.max(0, prev - 1))}
          disabled={activeStep === 0}
          className="px-8 py-3 text-sm font-black uppercase tracking-widest text-slate-500 hover:text-white transition-all disabled:opacity-0"
        >
          Previous Vector
        </button>
        {activeStep === steps.length - 1 ? (
          <button 
            onClick={onComplete}
            className="px-10 py-4 bg-white text-black rounded-2xl font-black hover:bg-slate-200 flex items-center gap-3 shadow-2xl transition-all"
          >
            Finalize Deployment
            <ChevronRight size={20} />
          </button>
        ) : (
          <button 
            onClick={() => setActiveStep(prev => Math.min(steps.length - 1, prev + 1))}
            className="px-10 py-4 bg-indigo-600 text-white rounded-2xl font-black hover:bg-indigo-500 flex items-center gap-3 shadow-xl shadow-indigo-600/20 transition-all"
          >
            Proceed to {steps[activeStep + 1].label}
            <ChevronRight size={20} />
          </button>
        )}
      </div>
    </div>
  );
};

export default BuilderSteps;
