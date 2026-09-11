import React from 'react';
import { Check, AlertTriangle, X, Info } from 'lucide-react';

interface ToastProps {
  message: string;
  type?: 'success' | 'info' | 'warning' | 'error';
  visible: boolean;
  onClose?: () => void;
}

export const Toast: React.FC<ToastProps> = ({ message, type = 'success', visible, onClose }) => {
  const config = {
    success: { icon: Check, bg: 'bg-compliant-50 border-compliant-200 text-compliant-800', color: 'text-compliant-600' },
    info: { icon: Info, bg: 'bg-govblue-50 border-govblue-200 text-govblue-800', color: 'text-govblue-600' },
    warning: { icon: AlertTriangle, bg: 'bg-warning-50 border-warning-200 text-warning-800', color: 'text-warning-600' },
    error: { icon: X, bg: 'bg-violation-50 border-violation-200 text-violation-800', color: 'text-violation-600' },
  }[type];

  const Icon = config.icon;

  return (
    <div
      className={`fixed bottom-24 left-1/2 z-[100] w-[calc(100%-2rem)] max-w-sm -translate-x-1/2 rounded-card border px-4 py-3 shadow-lg transition-all duration-300 md:bottom-8 ${config.bg} ${visible ? 'translate-y-0 opacity-100' : 'pointer-events-none translate-y-4 opacity-0'}`}
      role="status"
    >
      <div className="flex items-start gap-3">
        <Icon className={`mt-0.5 h-5 w-5 shrink-0 ${config.color}`} />
        <p className="flex-1 text-sm font-medium">{message}</p>
        {onClose && (
          <button onClick={onClose} className="shrink-0 text-slate-400 hover:text-slate-600" aria-label="Close">
            <X className="h-4 w-4" />
          </button>
        )}
      </div>
    </div>
  );
};
