import React, { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { CheckCircle2, AlertTriangle, XCircle, ChevronRight, ChevronDown, ChevronUp, Fingerprint, Eye, BookOpen, Check, Image as ImageIcon } from 'lucide-react';
import { PageHeader } from '../components/common/PageHeader';
import { Card, Button } from '../components/common/Button';
import { StatusBadge, DemoTagSubtle } from '../components/common/StatusBadge';
import { useDemo } from '../context/DemoContext';

const ComplianceResultPage: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const { inspection: activeInspection, allInspections } = useDemo();
  const inspection = allInspections.find((i) => i.inspectionId === id) || activeInspection;
  const isSeeded = allInspections.some((i) => i.inspectionId === id);
  const [fingerprintOpen, setFingerprintOpen] = useState(false);
  const checks = inspection.complianceChecks;
  const passed = checks.filter((c) => c.status === 'PASS').length;
  const review = checks.filter((c) => c.status === 'REVIEW').length;
  const demoFindings = inspection.findings.length;

  const statusIcon = (s: string) => {
    if (s === 'PASS') return <CheckCircle2 className="h-5 w-5 text-compliant-500" />;
    if (s === 'REVIEW') return <AlertTriangle className="h-5 w-5 text-warning-500" />;
    if (s === 'VIOLATION') return <XCircle className="h-5 w-5 text-violation-500" />;
    return null;
  };

  return (
    <div className="space-y-5 animate-[fadeIn_0.3s_ease-out]">
      <PageHeader title="Compliance Result" subtitle={inspection.product.name} backTo={isSeeded ? '/inspections' : `/inspection/${id}/analyse`} stepLabel="View Result" />

      <div className={`rounded-card border-2 p-5 ${inspection.officerDecision === 'COMPLIANT' ? 'border-compliant-200 bg-compliant-50' : inspection.officerDecision === 'NON-COMPLIANT' ? 'border-violation-200 bg-violation-50' : 'border-warning-200 bg-warning-50'}`}>
        <div className="flex items-center gap-3">
          {inspection.officerDecision === 'COMPLIANT' ? (
            <CheckCircle2 className="h-8 w-8 text-compliant-500" />
          ) : inspection.officerDecision === 'NON-COMPLIANT' ? (
            <XCircle className="h-8 w-8 text-violation-500" />
          ) : (
            <AlertTriangle className="h-8 w-8 text-warning-500" />
          )}
          <div>
            <p className={`text-xs font-medium uppercase tracking-wide ${inspection.officerDecision === 'COMPLIANT' ? 'text-compliant-600' : inspection.officerDecision === 'NON-COMPLIANT' ? 'text-violation-600' : 'text-warning-600'}`}>Overall Status</p>
            <p className="text-xl font-bold text-navy-900">{inspection.officerDecision}</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Card padded className="!p-3 text-center"><p className="text-2xl font-bold text-navy-900">{checks.length}</p><p className="text-[11px] text-slate-500">Machine checks</p></Card>
        <Card padded className="!p-3 text-center"><p className="text-2xl font-bold text-compliant-600">{passed}</p><p className="text-[11px] text-slate-500">Passed</p></Card>
        <Card padded className="!p-3 text-center"><p className="text-2xl font-bold text-warning-600">{review}</p><p className="text-[11px] text-slate-500">Review</p></Card>
        <Card padded className="!p-3 text-center"><p className="text-2xl font-bold text-navy-700">{demoFindings}</p><p className="text-[11px] text-slate-500">Demo findings</p></Card>
      </div>

      <Card>
        <div className="flex items-center justify-between">
          <div><p className="text-sm font-semibold text-navy-900">Analytics Score</p><p className="text-xs text-slate-500">Informational — NOT a legal verdict</p></div>
          <div className="relative h-16 w-16">
            <svg className="h-16 w-16 -rotate-90" viewBox="0 0 36 36">
              <circle cx="18" cy="18" r="14" fill="none" stroke="#e2e8f0" strokeWidth="3" />
              <circle cx="18" cy="18" r="14" fill="none" stroke="#f59e0b" strokeWidth="3" strokeDasharray={`${inspection.analyticsScore} 100`} strokeLinecap="round" />
            </svg>
            <span className="absolute inset-0 flex items-center justify-center text-sm font-bold text-navy-900">{inspection.analyticsScore}</span>
          </div>
        </div>
      </Card>
      <DemoTagSubtle label="DEMO DATA" />

      {/* Officer decision summary */}
      <Card title="Officer Decision" subtitle="Single source of truth — shared across Result, Report and Repository">
        {inspection.officerDecision === 'Pending' ? (
          <div className="flex items-center justify-between rounded-button border border-warning-200 bg-warning-50 px-4 py-3">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-warning-600" />
              <p className="text-sm font-medium text-navy-900">Awaiting officer decision</p>
            </div>
            <p className="text-xs text-slate-500">Proceed to Officer Review</p>
          </div>
        ) : (
          <div className={`flex items-center justify-between rounded-button border px-4 py-3 ${
            inspection.officerDecision === 'COMPLIANT' ? 'border-compliant-300 bg-compliant-50'
            : inspection.officerDecision === 'NON-COMPLIANT' ? 'border-violation-300 bg-violation-50'
            : 'border-warning-300 bg-warning-50'}`}>
            <div className="flex items-center gap-2">
              {inspection.officerDecision === 'COMPLIANT' ? <CheckCircle2 className="h-5 w-5 text-compliant-600" /> : inspection.officerDecision === 'NON-COMPLIANT' ? <XCircle className="h-5 w-5 text-violation-600" /> : <AlertTriangle className="h-5 w-5 text-warning-600" />}
              <div>
                <p className="text-sm font-bold text-navy-900">{inspection.officerDecision}</p>
                <p className="text-[11px] text-slate-500">{inspection.decisionDate || 'Decision recorded'}</p>
              </div>
            </div>
            <StatusBadge status={inspection.officerDecision} small />
          </div>
        )}
      </Card>

      {/* Captured evidence strip */}
      <Card title="Captured Evidence" subtitle="Actual uploaded package photographs used in this assessment">
        <div className="flex flex-wrap gap-3">
          {inspection.evidence.map((ev) => (
            <div key={ev.id} className="flex items-center gap-2 rounded-button border border-slate-200 p-2">
              {ev.imageUrl && !ev.isPlaceholder ? (
                <img src={ev.imageUrl} alt={ev.surface} className="h-12 w-14 rounded object-cover" />
              ) : (
                <span className="flex h-12 w-14 items-center justify-center rounded bg-slate-100 text-slate-300"><ImageIcon className="h-5 w-5" /></span>
              )}
              <div>
                <p className="text-xs font-semibold text-navy-900">{ev.surface}</p>
                <p className="text-[10px] text-slate-500">{ev.id} · {ev.qualityStatus}</p>
              </div>
            </div>
          ))}
        </div>
      </Card>


      <div>
        <h2 className="mb-3 text-sm font-semibold text-navy-900">Compliance Checks</h2>
        <div className="space-y-2">
          {checks.map((chk) => (
            <div key={chk.id} className={`rounded-card border p-3 ${chk.status === 'VIOLATION' ? 'border-violation-200 bg-violation-50' : chk.status === 'REVIEW' ? 'border-warning-200 bg-warning-50' : 'border-slate-200 bg-white'}`}>
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-start gap-2">
                  {statusIcon(chk.status)}
                  <div>
                    <p className="text-sm font-medium text-navy-900">{chk.ruleTitle}</p>
                    <p className="text-xs text-slate-600">{chk.description}</p>
                  </div>
                </div>
                <StatusBadge status={chk.status} small />
              </div>
              <div className="mt-2 flex items-center gap-3 text-[10px] text-slate-500">
                <span>Confidence: {chk.confidence}%</span>
                {chk.isMachineCheckable && <span className="rounded bg-slate-100 px-1.5 py-0.5">Machine-checkable</span>}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div>
        <h2 className="mb-3 text-sm font-semibold text-navy-900">Findings</h2>
        <div className="space-y-2">
          {inspection.findings.map((fnd) => (
            <button key={fnd.id} onClick={() => navigate(`/inspection/${id}/finding/${fnd.id}`)}
              className={`w-full rounded-card border p-4 text-left transition-all hover:shadow-card ${fnd.type === 'VIOLATION' ? 'border-violation-200 bg-violation-50' : 'border-warning-200 bg-warning-50'}`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {fnd.type === 'VIOLATION' ? <XCircle className="h-5 w-5 text-violation-500" /> : <AlertTriangle className="h-5 w-5 text-warning-500" />}
                  <div>
                    <p className="text-sm font-medium text-navy-900">{fnd.title}</p>
                    <p className="text-xs text-slate-500">Severity: {fnd.severity} · {fnd.status}</p>
                  </div>
                </div>
                <ChevronRight className="h-5 w-5 text-slate-400" />
              </div>
            </button>
          ))}
        </div>
      </div>

      <Card title="Compliance Fingerprint" subtitle="Auditable inspection record & trace to evidence">
        <button onClick={() => setFingerprintOpen(!fingerprintOpen)} className="flex w-full items-center justify-between text-sm font-medium text-navy-900">
          <span className="flex items-center gap-2"><Fingerprint className="h-4 w-4" /> Trace: INSPECTION → PACKAGE → IMAGE → OCR → FIELD → RULE → FINDING → DECISION</span>
          {fingerprintOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </button>
        {fingerprintOpen && (
          <div className="mt-3 space-y-2 text-xs">
            {inspection.fingerprint.map((sec, i) => (
              <div key={sec} className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2">
                <span className="flex items-center gap-2"><Fingerprint className="h-3.5 w-3.5 text-slate-400" /> {sec}</span>
                <span className={i === inspection.fingerprint.length - 1 ? 'font-medium text-govblue-600' : 'text-compliant-600'}>✓ Captured</span>
              </div>
            ))}
          </div>
        )}
        <div className="mt-3 flex items-center gap-2">
          <Button variant="outline" size="sm" icon={Eye} onClick={() => navigate(`/inspection/${id}/finding/${inspection.findings[0]?.id || ''}`)}>Trace to Evidence</Button>
          <Button variant="outline" size="sm" icon={BookOpen} onClick={() => navigate('/rules')}>View Rules</Button>
        </div>
      </Card>

      {!isSeeded ? (
        <Button onClick={() => navigate(`/inspection/${id}/review`)} icon={ChevronRight} fullWidth size="lg">
          Officer Review & Final Decision
        </Button>
      ) : (
        <div className="grid grid-cols-2 gap-2">
          <Button variant="outline" onClick={() => navigate(`/inspection/${id}/report`)} icon={BookOpen} fullWidth>
            Full Report
          </Button>
          <Button onClick={() => navigate('/inspections')} icon={ChevronRight} fullWidth size="lg">
            Back to Repository
          </Button>
        </div>
      )}
    </div>
  );
};

export default ComplianceResultPage;
