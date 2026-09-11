import React from 'react';

interface StatusBadgeProps {
  status: string;
  small?: boolean;
}

const statusStyles: Record<string, string> = {
  'COMPLIANT': 'bg-compliant-50 text-compliant-700 border-compliant-200',
  'Compliant': 'bg-compliant-50 text-compliant-700 border-compliant-200',
  'PASS': 'bg-compliant-50 text-compliant-700 border-compliant-200',
  'Verified': 'bg-compliant-50 text-compliant-700 border-compliant-200',
  'RUNNING': 'bg-govblue-50 text-govblue-700 border-govblue-200',
  'REVIEW': 'bg-warning-50 text-warning-700 border-warning-200',
  'Under Review': 'bg-warning-50 text-warning-700 border-warning-200',
  'Manual Review': 'bg-warning-50 text-warning-700 border-warning-200',
  'MANUAL REVIEW': 'bg-warning-50 text-warning-700 border-warning-200',
  'Needs Review': 'bg-warning-50 text-warning-700 border-warning-200',
  'VIOLATION': 'bg-violation-50 text-violation-700 border-violation-200',
  'Potential Violation': 'bg-violation-50 text-violation-700 border-violation-200',
  'Non-Compliant': 'bg-violation-50 text-violation-700 border-violation-200',
  'Non-Compliant (Potential)': 'bg-violation-50 text-violation-700 border-violation-200',
  'NON-COMPLIANT': 'bg-violation-50 text-violation-700 border-violation-200',
  'Confirmed': 'bg-compliant-50 text-compliant-700 border-compliant-200',
  'Not Established': 'bg-slate-50 text-slate-700 border-slate-200',
  'Pending': 'bg-slate-100 text-slate-700 border-slate-200',
  'Active': 'bg-compliant-50 text-compliant-700 border-compliant-200',
  'Draft': 'bg-slate-100 text-slate-600 border-slate-200',
  'In Progress': 'bg-govblue-50 text-govblue-700 border-govblue-200',
  'DEMO_RULE': 'bg-slate-100 text-slate-700 border-slate-300',
  'CURRENT': 'bg-compliant-50 text-compliant-700 border-compliant-200',
  'SCHEDULED': 'bg-govblue-50 text-govblue-700 border-govblue-200',
  'SUPERSEDED': 'bg-slate-100 text-slate-600 border-slate-300',
  'MAJOR': 'bg-violation-50 text-violation-700 border-violation-200',
  'MINOR': 'bg-warning-50 text-warning-700 border-warning-200',
  'INFO': 'bg-govblue-50 text-govblue-700 border-govblue-200',
  'GOOD': 'bg-compliant-50 text-compliant-700 border-compliant-200',
  'Good': 'bg-compliant-50 text-compliant-700 border-compliant-200',
  'Acceptable': 'bg-warning-50 text-warning-700 border-warning-200',
  'Poor': 'bg-violation-50 text-violation-700 border-violation-200',
  'Completed': 'bg-compliant-50 text-compliant-700 border-compliant-200',
  'Uploaded': 'bg-compliant-50 text-compliant-700 border-compliant-200',
  'Optional': 'bg-slate-100 text-slate-600 border-slate-200',
};

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, small }) => {
  const cls = statusStyles[status] || 'bg-slate-100 text-slate-700 border-slate-200';
  return (
    <span
      className={`inline-flex items-center rounded-full border font-medium ${small ? 'px-2 py-0.5 text-[11px]' : 'px-2.5 py-0.5 text-xs'} ${cls}`}
    >
      {status}
    </span>
  );
};

export const DemoTag: React.FC<{ label?: string; className?: string }> = ({ label = 'DEMO', className }) => (
  <span className={`inline-flex items-center gap-1 rounded-md bg-navy-800 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white ${className || ''}`}>
    <span className="h-1.5 w-1.5 rounded-full bg-warning-400" />
    {label}
  </span>
);

export const DemoTagSubtle: React.FC<{ label?: string }> = ({ label = 'DEMO DATA' }) => (
  <span className="inline-flex items-center gap-1 rounded border border-dashed border-slate-300 bg-slate-50 px-1.5 py-0.5 text-[10px] font-medium text-slate-500">
    {label}
  </span>
);
