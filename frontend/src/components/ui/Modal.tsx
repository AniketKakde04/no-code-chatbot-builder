import React, { useEffect } from 'react';
import { X, AlertTriangle } from 'lucide-react';

interface ModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
    title: string;
    message: string;
    confirmText?: string;
    cancelText?: string;
    type?: 'danger' | 'info';
    isLoading?: boolean;
}

export const Modal: React.FC<ModalProps> = ({
    isOpen,
    onClose,
    onConfirm,
    title,
    message,
    confirmText = 'Confirm',
    cancelText = 'Cancel',
    type = 'info',
    isLoading = false
}) => {
    useEffect(() => {
        const handleEscape = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
        };
        if (isOpen) document.addEventListener('keydown', handleEscape);
        return () => document.removeEventListener('keydown', handleEscape);
    }, [isOpen, onClose]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm transition-opacity"
                onClick={isLoading ? undefined : onClose}
            />

            {/* Modal Content */}
            <div className="relative w-full max-w-md bg-slate-900 border border-slate-800 rounded-xl shadow-2xl transform transition-all animate-in fade-in zoom-in-95 duration-200">
                <div className="p-6 space-y-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            {type === 'danger' && (
                                <div className="p-2 rounded-full bg-red-500/10 text-red-500">
                                    <AlertTriangle className="w-5 h-5" />
                                </div>
                            )}
                            <h3 className="text-lg font-semibold text-white">{title}</h3>
                        </div>
                        <button
                            onClick={onClose}
                            disabled={isLoading}
                            className="text-slate-500 hover:text-slate-400 disabled:opacity-50 transition-colors"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>

                    <p className="text-slate-400 leading-relaxed">
                        {message}
                    </p>

                    <div className="flex items-center justify-end gap-3 mt-6">
                        <button
                            onClick={onClose}
                            disabled={isLoading}
                            className="px-4 py-2 text-sm font-medium text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors disabled:opacity-50"
                        >
                            {cancelText}
                        </button>
                        <button
                            onClick={onConfirm}
                            disabled={isLoading}
                            className={`px-4 py-2 text-sm font-medium text-white rounded-lg transition-colors disabled:opacity-50 flex items-center gap-2 ${type === 'danger'
                                    ? 'bg-red-600 hover:bg-red-500 shadow-lg shadow-red-500/20'
                                    : 'bg-indigo-600 hover:bg-indigo-500 shadow-lg shadow-indigo-500/20'
                                }`}
                        >
                            {isLoading && <span className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />}
                            {confirmText}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};
