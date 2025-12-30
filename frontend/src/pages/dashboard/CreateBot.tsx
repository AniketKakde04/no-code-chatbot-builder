import React, { useState } from 'react';
import { Upload, CheckCircle, AlertCircle, Loader2, ArrowLeft } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '@/services/api';
import { useAuth } from '@/contexts/AuthContext';

export const CreateBot = () => {
    const navigate = useNavigate();
    const { session } = useAuth();
    const [botName, setBotName] = useState('');
    const [file, setFile] = useState<File | null>(null);
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

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!botName.trim()) {
            setStatus({ type: 'error', message: 'Please enter a name for your bot.' });
            return;
        }
        if (!file) {
            setStatus({ type: 'error', message: 'Please upload a PDF document.' });
            return;
        }

        if (!session?.access_token) {
            setStatus({ type: 'error', message: 'You must be logged in to create a bot.' });
            return;
        }

        setIsUploading(true);
        setStatus({ type: null, message: '' });

        try {
            const result = await api.ingestDocument(botName, file, session.access_token);

            setStatus({
                type: 'success',
                message: `Success! ${result.chunks} text chunks processed. Your bot is ready.`
            });

            // Use the ID returned from the backend
            const botId = result.bot_id;

            // navigate to the embed page for this specific bot.
            setTimeout(() => {
                navigate(`/embed/${botId}`);
            }, 1000);

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
                    <p className="text-slate-400">Upload your data to train your custom AI agent</p>
                </div>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 md:p-8">
                <form onSubmit={handleSubmit} className="space-y-6">
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
                            placeholder="e.g., HR Assistant, Legal Helper..."
                            className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-3 text-white placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                        />
                    </div>

                    {/* File Upload Area */}
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-slate-300">
                            Knowledge Base (PDF)
                        </label>
                        <div className="relative group">
                            <input
                                type="file"
                                accept=".pdf"
                                onChange={handleFileChange}
                                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                            />
                            <div className={`
                                border-2 border-dashed rounded-xl p-8 text-center transition-all
                                ${file
                                    ? 'border-emerald-500/50 bg-emerald-500/5'
                                    : 'border-slate-700 bg-slate-950 hover:border-indigo-500/50 hover:bg-slate-900'
                                }
                            `}>
                                <div className="flex flex-col items-center gap-3">
                                    {file ? (
                                        <>
                                            <div className="p-3 rounded-full bg-emerald-500/10 text-emerald-400">
                                                <CheckCircle className="w-6 h-6" />
                                            </div>
                                            <div>
                                                <p className="font-medium text-emerald-400">{file.name}</p>
                                                <p className="text-sm text-emerald-500/60">
                                                    {(file.size / 1024 / 1024).toFixed(2)} MB • Ready to upload
                                                </p>
                                            </div>
                                        </>
                                    ) : (
                                        <>
                                            <div className="p-3 rounded-full bg-slate-900 text-indigo-400 group-hover:scale-110 transition-transform">
                                                <Upload className="w-6 h-6" />
                                            </div>
                                            <div>
                                                <p className="font-medium text-slate-300">Click to upload or drag and drop</p>
                                                <p className="text-sm text-slate-500">PDF files up to 10MB</p>
                                            </div>
                                        </>
                                    )}
                                </div>
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
                        disabled={isUploading || !file || !botName}
                        className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed text-white px-6 py-3 rounded-lg font-medium transition-all shadow-lg shadow-indigo-500/20 flex items-center justify-center gap-2"
                    >
                        {isUploading ? (
                            <>
                                <Loader2 className="w-5 h-5 animate-spin" />
                                Processing Document...
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
