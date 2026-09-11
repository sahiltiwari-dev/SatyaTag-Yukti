import React from 'react';
import { ArrowLeft, LucideIcon } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface PageHeaderProps {
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  backTo?: string;
  actions?: React.ReactNode;
  icon?: LucideIcon;
  stepLabel?: string;
}

export const PageHeader: React.FC<PageHeaderProps> = ({ title, subtitle, backTo, actions, icon: Icon, stepLabel }) => {
  const navigate = useNavigate();
  return (
    <div className="mb-5">
      {backTo && (
        <button
          onClick={() => navigate(backTo)}
          className="mb-3 inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 transition-colors hover:text-navy-900"
        >
          <ArrowLeft className="h-4 w-4" /> Back
        </button>
      )}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          {Icon && (
            <div className="mt-0.5 flex h-11 w-11 shrink-0 items-center justify-center rounded-card bg-govblue-50 text-govblue-600">
              <Icon className="h-6 w-6" />
            </div>
          )}
          <div>
            <h1 className="text-xl font-bold tracking-tight text-navy-900 md:text-2xl">{title}</h1>
            {subtitle && <p className="mt-1 text-sm text-slate-500">{subtitle}</p>}
            {stepLabel && <span className="mt-2 inline-block rounded bg-navy-50 px-2 py-0.5 text-[11px] font-medium text-navy-600">{stepLabel}</span>}
          </div>
        </div>
        {actions && <div className="flex items-center gap-2">{actions}</div>}
      </div>
    </div>
  );
};
