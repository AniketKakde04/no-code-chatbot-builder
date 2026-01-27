import React, { useState } from 'react';
import { Upload, CheckCircle, AlertCircle, Loader2, ArrowLeft, Globe, FileText, Plus } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '@/services/api';
import { useAuth } from '@/contexts/AuthContext';

export const CreateBot = () => {
    const navigate = useNavigate();
    const { session } = useAuth();
    const [botName, setBotName] = useState('');

    // We keep both states active
    const [websiteUrl, setWebsiteUrl] = useState('');
    const [file, setFile] = useState<File | null>(null);
    const [csvfile, setcsvFile] = useState<File | null>(null);

    const [isUploading, setIsUploading] = useState(false);
    const [status, setStatus] = useState<{ type: 'success' | 'error' | null; message: string }>({ type: null, message: '' });

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const selectedFile = e.target.files[0];
            if (selectedFile.type !== 'application/pdf') {
                setStatus({ type: 'error', message: 'Please upload a valid PDF file.' });
                return;
            }
            setFile(selectedFile);
            setStatus({ type: null, message: '' });
        }
    };

    const handleCSVFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {

        if (e.target.files && e.target.files[0]) {
            const selectedFile = e.target.files[0];
            if (selectedFile.type !== 'text/csv') {
                setStatus({ type: 'error', message: 'Please upload a valid CSV file.' });
                return;
            }
            setcsvFile(selectedFile);
            setStatus({ type: null, message: '' });
        }

    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!botName.trim()) {
            setStatus({ type: 'error', message: 'Please enter a name for your bot.' });
            return;
        }

        // Validate that at least ONE source is provided
        if (!file && !websiteUrl.trim() && !csvfile) {
            setStatus({ type: 'error', message: 'Please provide at least one source (PDF ,website,csv).' });
            return;
        }

        if (!session?.access_token) {
            setStatus({ type: 'error', message: 'You must be logged in to create a bot.' });
            return;
        }

        setIsUploading(true);
        setStatus({ type: null, message: '' });

        try {
            // Send both! The backend will handle whatever is not null/empty.
            const result = await api.ingestDocument(
                botName,
                file, // Send file if it exists
                session.access_token,
                websiteUrl || undefined, // Send URL if it exists
                csvfile
            );

            setStatus({
                type: 'success',
                message: `Success! ${result.chunks} text chunks processed from all sources. Your bot is ready.`
            });

            const botId = result.bot_id;

            setTimeout(() => {
                navigate(`/embed/${botId}`);
            }, 1500);

        } catch (error: any) {
            setStatus({ type: 'error', message: error.message || 'Failed to create bot.' });
        } finally {
            setIsUploading(false);
        }
    };

    return (
        <div className="max-w-2xl mx-auto space-y-8">
            <div className="flex items-center gap-4">
                <Link to="/dashboard" className="p-2 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white transition-colors">
                    <ArrowLeft className="w-5 h-5" />
                </Link>
                <div>
                    <h1 className="text-3xl font-bold text-white">Create New Chatbot</h1>
                    <p className="text-slate-400">Combine data sources to train your comprehensive AI agent</p>
                </div>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 md:p-8">
                <form onSubmit={handleSubmit} className="space-y-8">
                    {/* Bot Name Input */}
                    <div className="space-y-2">
                        <label htmlFor="botName" className="text-sm font-medium text-slate-300">
                            Chatbot Name
                        </label>
                        <input
                            id="botName"
                            type="text"
                            value={botName}
                            onChange={(e) => setBotName(e.target.value)}
                            placeholder="e.g., My Personal Assistant..."
                            className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-3 text-white placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                        />
                    </div>

                    <div className="space-y-6">
                        <h3 className="text-lg font-medium text-white border-b border-slate-800 pb-2">Knowledge Sources</h3>

                        {/* Source 1: PDF */}
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-slate-300 flex items-center gap-2">
                                <FileText className="w-4 h-4 text-indigo-400" />
                                1. Upload PDF (Optional)
                            </label>
                            <div className="relative group">
                                <input
                                    type="file"
                                    accept=".pdf"
                                    onChange={handleFileChange}
                                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                                />
                                <div className={`
                                    border-2 border-dashed rounded-xl p-6 text-center transition-all
                                    ${file
                                        ? 'border-emerald-500/50 bg-emerald-500/5'
                                        : 'border-slate-700 bg-slate-950 hover:border-indigo-500/50 hover:bg-slate-900'
                                    }
                                `}>
                                    <div className="flex flex-row items-center justify-center gap-4">
                                        {file ? (
                                            <>
                                                <div className="p-2 rounded-full bg-emerald-500/10 text-emerald-400">
                                                    <CheckCircle className="w-5 h-5" />
                                                </div>
                                                <div className="text-left">
                                                    <p className="font-medium text-emerald-400">{file.name}</p>
                                                    <p className="text-xs text-emerald-500/60">
                                                        {(file.size / 1024 / 1024).toFixed(2)} MB attached
                                                    </p>
                                                </div>
                                            </>
                                        ) : (
                                            <>
                                                <Upload className="w-5 h-5 text-slate-500" />
                                                <span className="text-slate-400">Drop PDF here or click to upload</span>
                                            </>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>


                        {/* Source 2: CSV */}

<div className="space-y-2">
                            <label className="text-sm font-medium text-slate-300 flex items-center gap-2">
                                <FileText className="w-4 h-4 text-indigo-400" />
                                2. Upload CSV (Optional)
                            </label>
                            <div className="relative group">
                                <input
                                    type="file"
                                    accept=".csv"
                                    onChange={handleCSVFileChange}
                                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                                />
                                <div className={`
                                    border-2 border-dashed rounded-xl p-6 text-center transition-all
                                    ${csvfile
                                        ? 'border-emerald-500/50 bg-emerald-500/5'
                                        : 'border-slate-700 bg-slate-950 hover:border-indigo-500/50 hover:bg-slate-900'
                                    }
                                `}>
                                    <div className="flex flex-row items-center justify-center gap-4">
                                        {csvfile ? (
                                            <>
                                                <div className="p-2 rounded-full bg-emerald-500/10 text-emerald-400">
                                                    <CheckCircle className="w-5 h-5" />
                                                </div>
                                                <div className="text-left">
                                                    <p className="font-medium text-emerald-400">{csvfile.name}</p>
                                                    <p className="text-xs text-emerald-500/60">
                                                        {(csvfile.size / 1024 / 1024).toFixed(2)} MB attached
                                                    </p>
                                                </div>
                                            </>
                                        ) : (
                                            <>
                                                <Upload className="w-5 h-5 text-slate-500" />
                                                <span className="text-slate-400">Drop csv here or click to upload</span>
                                            </>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Source 2: Website */}
                        <div className="space-y-2">
                            <label htmlFor="websiteUrl" className="text-sm font-medium text-slate-300 flex items-center gap-2">
                                <Globe className="w-4 h-4 text-indigo-400" />
                                2. Website URL (Optional)
                            </label>
                            <div className="relative">
                                <Globe className="absolute left-4 top-3.5 w-5 h-5 text-slate-500" />
                                <input
                                    id="websiteUrl"
                                    type="url"
                                    value={websiteUrl}
                                    onChange={(e) => setWebsiteUrl(e.target.value)}
                                    placeholder="https://example.com"
                                    className="w-full pl-12 bg-slate-950 border border-slate-800 rounded-lg px-4 py-3 text-white placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Status Message */}
                    {status.message && (
                        <div className={`p-4 rounded-lg flex items-start gap-3 ${status.type === 'error'
                            ? 'bg-red-500/10 text-red-400 border border-red-500/20'
                            : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                            }`}>
                            {status.type === 'error' ? <AlertCircle className="w-5 h-5 shrink-0" /> : <CheckCircle className="w-5 h-5 shrink-0" />}
                            <p className="text-sm">{status.message}</p>
                        </div>
                    )}

                    {/* Submit Button */}
                    <button
                        type="submit"
                        disabled={isUploading || (!file && !websiteUrl && !csvfile) || !botName}
                        className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed text-white px-6 py-3 rounded-lg font-medium transition-all shadow-lg shadow-indigo-500/20 flex items-center justify-center gap-2"
                    >
                        {isUploading ? (
                            <>
                                <Loader2 className="w-5 h-5 animate-spin" />
                                Ingesting Knowledge...
                            </>
                        ) : (
                            'Create Chatbot'
                        )}
                    </button>
                </form>
            </div>
        </div>
    );
};