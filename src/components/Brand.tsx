import React from 'react';

export const SatyaTagLogo: React.FC<{ size?: 'sm' | 'md' | 'lg' }> = ({ size = 'md' }) => {
  const textSize = size === 'lg' ? 'text-3xl' : size === 'md' ? 'text-2xl' : 'text-lg';
  const tagLine = size === 'lg' ? 'text-sm' : size === 'md' ? 'text-xs' : 'text-[10px]';
  return (
    <div className="flex flex-col items-start">
      <div className="flex items-center gap-2">
        <svg width={size === 'lg' ? 34 : size === 'md' ? 28 : 22} height={size === 'lg' ? 34 : size === 'md' ? 28 : 22} viewBox="0 0 32 32" aria-hidden="true">
          <rect width="32" height="32" rx="8" fill="#0d1524"/>
          <text x="6" y="22" fontFamily="system-ui" fontWeight="700" fontSize="15" fill="#3b82f6">S</text>
          <circle cx="24" cy="8" r="4" fill="#22c55e"/>
        </svg>
        <span className={`font-bold tracking-tight ${textSize}`}>
          <span className="text-navy-900">Satya</span>
          <span className="text-compliant-600">Tag</span>
          <svg className="ml-1 inline-block h-3 w-3" viewBox="0 0 24 24" fill="#22c55e" aria-hidden="true">
            <path d="M12 2C7 4 3 9 3 14c0 4.4 4 8 9 8s9-3.6 9-8c0-5-4-10-9-12zm-1 15-2.5-2.5L10 13l1 1 3-3 1.5 1.5L11 17z"/>
          </svg>
        </span>
      </div>
      <span className={`${tagLine} mt-0.5 font-medium text-slate-500`}>AI-Assisted Compliance for Packaged Commodities</span>
    </div>
  );
};

export const GovHeader: React.FC<{ compact?: boolean }> = ({ compact }) => (
  <div className={`flex items-center gap-2 ${compact ? '' : 'mb-1'}`}>
    <svg width="22" height="22" viewBox="0 0 24 24" fill="#64748b" aria-hidden="true">
      <circle cx="12" cy="12" r="9" fill="none" stroke="#64748b" strokeWidth="1.5"/>
      <circle cx="12" cy="8.5" r="2.5" fill="#64748b"/>
      <path d="M12 11v5.5" stroke="#64748b" strokeWidth="1.5"/>
      <path d="M8.5 14h7" stroke="#64748b" strokeWidth="1.2"/>
    </svg>
    <div>
      <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">Department of Consumer Affairs</p>
      <p className="text-[10px] text-slate-500">Government of India</p>
    </div>
  </div>
);
