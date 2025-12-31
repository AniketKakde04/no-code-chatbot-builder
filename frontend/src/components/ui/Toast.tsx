import React, { useEffect } from 'react';
import { CheckCircle, AlertCircle, X } from 'lucide-react';

export type ToastType = 'success' | 'error';

interface ToastProps {
    message: string;
    type: ToastType;
    onClose: () => void;
    duration?: number;
}

export const Toast: React.FC<ToastProps> = ({ message, type, onClose, duration = 3000 }) => {
    useEffect(() => {
        const timer = setTimeout(() => {
            onClose();
        }, duration);

        return () => clearTimeout(timer);
    }, [duration, onClose]);

    return (
        <div className="fixed top-4 right-4 z-50 animate-in slide-in-from-right-full duration-300">
            <div className={`
                flex items-center gap-3 px-4 py-3 rounded-xl shadow-xl border backdrop-blur-md
                ${type === 'success'
                    ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                    : 'bg-red-500/10 border-red-500/20 text-red-400'
                }
            `}>
                {type === 'success' ? (
                    <CheckCircle className="w-5 h-5 shrink-0" />
                ) : (
                    <AlertCircle className="w-5 h-5 shrink-0" />
                )}

                <p className="text-sm font-medium pr-2">{message}</p>

                <button
                    onClick={onClose}
                    className={`p-1 rounded-full hover:bg-white/10 transition-colors`}
                >
                    <X className="w-4 h-4" />
                </button>
            </div>
        </div>
    );
};
