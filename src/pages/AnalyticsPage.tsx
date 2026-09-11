import React, { useEffect, useState } from 'react';
import { BarChart3, TrendingUp, PieChart as PieIcon, MapPin, AlertTriangle } from 'lucide-react';
import { PageHeader } from '../components/common/PageHeader';
import { Card } from '../components/common/Button';
import { DemoTag } from '../components/common/StatusBadge';
import { useDemo } from '../context/DemoContext';
import { useAuth } from '../context/AuthContext';
import * as platform from '../services/platform';

const dateRanges = [
  { key: '1m', label: '1 Month', days: 30 },
  { key: '3m', label: '3 Months', days: 90 },
  { key: '6m', label: '6 Months', days: 180 },
  { key: '1y', label: '1 Year', days: 365 },
];

const AnalyticsPage: React.FC = () => {
  const [dateRange, setDateRange] = useState('6m');
  const { allInspections } = useDemo();
  const { isAuthenticated } = useAuth();
  const [backendData, setBackendData] = useState<platform.AnalyticsOverview | null>(null);

  const days = dateRanges.find((r) => r.key === dateRange)?.days || 180;
  useEffect(() => {
    if (!isAuthenticated) return;
    platform.getAnalytics(days).then(setBackendData).catch(() => setBackendData(null));
  }, [isAuthenticated, days]);

  const compliant = backendData?.compliant ?? allInspections.filter((i) => i.officerDecision === 'COMPLIANT').length;
  const review = backendData?.manual_reviews ?? allInspections.filter((i) => i.officerDecision === 'MANUAL REVIEW' || i.officerDecision === 'Pending').length;
  const nonCompliant = backendData?.potential_violations ?? allInspections.filter((i) => i.officerDecision === 'NON-COMPLIANT').length;
  const total = backendData?.total_inspections ?? (allInspections.length || 1);
  const complianceRate = backendData?.compliance_rate ?? Math.round((compliant / total) * 100);
  const pct = (n: number) => Math.round((n / total) * 100);

  const monthLabels = ['Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep'];
  const trendData = monthLabels.map((m) => allInspections.filter((i) => i.createdAt.includes(m)).length);
  const trendMax = Math.max(...trendData, 1);

  const statusByDecision = (label: string) =>
    backendData?.status_distribution?.find((s) => s.label === label)?.value ?? 0;
  const statusData = [
    { label: 'Compliant', value: backendData ? statusByDecision('COMPLIANT') || Math.round((compliant / total) * 100) : pct(compliant), color: 'bg-compliant-500' },
    { label: 'Manual Review', value: backendData ? statusByDecision('MANUAL REVIEW') || statusByDecision('Manual Review') || Math.round((review / total) * 100) : pct(review), color: 'bg-warning-500' },
    { label: 'Non-Compliant', value: backendData ? statusByDecision('NON-COMPLIANT') || Math.round((nonCompliant / total) * 100) : pct(nonCompliant), color: 'bg-violation-500' },
  ];

  const catCounts = new Map<string, number>();
  allInspections.forEach((i) => catCounts.set(i.product.category, (catCounts.get(i.product.category) || 0) + 1));
  const categoryData = backendData?.category_distribution?.length
    ? backendData.category_distribution.slice(0, 5)
    : [...catCounts.entries()].map(([label, value]) => ({ label, value: Math.round((value / total) * 100) }));

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

  return (
    <div className="space-y-5 animate-[fadeIn_0.3s_ease-out]">
      <PageHeader title="Analytics Dashboard" subtitle="Compliance insights and trends" icon={BarChart3} />
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex gap-1.5">
          {dateRanges.map((r) => (
            <button key={r.key} onClick={() => setDateRange(r.key)}
              className={`rounded-button px-3 py-1.5 text-xs font-medium transition-colors ${dateRange === r.key ? 'bg-govblue-600 text-white' : 'border border-slate-200 bg-white text-slate-600 hover:bg-slate-50'}`}>
              {r.label}
            </button>
          ))}
        </div>
        {backendData ? (
          <DemoTag label="LIVE DATABASE DATA" className="w-fit ml-auto" />
        ) : (
          <DemoTag label="DEMO ANALYTICS" className="w-fit ml-auto" />
        )}
      </div>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Kpi label="Total Inspections" value={`${total}`} tone="text-navy-900" />
        <Kpi label="Compliance Rate" value={`${complianceRate}%`} tone="text-compliant-600" />
        <Kpi label="Manual Reviews" value={`${review}`} tone="text-warning-600" />
        <Kpi label="Potential Violations" value={`${nonCompliant}`} tone="text-violation-600" />
      </div>
<div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card title="Compliance Status" subtitle="Distribution across determinations" icon={PieIcon}>
          <div className="space-y-3">
            {statusData.map((s) => (
              <div key={s.label}>
                <div className="mb-1 flex items-center justify-between text-xs">
                  <span className="font-medium text-navy-900">{s.label}</span>
                  <span className="text-slate-500">{s.value}%</span>
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
                  <div className={`h-full rounded-full ${s.color}`} style={{ width: `${Math.min(s.value, 100)}%` }} />
                </div>
              </div>
            ))}
          </div>
        </Card>
        <Card title="Inspections Over Time" icon={TrendingUp}>
          <div className="flex items-end justify-between gap-1" style={{ height: '140px' }}>
            {monthLabels.map((m, i) => (
              <div key={m} title={`${m}: ${trendData[i]}`} className="flex flex-1 flex-col items-center gap-1">
                <div className="w-full rounded-t bg-govblue-500" style={{ height: `${Math.max((trendData[i] / trendMax) * 100, 4)}%` }} />
                <span className="text-[8px] text-slate-400">{m.slice(0, 1)}</span>
              </div>
            ))}
          </div>
        </Card>
        <Card title="Category Distribution" icon={BarChart3}>
          <div className="space-y-1.5">
            {categoryData.slice(0, 5).map((c) => (
              <div key={c.label} className="flex items-center justify-between text-xs">
                <span className="text-slate-600">{c.label}</span>
                <span className="font-medium text-navy-900">{c.value}{backendData ? '%' : ''}</span>
              </div>
            ))}
          </div>
        </Card>
      </div>
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
          {locationData.length === 0 && <p className="text-xs text-slate-500">No location data recorded.</p>}
          {locationData.map((l) => (
            <div key={l.location} className="flex items-center justify-between">
              <span className="w-24 truncate text-xs text-navy-900">{l.location}</span>
              <div className="flex-1 px-2">
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
          <span>Based on <span className="font-semibold text-navy-900">{total}</span> inspection records{backendData ? ' in the SATYATAG database' : ' in the demo repository'}. Analytics are informational.</span>
        </div>
      </Card>
    </div>
  );
};

const Kpi: React.FC<{ label: string; value: string; tone: string }> = ({ label, value, tone }) => (
  <Card padded className="text-center">
    <p className={`text-2xl font-bold ${tone}`}>{value}</p>
    <p className="text-[11px] text-slate-500">{label}</p>
  </Card>
);

export default AnalyticsPage;