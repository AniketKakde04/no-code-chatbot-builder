import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, Save, Upload, FileText, Globe, AlertTriangle, X, Plus } from 'lucide-react';
import { api } from '@/services/api';

export function EditBot() {
  const { botId } = useParams<{ botId: string }>();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  // Form State
  const [name, setName] = useState('');
  const [clearHistory, setClearHistory] = useState(false);
  
  // Data States
  const [files, setFiles] = useState<File[]>([]);
  const [csvFiles, setCsvFiles] = useState<File[]>([]);
  const [urls, setUrls] = useState<string[]>([]);
  const [currentUrl, setCurrentUrl] = useState('');

  useEffect(() => {
    async function fetchBot() {
      try {
        if (!botId) return;
        const data = await api.getBot(botId);
        setName(data.name);
      } catch (error) {
        console.error("Error fetching bot:", error);
        alert("Failed to load bot details.");
        navigate('/dashboard');
      } finally {
        setLoading(false);
      }
    }
    fetchBot();
  }, [botId, navigate]);

  const handleAddUrl = () => {
    if (currentUrl && !urls.includes(currentUrl)) {
      setUrls([...urls, currentUrl]);
      setCurrentUrl('');
    }
  };

  const removeUrl = (urlToRemove: string) => {
    setUrls(urls.filter(url => url !== urlToRemove));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, type: 'pdf' | 'csv') => {
    if (e.target.files) {
      const newFiles = Array.from(e.target.files);
      if (type === 'pdf') {
        setFiles(prev => [...prev, ...newFiles]);
      } else {
        setCsvFiles(prev => [...prev, ...newFiles]);
      }
    }
  };

  const removeFile = (index: number, type: 'pdf' | 'csv') => {
    if (type === 'pdf') {
      setFiles(files.filter((_, i) => i !== index));
    } else {
      setCsvFiles(csvFiles.filter((_, i) => i !== index));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!botId) return;
    
    setSaving(true);
    try {
      const formData = new FormData();
      formData.append('name', name);
      
      files.forEach(file => formData.append('files', file));
      csvFiles.forEach(file => formData.append('csvfiles', file));
      urls.forEach(url => formData.append('urls', url));
      
      formData.append('clear_history', clearHistory.toString());

      await api.updateBot(botId, formData);
      navigate('/dashboard');
    } catch (error) {
      console.error(error);
      alert('Failed to update bot. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="p-8 text-white">Loading...</div>;
  }

  return (
    <div className="p-8 max-w-4xl mx-auto space-y-8">
      <div className="flex items-center gap-4">
        <button 
          onClick={() => navigate('/dashboard')}
          className="p-2 hover:bg-slate-800 rounded-lg transition-colors text-slate-400 hover:text-white"
        >
          <ArrowLeft className="w-6 h-6" />
        </button>
        <div>
          <h1 className="text-3xl font-bold text-white">Edit Bot</h1>
          <p className="text-slate-400">Update your chatbot's settings and knowledge.</p>
        </div>
      </div>

      <motion.form 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        onSubmit={handleSubmit}
        className="space-y-6"
      >
        {/* Name Section */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
          <label className="block text-sm font-medium text-slate-300 mb-2">
            Bot Name
          </label>
          <input
            type="text"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
            placeholder="e.g., Customer Support Agent"
          />
        </div>

        {/* Knowledge Base Section */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
          <h2 className="text-xl font-semibold text-white mb-4">Update Knowledge Base</h2>
          
          <div className="flex items-start gap-4 mb-6 p-4 bg-amber-500/10 border border-amber-500/20 rounded-lg">
            <AlertTriangle className="w-5 h-5 text-amber-500 mt-0.5" />
            <div className="space-y-2">
              <label className="flex items-center gap-3 cursor-pointer">
                <input 
                  type="checkbox" 
                  checked={clearHistory}
                  onChange={(e) => setClearHistory(e.target.checked)}
                  className="w-4 h-4 rounded border-slate-600 bg-slate-800 text-indigo-600 focus:ring-indigo-500 focus:ring-offset-slate-900" 
                />
                <span className="text-sm font-medium text-slate-200">
                  Reset existing knowledge?
                </span>
              </label>
              <p className="text-xs text-slate-400">
                If checked, all previous documents will be deleted before adding the new ones.
                Leave unchecked to append new knowledge to the existing bot.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              
            {/* PDF Upload */}
            <div className="space-y-3">
              <label className="block text-sm font-medium text-slate-300">Add PDFs</label>
              <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 text-center hover:border-indigo-500 transition-colors">
                <input
                  type="file"
                  accept=".pdf"
                  multiple
                  onChange={(e) => handleFileChange(e, 'pdf')}
                  className="hidden"
                  id="pdf-edit-upload"
                />
                <label htmlFor="pdf-edit-upload" className="cursor-pointer flex flex-col items-center gap-2">
                  <Upload className="w-6 h-6 text-indigo-500" />
                  <span className="text-xs text-slate-400">Click to upload</span>
                </label>
              </div>
              {files.map((f, i) => (
                <div key={i} className="flex justify-between items-center bg-slate-800 p-2 rounded text-xs text-white">
                  <span className="truncate max-w-[150px]">{f.name}</span>
                  <button type="button" onClick={() => removeFile(i, 'pdf')}><X className="w-3 h-3 text-slate-400" /></button>
                </div>
              ))}
            </div>

            {/* CSV Upload */}
            <div className="space-y-3">
              <label className="block text-sm font-medium text-slate-300">Add CSVs</label>
              <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 text-center hover:border-emerald-500 transition-colors">
                <input
                  type="file"
                  accept=".csv"
                  multiple
                  onChange={(e) => handleFileChange(e, 'csv')}
                  className="hidden"
                  id="csv-edit-upload"
                />
                <label htmlFor="csv-edit-upload" className="cursor-pointer flex flex-col items-center gap-2">
                  <FileText className="w-6 h-6 text-emerald-500" />
                  <span className="text-xs text-slate-400">Click to upload</span>
                </label>
              </div>
              {csvFiles.map((f, i) => (
                <div key={i} className="flex justify-between items-center bg-slate-800 p-2 rounded text-xs text-white">
                  <span className="truncate max-w-[150px]">{f.name}</span>
                  <button type="button" onClick={() => removeFile(i, 'csv')}><X className="w-3 h-3 text-slate-400" /></button>
                </div>
              ))}
            </div>

            {/* URL Input */}
            <div className="space-y-3">
              <label className="block text-sm font-medium text-slate-300">Add URLs</label>
              <div className="flex gap-2">
                <input
                  type="url"
                  value={currentUrl}
                  onChange={(e) => setCurrentUrl(e.target.value)}
                  placeholder="https://"
                  className="flex-1 bg-slate-950 border border-slate-800 rounded-lg px-2 py-2 text-xs text-white"
                  onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddUrl())}
                />
                <button type="button" onClick={handleAddUrl} className="bg-slate-800 text-white p-2 rounded-lg">
                  <Plus className="w-4 h-4" />
                </button>
              </div>
              {urls.map((url, i) => (
                <div key={i} className="flex justify-between items-center bg-slate-800 p-2 rounded text-xs text-white">
                  <span className="truncate max-w-[150px]">{url}</span>
                  <button type="button" onClick={() => removeUrl(url)}><X className="w-3 h-3 text-slate-400" /></button>
                </div>
              ))}
            </div>

          </div>
        </div>

        <div className="flex justify-end gap-4">
          <button
            type="button"
            onClick={() => navigate('/dashboard')}
            className="px-6 py-3 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800 transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving}
            className="bg-indigo-600 hover:bg-indigo-700 text-white px-8 py-3 rounded-lg font-medium transition-all shadow-lg shadow-indigo-500/25 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            <Save className="w-5 h-5" />
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </motion.form>
    </div>
  );
}