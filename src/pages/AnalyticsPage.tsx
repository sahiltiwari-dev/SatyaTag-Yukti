import React, { useState } from 'react';
import { BarChart3, TrendingUp, PieChart as PieIcon, MapPin, AlertTriangle } from 'lucide-react';
import { PageHeader } from '../components/common/PageHeader';
import { Card } from '../components/common/Button';
import { DemoTag } from '../components/common/StatusBadge';
import { useDemo } from '../context/DemoContext';

const dateRanges = [
  { key: '1m', label: '1 Month' },
  { key: '3m', label: '3 Months' },
  { key: '6m', label: '6 Months' },
  { key: '1y', label: '1 Year' },
];

const AnalyticsPage: React.FC = () => {
  const [dateRange, setDateRange] = useState('6m');
  const { allInspections } = useDemo();

  const compliant = allInspections.filter((i) => i.officerDecision === 'COMPLIANT').length;
  const review = allInspections.filter((i) => i.officerDecision === 'MANUAL REVIEW' || i.officerDecision === 'Pending').length;
  const nonCompliant = allInspections.filter((i) => i.officerDecision === 'NON-COMPLIANT').length;
  const total = allInspections.length || 1;
  const complianceRate = Math.round((compliant / total) * 100);
  const pct = (n: number) => Math.round((n / total) * 100);

  const monthLabels = ['Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep'];
  const trendData = monthLabels.map((m) => allInspections.filter((i) => i.createdAt.includes(m)).length);
  const trendMax = Math.max(...trendData, 1);

  const catCounts = new Map<string, number>();
  allInspections.forEach((i) => catCounts.set(i.product.category, (catCounts.get(i.product.category) || 0) + 1));
  const categoryData = [...catCounts.entries()].map(([label, value]) => ({ label, value: Math.round((value / total) * 100) }));

  const findingCounts = new Map<string, number>();
  allInspections.forEach((i) => i.findings.forEach((f) => findingCounts.set(f.title, (findingCounts.get(f.title) || 0) + 1)));
  const topFindings = [...findingCounts.entries()]
    .map(([title, count]) => ({ title, count, severity: count >= 2 ? 'HIGH' : 'MEDIUM' }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  const locCounts = new Map<string, { inspections: number; violations: number }>();
  allInspections.forEach((i) => {
    const loc = i.location.split(',')[0].trim();
    const cur = locCounts.get(loc) || { inspections: 0, violations: 0 };
    cur.inspections += 1;
    if (i.officerDecision === 'NON-COMPLIANT') cur.violations += 1;
    locCounts.set(loc, cur);
  });
  const locationData = [...locCounts.entries()].map(([location, v]) => ({ location, ...v }));

  const statusData = [
    { label: 'Compliant', value: pct(compliant), color: 'bg-compliant-500' },
    { label: 'Manual Review', value: pct(review), color: 'bg-warning-500' },
    { label: 'Non-Compliant', value: pct(nonCompliant), color: 'bg-violation-500' },
  ];

  return (
    <div className="space-y-5 animate-[fadeIn_0.3s_ease-out]">
      <PageHeader title="Analytics Dashboard" subtitle="Compliance insights and trends" icon={BarChart3} />
      <DemoTag label="DEMO ANALYTICS" className="w-fit" />
      <div className="flex gap-1.5">
        {dateRanges.map((r) => (
          <button key={r.key} onClick={() => setDateRange(r.key)}
            className={`rounded-button px-3 py-1.5 text-xs font-medium transition-colors ${dateRange === r.key ? 'bg-govblue-600 text-white' : 'border border-slate-200 bg-white text-slate-600 hover:bg-slate-50'}`}>
            {r.label}
          </button>
        ))}
      </div>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Kpi label="Total Inspections" value={`${allInspections.length}`} sub="All records" tone="text-navy-900" />
        <Kpi label="Compliance Rate" value={`${complianceRate}%`} tone="text-compliant-600" />
        <Kpi label="Manual Reviews" value={`${review}`} sub={`${pct(review)}%`} tone="text-warning-600" />
        <Kpi label="Potential Violations" value={`${nonCompliant}`} sub={`${pct(nonCompliant)}%`} tone="text-violation-600" />
      </div>
      <Card title="Status Distribution" subtitle="All inspections">
        <div className="space-y-3">
          {statusData.map((s) => (
            <div key={s.label}>
              <div className="mb-1 flex justify-between text-xs">
                <span className="font-medium text-navy-900">{s.label}</span>
                <span className="text-slate-500">{s.value}%</span>
              </div>
              <div className="h-2.5 w-full rounded-full bg-slate-100">
                <div className={`h-2.5 rounded-full ${s.color} transition-all duration-500`} style={{ width: `${s.value}%` }} />
              </div>
            </div>
          ))}
        </div>
      </Card>
      <Card title="Inspection Trend" subtitle="Inspections per month">
        <div className="flex h-32 items-end gap-3">
          {trendData.map((v, i) => (
            <div key={i} className="flex flex-1 flex-col items-center gap-1">
              <div className="flex w-full flex-1 items-end">
                <div className="w-full rounded-t-md bg-govblue-500 transition-all duration-500 hover:bg-govblue-600" style={{ height: `${(v / trendMax) * 100}%` }} />
              </div>
              <span className="text-[9px] text-slate-500">{monthLabels[i]}</span>
            </div>
          ))}
        </div>
      </Card>
      <Card title="Category Breakdown" subtitle="Inspections by product category" icon={PieIcon}>
        <div className="flex items-center gap-4">
          <div className="relative h-32 w-32 shrink-0">
            <svg viewBox="0 0 36 36" className="h-32 w-32 -rotate-90">
              <circle cx="18" cy="18" r="15.9" fill="none" stroke="#e2e8f0" strokeWidth="6" />
              {categoryData.slice(0, 5).map((c, idx) => {
                const colors = ['#1d4ed8', '#10b981', '#f59e0b', '#94a3b8', '#ef4444'];
                const offset = categoryData.slice(0, idx).reduce((sum, prev) => sum + prev.value, 0);
                return c.value > 0 ? (
                  <circle key={c.label} cx="18" cy="18" r="15.9" fill="none" stroke={colors[idx % colors.length]} strokeWidth="6" strokeDasharray={`${c.value} 100`} strokeDashoffset={-offset} />
                ) : null;
              })}
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-sm font-bold text-navy-900">{allInspections.length}</span>
            </div>
          </div>
          <div className="flex-1 space-y-1.5">
            {categoryData.slice(0, 5).map((c) => (
              <div key={c.label} className="flex items-center justify-between text-xs">
                <span className="text-slate-600">{c.label}</span>
                <span className="font-medium text-navy-900">{c.value}%</span>
              </div>
            ))}
          </div>
        </div>
      </Card>
      <Card title="Top Findings" subtitle="Most common compliance issues" icon={AlertTriangle}>
        <div className="space-y-2">
          {topFindings.length === 0 && <p className="text-xs text-slate-500">No findings recorded yet.</p>}
          {topFindings.map((f, i) => (
            <div key={f.title} className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2">
              <div className="flex items-center gap-2">
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-govblue-100 text-[10px] font-bold text-govblue-700">{i + 1}</span>
                <span className="text-xs text-navy-900">{f.title}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className={`rounded px-1.5 py-0.5 text-[9px] font-semibold ${f.severity === 'HIGH' ? 'bg-violation-100 text-violation-700' : 'bg-warning-100 text-warning-700'}`}>{f.severity}</span>
                <span className="text-xs font-semibold text-navy-900">{f.count}</span>
              </div>
            </div>
          ))}
        </div>
      </Card>
      <Card title="Location Performance" subtitle="Violations across locations" icon={MapPin}>
        <div className="space-y-2">
          {locationData.map((l) => (
            <div key={l.location} className="flex items-center justify-between">
              <span className="w-24 text-xs text-navy-900">{l.location}</span>
              <div className="flex-1">
                <div className="flex gap-0.5">
                  {Array.from({ length: Math.max(l.inspections, 1) }).map((_, i) => (
                    <div key={i} className={`h-2 flex-1 rounded-sm ${i < l.violations ? 'bg-violation-400' : 'bg-compliant-300'}`} />
                  ))}
                </div>
              </div>
              <div className="flex w-32 justify-end gap-3 text-[10px] text-slate-500">
                <span>{l.inspections} insp.</span>
                <span className="text-violation-600">{l.violations} viol.</span>
              </div>
            </div>
          ))}
        </div>
      </Card>
      <Card>
        <div className="flex items-center gap-2 text-xs text-slate-500">
          <TrendingUp className="h-4 w-4 text-compliant-600" />
          <span>Based on <span className="font-semibold text-navy-900">{allInspections.length}</span> inspection records in the demo repository.</span>
        </div>
      </Card>
    </div>
  );
};

const Kpi: React.FC<{ label: string; value: string; sub?: string; tone: string }> = ({ label, value, sub, tone }) => (
  <Card padded className="text-center">
    <p className={`text-2xl font-bold ${tone}`}>{value}</p>
    <p className="text-[11px] text-slate-500">{label}</p>
    {sub && <p className="text-[10px] text-slate-400">{sub}</p>}
  </Card>
);

export default AnalyticsPage;
