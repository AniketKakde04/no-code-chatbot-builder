import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Bot, Upload, FileText, Globe, Plus, X, ArrowRight, ArrowLeft } from 'lucide-react';
import { api } from '@/services/api';

export function CreateBot() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);

  const [name, setName] = useState('');

  // Data States
  const [files, setFiles] = useState<File[]>([]);
  const [csvFiles, setCsvFiles] = useState<File[]>([]);
  const [urls, setUrls] = useState<string[]>([]);
  const [currentUrl, setCurrentUrl] = useState('');

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
    setLoading(true);

    try {
      const formData = new FormData();
      formData.append('name', name);

      files.forEach(file => formData.append('files', file));
      csvFiles.forEach(file => formData.append('csvfiles', file));
      urls.forEach(url => formData.append('urls', url));

      await api.createBot(formData);
      navigate('/dashboard');
    } catch (error) {
      console.error(error);
      alert('Failed to create bot. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <div className="flex items-center gap-4 mb-8">
        <button
          onClick={() => navigate('/dashboard')}
          className="p-2 hover:bg-slate-800 rounded-lg transition-colors text-slate-400 hover:text-white"
        >
          <ArrowLeft className="w-6 h-6" />
        </button>
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">Create New Bot</h1>
          <p className="text-slate-400">Train your custom AI agent in minutes</p>
        </div>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-slate-900 border border-slate-800 rounded-2xl p-8"
      >
        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Step 1: Identity */}
          <div className="space-y-4">
            <h2 className="text-xl font-semibold text-white flex items-center gap-2">
              <span className="bg-indigo-600 w-8 h-8 rounded-full flex items-center justify-center text-sm">1</span>
              Bot Identity
            </h2>
            <div className="pl-10">
              <label className="block text-sm font-medium text-slate-300 mb-2">Bot Name</label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="e.g., Marketing Assistant"
              />
            </div>
          </div>

          <div className="border-t border-slate-800 my-8"></div>

          {/* Step 2: Knowledge Sources */}
          <div className="space-y-6">
            <h2 className="text-xl font-semibold text-white flex items-center gap-2">
              <span className="bg-indigo-600 w-8 h-8 rounded-full flex items-center justify-center text-sm">2</span>
              Knowledge Base (Multi-select)
            </h2>

            <div className="pl-10 grid grid-cols-1 md:grid-cols-3 gap-6">

              {/* PDF Upload */}
              <div className="space-y-3">
                <label className="block text-sm font-medium text-slate-300">PDF Documents</label>
                <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 text-center hover:border-indigo-500 transition-colors">
                  <input
                    type="file"
                    accept=".pdf"
                    multiple
                    onChange={(e) => handleFileChange(e, 'pdf')}
                    className="hidden"
                    id="pdf-upload"
                  />
                  <label htmlFor="pdf-upload" className="cursor-pointer flex flex-col items-center gap-2">
                    <Upload className="w-8 h-8 text-indigo-500" />
                    <span className="text-sm text-slate-400">Upload PDFs</span>
                  </label>
                </div>
                {/* File List */}
                {files.length > 0 && (
                  <div className="space-y-2 max-h-40 overflow-y-auto">
                    {files.map((f, i) => (
                      <div key={i} className="flex justify-between items-center bg-slate-800 p-2 rounded text-xs text-white">
                        <span className="truncate max-w-[150px]">{f.name}</span>
                        <button type="button" onClick={() => removeFile(i, 'pdf')}><X className="w-3 h-3 text-slate-400 hover:text-red-400" /></button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* CSV Upload */}
              <div className="space-y-3">
                <label className="block text-sm font-medium text-slate-300">CSV Data</label>
                <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 text-center hover:border-emerald-500 transition-colors">
                  <input
                    type="file"
                    accept=".csv"
                    multiple
                    onChange={(e) => handleFileChange(e, 'csv')}
                    className="hidden"
                    id="csv-upload"
                  />
                  <label htmlFor="csv-upload" className="cursor-pointer flex flex-col items-center gap-2">
                    <FileText className="w-8 h-8 text-emerald-500" />
                    <span className="text-sm text-slate-400">Upload CSVs</span>
                  </label>
                </div>
                {csvFiles.length > 0 && (
                  <div className="space-y-2 max-h-40 overflow-y-auto">
                    {csvFiles.map((f, i) => (
                      <div key={i} className="flex justify-between items-center bg-slate-800 p-2 rounded text-xs text-white">
                        <span className="truncate max-w-[150px]">{f.name}</span>
                        <button type="button" onClick={() => removeFile(i, 'csv')}><X className="w-3 h-3 text-slate-400 hover:text-red-400" /></button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* URL Input */}
              <div className="space-y-3">
                <label className="block text-sm font-medium text-slate-300">Website URLs</label>
                <div className="flex gap-2">
                  <input
                    type="url"
                    value={currentUrl}
                    onChange={(e) => setCurrentUrl(e.target.value)}
                    placeholder="https://"
                    className="flex-1 bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                    onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddUrl())}
                  />
                  <button
                    type="button"
                    onClick={handleAddUrl}
                    className="bg-blue-600 hover:bg-blue-700 text-white p-2 rounded-lg"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
                {urls.length > 0 && (
                  <div className="space-y-2 max-h-40 overflow-y-auto">
                    {urls.map((url, i) => (
                      <div key={i} className="flex justify-between items-center bg-slate-800 p-2 rounded text-xs text-white">
                        <span className="truncate max-w-[150px]">{url}</span>
                        <button type="button" onClick={() => removeUrl(url)}><X className="w-3 h-3 text-slate-400 hover:text-red-400" /></button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

            </div>
          </div>

          <div className="flex justify-end pt-6">
            <button
              type="submit"
              disabled={loading || (!files.length && !urls.length && !csvFiles.length)}
              className="bg-indigo-600 hover:bg-indigo-700 text-white px-8 py-3 rounded-xl font-medium flex items-center gap-2 transition-all shadow-lg shadow-indigo-500/25 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Creating...' : 'Create Bot'}
              {!loading && <ArrowRight className="w-5 h-5" />}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}