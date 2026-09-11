import { LucideIcon } from 'lucide-react';
import React from 'react';

interface ButtonProps {
  children: React.ReactNode;
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger' | 'success';
  size?: 'sm' | 'md' | 'lg';
  icon?: LucideIcon;
  fullWidth?: boolean;
  disabled?: boolean;
  className?: string;
  onClick?: () => void;
  type?: 'button' | 'submit';
  loading?: boolean;
}

const variants: Record<string, string> = {
  primary: 'bg-govblue-600 text-white hover:bg-govblue-700 disabled:bg-slate-300 disabled:text-slate-500',
  secondary: 'bg-navy-50 text-navy-800 hover:bg-navy-100 disabled:opacity-50',
  outline: 'border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 disabled:opacity-50',
  ghost: 'text-slate-600 hover:bg-slate-100',
  danger: 'bg-violation-600 text-white hover:bg-violation-700 disabled:opacity-50',
  success: 'bg-compliant-600 text-white hover:bg-compliant-700 disabled:opacity-50',
};

const sizes: Record<string, string> = {
  sm: 'px-3 py-1.5 text-xs',
  md: 'px-4 py-2.5 text-sm',
  lg: 'px-6 py-3 text-base',
};

export const Button: React.FC<ButtonProps> = ({
  children, variant = 'primary', size = 'md', icon: Icon, fullWidth, disabled, className = '', onClick, type = 'button', loading,
}) => {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled || loading}
      className={`inline-flex items-center justify-center gap-2 rounded-button font-semibold transition-all focus:outline-none focus:ring-2 focus:ring-govblue-400 focus:ring-offset-2 active:scale-[0.98] disabled:cursor-not-allowed ${variants[variant]} ${sizes[size]} ${fullWidth ? 'w-full' : ''} ${className}`}
    >
      {loading ? (
        <svg className={`animate-spin ${size === 'lg' ? 'h-5 w-5' : 'h-4 w-4'}`} viewBox="0 0 24 24" fill="none">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
      ) : Icon && <Icon className={`${size === 'lg' ? 'h-5 w-5' : 'h-4 w-4'}`} />}
      {children}
    </button>
  );
};

interface CardProps {
  title?: React.ReactNode;
  subtitle?: React.ReactNode;
  actions?: React.ReactNode;
  icon?: LucideIcon;
  children: React.ReactNode;
  className?: string;
  padded?: boolean;
}

export const Card: React.FC<CardProps> = ({ title, subtitle, actions, icon: Icon, children, className = '', padded = true }) => {
  return (
    <div className={`rounded-card border border-slate-200 bg-white shadow-card ${className}`}>
      {(title || actions) && (
        <div className="flex items-start justify-between gap-3 px-5 pt-4">
          <div className="flex items-center gap-2">
            {Icon && <Icon className="h-4 w-4 text-govblue-500" />}
            <div>
              {title && <h3 className="text-sm font-semibold text-navy-900">{title}</h3>}
              {subtitle && <p className="mt-0.5 text-xs text-slate-500">{subtitle}</p>}
            </div>
          </div>
          {actions}
        </div>
      )}
      <div className={padded ? 'p-5' : ''}>{children}</div>
    </div>
  );
};
