import React, { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { BookOpen, Clock, ShieldCheck, CheckCircle2, ChevronRight } from 'lucide-react';
import { PageHeader } from '../components/common/PageHeader';
import { Card, Button } from '../components/common/Button';
import { StatusBadge, DemoTag } from '../components/common/StatusBadge';
import { demoRules } from '../data/demoRules';

type Tab = 'overview' | 'requirements' | 'history' | 'references';

const tabs: { key: Tab; label: string }[] = [
  { key: 'overview', label: 'Overview' },
  { key: 'requirements', label: 'Requirements' },
  { key: 'history', label: 'Version History' },
  { key: 'references', label: 'References' },
];

const RuleDetailPage: React.FC = () => {
  const navigate = useNavigate();
  const { ruleId } = useParams();
  const [tab, setTab] = useState<Tab>('overview');
  const rule = demoRules.find((r) => r.id === ruleId) || demoRules[0];

  const relatedRules = demoRules
    .filter((r) => r.id !== rule.id && (r.category === rule.category || r.subcategory === rule.subcategory))
    .slice(0, 3);

  return (
    <div className="space-y-5 animate-[fadeIn_0.3s_ease-out]">
      <PageHeader title={rule.title} subtitle={`${rule.ruleId} · Version ${rule.version}`} icon={ShieldCheck} backTo="/rules" />
      <DemoTag label="DEMO RULE" className="w-fit" />

      <div className="flex items-center gap-2">
        <StatusBadge status={rule.status} small />
        <StatusBadge status={rule.severity} small />
        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-600">{rule.category}</span>
      </div>

      <div className="flex gap-1 border-b border-slate-200">
        {tabs.map((t) => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`border-b-2 px-3 py-2 text-sm font-medium transition-colors ${tab === t.key ? 'border-govblue-600 text-govblue-700' : 'border-transparent text-slate-500 hover:text-slate-700'}`}>
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'overview' && (
        <Card>
          <div className="space-y-3 text-sm">
            <p className="text-slate-600">{rule.description}</p>
            <div className="grid grid-cols-2 gap-3 pt-2">
              <InfoField label="Rule ID" value={rule.ruleId} />
              <InfoField label="Category" value={rule.category} />
              <InfoField label="Subcategory" value={rule.subcategory} />
              <InfoField label="Check Type" value={rule.checkType} />
              <InfoField label="Severity" value={rule.severity} />
              <InfoField label="Machine Checkable" value={rule.machineCheckable ? 'Yes' : 'No'} />
              <InfoField label="Effective From" value={rule.effectiveFrom} />
              <InfoField label="Status" value={rule.status} />
            </div>
          </div>
        </Card>
      )}

      {tab === 'requirements' && (
        <Card title="Compliance Requirements">
          <div className="space-y-3">
            <Requirement title="Declaration Required" desc={rule.description} />
            <Requirement title="Applicability" desc={rule.applicability} />
            <Requirement title="Machine Evaluation" desc={rule.machineCheckable ? 'This requirement can be evaluated automatically by SATYATAG AI using OCR evidence.' : 'This requirement requires manual officer verification.'} />
          </div>
        </Card>
      )}

      {tab === 'overview' && (
        <Card title="Applicability" subtitle="When this rule applies">
          <div className="rounded-lg bg-govblue-50 p-4">
            <p className="text-[10px] uppercase tracking-wide text-govblue-600">Applicability Scope</p>
            <p className="mt-1 text-sm font-medium text-navy-900">{rule.applicability}</p>
            <div className="mt-3 flex flex-wrap gap-2">
              <span className="rounded-full bg-govblue-100 px-2.5 py-1 text-[10px] font-medium text-govblue-700">Category: {rule.category}</span>
              <span className="rounded-full bg-govblue-100 px-2.5 py-1 text-[10px] font-medium text-govblue-700">Subcategory: {rule.subcategory}</span>
              <span className="rounded-full bg-govblue-100 px-2.5 py-1 text-[10px] font-medium text-govblue-700">Check: {rule.checkType}</span>
            </div>
          </div>
        </Card>
      )}

      {tab === 'history' && (
        <Card title="Version History">
          <div className="space-y-3">
            {['Demo 2026.1', 'Demo 2025.2', 'Demo 2025.1'].map((v, i) => (
              <div key={v} className={`flex items-center justify-between rounded-lg border p-3 ${i === 0 ? 'border-govblue-200 bg-govblue-50' : 'border-slate-200 bg-white'}`}>
                <div className="flex items-center gap-3">
                  <Clock className="h-4 w-4 text-slate-400" />
                  <div><p className="text-xs font-semibold text-navy-900">{v}</p><p className="text-[10px] text-slate-500">{i === 0 ? 'Current version' : 'Superseded'}</p></div>
                </div>
                {i === 0 ? <span className="rounded-full bg-compliant-100 px-2 py-0.5 text-[10px] font-medium text-compliant-700">Active</span> : <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] text-slate-500">Archived</span>}
              </div>
            ))}
          </div>
        </Card>
      )}

      {tab === 'references' && (
        <Card title="Source References">
          <div className="space-y-3 text-sm">
            {[
              { l: 'Authority', v: rule.sourceAuthority },
              { l: 'Reference', v: rule.sourceReference },
              { l: 'Effective Date', v: rule.effectiveFrom },
            ].map((f) => (
              <div key={f.l} className="rounded-lg bg-slate-50 p-3">
                <p className="text-[11px] text-slate-500">{f.l}</p>
                <p className="text-xs font-medium text-navy-900">{f.v}</p>
              </div>
            ))}
          </div>
        </Card>
      )}

      <Card title="Inspections using this rule">
        <div className="space-y-2">
          {[{ id: 'INSP-DEMO-2025-03-12-0017', status: 'REVIEW' }, { id: 'INSP-2026-0014', status: 'PASS' }].map((ins) => (
            <button key={ins.id} className="flex w-full items-center justify-between rounded-lg border border-slate-200 p-3 text-left transition-colors hover:bg-slate-50">
              <div><p className="text-xs font-medium text-navy-900">{ins.id}</p><p className="text-[10px] text-slate-500">Applied rule: {rule.ruleId}</p></div>
              <div className="flex items-center gap-2"><StatusBadge status={ins.status} small /><ChevronRight className="h-4 w-4 text-slate-400" /></div>
            </button>
          ))}
        </div>
      </Card>

      {relatedRules.length > 0 && (
        <Card title="Related Rules" subtitle={`Other rules in ${rule.category}`}>
          <div className="space-y-2">
            {relatedRules.map((r) => (
              <button key={r.id} onClick={() => navigate(`/rules/${r.id}`)}
                className="flex w-full items-center justify-between rounded-lg border border-slate-200 p-3 text-left transition-colors hover:bg-slate-50">
                <div>
                  <p className="text-xs font-medium text-navy-900">{r.title}</p>
                  <p className="text-[10px] text-slate-500">{r.ruleId} · {r.checkType}</p>
                </div>
                <ChevronRight className="h-4 w-4 text-slate-400" />
              </button>
            ))}
          </div>
        </Card>
      )}

      <Button variant="outline" icon={BookOpen} fullWidth onClick={() => navigate('/rules')}>Back to Rule Library</Button>
    </div>
  );
};

const InfoField: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <div className="rounded-lg bg-slate-50 p-3">
    <p className="text-[10px] uppercase tracking-wide text-slate-500">{label}</p>
    <p className="mt-0.5 text-xs font-semibold text-navy-900">{value}</p>
  </div>
);

const Requirement: React.FC<{ title: string; desc: string }> = ({ title, desc }) => (
  <div className="rounded-lg border border-slate-200 p-3">
    <p className="flex items-center gap-1.5 text-xs font-semibold text-navy-900"><CheckCircle2 className="h-3.5 w-3.5 text-compliant-500" /> {title}</p>
    <p className="mt-1 text-xs text-slate-600">{desc}</p>
  </div>
);

export default RuleDetailPage;