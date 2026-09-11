import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Camera, Search, BarChart3, BookOpen, ChevronRight, Clock, AlertTriangle, CheckCircle2, XCircle, MapPin, ShieldCheck, TrendingUp } from 'lucide-react';
import { Card } from '../components/common/Button';
import { StatusBadge, DemoTagSubtle } from '../components/common/StatusBadge';
import { useDemo } from '../context/DemoContext';

const DashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const { inspection, officer, allInspections } = useDemo();

  const compliant = allInspections.filter((i) => i.status === 'Compliant' || i.officerDecision === 'COMPLIANT').length;
  const review = allInspections.filter((i) => i.status === 'Manual Review' || i.status === 'Under Review' || i.officerDecision === 'MANUAL REVIEW').length;
  const nonCompliant = allInspections.filter((i) => i.status === 'Non-Compliant' || i.officerDecision === 'NON-COMPLIANT').length;
  const total = allInspections.length || 1;
  const pctOf = (n: number) => Math.round((n / total) * 100);

  const stats = [
    { label: 'Total Inspections', value: allInspections.length, sub: 'All records', icon: Clock, color: 'text-govblue-600', bg: 'bg-govblue-50' },
    { label: 'Compliant', value: compliant, sub: `${pctOf(compliant)}%`, icon: CheckCircle2, color: 'text-compliant-600', bg: 'bg-compliant-50' },
    { label: 'Manual Review', value: review, sub: `${pctOf(review)}%`, icon: AlertTriangle, color: 'text-warning-600', bg: 'bg-warning-50' },
    { label: 'Non-Compliant', value: nonCompliant, sub: `${pctOf(nonCompliant)}%`, icon: XCircle, color: 'text-violation-600', bg: 'bg-violation-50' },
  ];

  const quickActions = [
    { label: 'Scan Product', icon: Camera, onClick: () => navigate('/inspection/new') },
    { label: 'Search Records', icon: Search, onClick: () => navigate('/inspections') },
    { label: 'View Analytics', icon: BarChart3, onClick: () => navigate('/analytics') },
    { label: 'Guidelines', icon: BookOpen, onClick: () => navigate('/rules') },
  ];

  const activeInspection =
    inspection.stage !== 'IDLE' && inspection.officerDecision === 'Pending'
      ? { status: 'In Progress', note: `Currently at ${inspection.stage.replace(/_/g, ' ').toLowerCase()}` }
      : inspection.officerDecision !== 'Pending'
        ? { status: inspection.officerDecision, note: inspection.decisionDate || 'Decision recorded' }
        : null;

  return (
    <div className="space-y-5 animate-[fadeIn_0.3s_ease-out]">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-navy-900 md:text-2xl">Good Morning, {officer.name.split(' ')[0]}!</h1>
          <p className="text-sm text-slate-500">Together for Fair Markets and Stronger Consumers</p>
        </div>
        <div className="flex items-center gap-3 rounded-card border border-slate-200 bg-white px-4 py-2.5 shadow-card">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-navy-800 text-sm font-bold text-white">{officer.avatarInitials}</div>
          <div>
            <p className="text-xs font-semibold text-navy-900">{officer.name}</p>
            <p className="flex items-center gap-1 text-[10px] text-slate-500"><MapPin className="h-3 w-3" />{officer.jurisdiction}</p>
            <p className="text-[10px] text-slate-500">{officer.department}</p>
          </div>
        </div>
      </div>

      <div className="relative overflow-hidden rounded-card bg-gradient-to-br from-navy-800 to-navy-900 p-6 text-white shadow-lg">
        <div className="relative z-10 flex items-start justify-between">
          <div>
            <p className="mb-1 flex items-center gap-2 text-xs font-medium text-govblue-200">
              <ShieldCheck className="h-3.5 w-3.5" /> AI-assisted packaged commodity compliance
            </p>
            <h2 className="mb-3 text-lg font-bold">SatyaTag Enforcement</h2>
            <button onClick={() => navigate('/inspection/new')}
              className="flex items-center gap-2 rounded-button bg-govblue-500 px-5 py-2.5 text-sm font-semibold text-white shadow transition-colors hover:bg-govblue-400">
              <Plus className="h-4 w-4" /> Start New Inspection
            </button>
          </div>
          <div className="hidden text-6xl opacity-20 md:block">📦</div>
        </div>
        <div className="absolute -bottom-4 -right-4 h-32 w-32 rounded-full bg-govblue-400/10" />
        <div className="absolute -top-6 -right-6 h-24 w-24 rounded-full bg-compliant-400/10" />
      </div>

      {activeInspection && (
        <div className="rounded-card border border-govblue-100 bg-govblue-50/60 p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-3">
              {activeInspection.status === 'COMPLIANT' ? <CheckCircle2 className="h-5 w-5 text-compliant-600" /> : activeInspection.status === 'NON-COMPLIANT' ? <XCircle className="h-5 w-5 text-violation-600" /> : <AlertTriangle className="h-5 w-5 text-warning-600" />}
              <div>
                <p className="text-sm font-semibold text-navy-900">Current Inspection: {inspection.inspectionId}</p>
                <p className="text-xs text-slate-500">{inspection.product.name} · {activeInspection.note}</p>
              </div>
            </div>
            <div className="flex gap-2">
              <ButtonSm onClick={() => navigate(`/inspection/${inspection.inspectionId}/result`)}>Open</ButtonSm>
              <ButtonSm outline onClick={() => navigate(`/inspection/${inspection.inspectionId}/report`)}>Report</ButtonSm>
            </div>
          </div>
        </div>
      )}

      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-navy-900">This Month</h2>
        <DemoTagSubtle />
      </div>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {stats.map((s) => (
          <Card key={s.label} padded className="!p-4">
            <div className="flex items-start justify-between">
              <p className="text-xs font-medium text-slate-500">{s.label}</p>
              <div className={`rounded-lg ${s.bg} p-1.5`}><s.icon className={`h-4 w-4 ${s.color}`} /></div>
            </div>
            <p className="mt-2 text-2xl font-bold text-navy-900">{s.value}</p>
            <p className="text-xs text-slate-500">{s.sub}</p>
          </Card>
        ))}
      </div>

      <Card title="Compliance Overview" subtitle="Distribution across determinations" icon={ShieldCheck}>
        <div className="space-y-3">
          <OverviewBar label="Compliant" pct={pctOf(compliant)} color="bg-compliant-500" text="text-compliant-700" />
          <OverviewBar label="Manual Review" pct={pctOf(review)} color="bg-warning-500" text="text-warning-700" />
          <OverviewBar label="Non-Compliant" pct={pctOf(nonCompliant)} color="bg-violation-500" text="text-violation-700" />
        </div>
      </Card>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <Card title="Recent Inspections" subtitle="Latest enforcement activity" actions={<button onClick={() => navigate('/inspections')} className="text-xs font-medium text-govblue-600 hover:text-govblue-700">View All</button>}>
            <div className="space-y-2">
              {allInspections.slice(-6).reverse().map((ri) => (
                <button key={ri.id} onClick={() => navigate(`/inspection/${ri.inspectionId}/result`)}
                  className="flex w-full items-center gap-3 rounded-button border border-slate-100 px-3.5 py-3 text-left transition-colors hover:bg-slate-50">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-navy-50 text-xl">📦</span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-navy-900">{ri.product.name}</p>
                    <div className="flex items-center gap-2 text-xs text-slate-500">
                      <span>{ri.product.category}</span><span>·</span><span>{ri.decisionDate || ri.createdAt}</span>
                    </div>
                  </div>
                  <StatusBadge status={ri.status} small />
                </button>
              ))}
            </div>
          </Card>
        </div>
        <div className="space-y-4">
          <div>
            <h2 className="mb-3 text-sm font-semibold text-navy-900">Quick Actions</h2>
            <div className="grid grid-cols-2 gap-3">
              {quickActions.map((qa) => (
                <button key={qa.label} onClick={qa.onClick}
                  className="flex flex-col items-center gap-2 rounded-card border border-slate-200 bg-white px-4 py-5 shadow-card transition-all hover:shadow-card-hover">
                  <qa.icon className="h-6 w-6 text-govblue-600" />
                  <span className="text-xs font-medium text-slate-700">{qa.label}</span>
                </button>
              ))}
            </div>
          </div>

          <Card title="Trends" subtitle="Inspections over last 7 months" icon={TrendingUp}>
            <div className="flex items-end justify-between gap-1" style={{ height: '80px' }}>
              {[14, 19, 24, 22, 27, 31, 26].map((v, i) => (
                <div key={i} className="flex flex-1 flex-col items-center gap-1">
                  <div className="w-full rounded-t bg-govblue-500" style={{ height: `${(v / 31) * 100}%` }} />
                  <span className="text-[8px] text-slate-400">{['J', 'F', 'M', 'A', 'M', 'J', 'J'][i]}</span>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>

      <div className="rounded-card border border-govblue-100 bg-govblue-50/50 p-4">
        <div className="flex items-start gap-3">
          <BookOpen className="mt-0.5 h-5 w-5 shrink-0 text-govblue-500" />
          <div>
            <p className="text-sm font-medium text-navy-900">Legal Metrology reminder: Ensure all mandatory declarations are clearly visible and readable.</p>
            <p className="text-xs text-slate-500">As per applicable Legal Metrology requirements</p>
            <button onClick={() => navigate('/rules')}
              className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-govblue-600 hover:text-govblue-700">
              View Guidelines <ChevronRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

const ButtonSm: React.FC<{ children: React.ReactNode; onClick?: () => void; outline?: boolean }> = ({ children, onClick, outline }) => (
  <button onClick={onClick} className={`rounded-button px-3 py-1.5 text-xs font-semibold transition-colors ${outline ? 'border border-govblue-200 bg-white text-govblue-700 hover:bg-govblue-50' : 'bg-govblue-600 text-white hover:bg-govblue-700'}`}>{children}</button>
);

const OverviewBar: React.FC<{ label: string; pct: number; color: string; text: string }> = ({ label, pct, color, text }) => (
  <div>
    <div className="mb-1 flex items-center justify-between text-xs">
      <span className="font-medium text-navy-900">{label}</span>
      <span className={text}>{pct}%</span>
    </div>
    <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
      <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
    </div>
  </div>
);

export default DashboardPage;