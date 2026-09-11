import React, { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { CheckCircle2, AlertTriangle, XCircle, ChevronRight, RotateCcw, ShieldCheck } from 'lucide-react';
import { PageHeader } from '../components/common/PageHeader';
import { Card, Button } from '../components/common/Button';
import { Modal } from '../components/common/Modal';
import { DemoTag } from '../components/common/StatusBadge';
import { useDemo, sleep } from '../context/DemoContext';

type FinalDecision = 'COMPLIANT' | 'MANUAL REVIEW' | 'NON-COMPLIANT';

const decisionOptions: { key: FinalDecision; label: string; desc: string; icon: React.ComponentType<{ className?: string }>; activeCls: string; dotCls: string }[] = [
  {
    key: 'COMPLIANT', label: 'Compliant', desc: 'No confirmed violations. All declarations verified.',
    icon: CheckCircle2, activeCls: 'border-compliant-400 bg-compliant-50 ring-1 ring-compliant-200', dotCls: 'bg-compliant-500',
  },
  {
    key: 'MANUAL REVIEW', label: 'Manual Review', desc: 'Findings need further verification or escalation.',
    icon: AlertTriangle, activeCls: 'border-warning-400 bg-warning-50 ring-1 ring-warning-200', dotCls: 'bg-warning-500',
  },
  {
    key: 'NON-COMPLIANT', label: 'Non-Compliant', desc: 'Confirmed violation supported by evidence.',
    icon: XCircle, activeCls: 'border-violation-400 bg-violation-50 ring-1 ring-violation-200', dotCls: 'bg-violation-500',
  },
];

const OfficerReviewPage: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const { inspection, officer, setFinalDecision } = useDemo();
  const [decisionModalOpen, setDecisionModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [inspectorDecision, setInspectorDecision] = useState<FinalDecision | ''>(inspection.officerDecision !== 'Pending' ? inspection.officerDecision as FinalDecision : '');
  const [inspectorNotes, setInspectorNotes] = useState(inspection.finalNotes);
  const findings = inspection.findings;

  const handleFinalSubmit = async () => {
    if (!inspectorDecision) return;
    setSubmitting(true);
    await sleep(1200);
    setFinalDecision(inspectorDecision, inspectorNotes);
    setSubmitting(false);
    setDecisionModalOpen(false);
    navigate(`/inspection/${id}/report`);
  };

  return (
    <div className="space-y-5 animate-[fadeIn_0.3s_ease-out]">
      <PageHeader title="Officer Review" subtitle="Review findings and make the final decision" backTo={`/inspection/${id}/result`} />
      <DemoTag label="DEMO DATA" className="w-fit" />

      <Card>
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-govblue-100 text-lg font-bold text-govblue-700">{officer.name.charAt(0)}</div>
          <div><p className="text-sm font-semibold text-navy-900">{officer.name}</p><p className="text-xs text-slate-500">{officer.id} · {officer.role}</p></div>
        </div>
      </Card>

      <Card title="Inspection Summary">
        <div className="space-y-2 text-xs">
          <Row l="Inspection ID" v={inspection.inspectionId} />
          <Row l="Product" v={inspection.product.name} />
          <Row l="Checks Performed" v={String(inspection.complianceChecks.length)} />
          <Row l="Findings" v={String(findings.length)} />
        </div>
      </Card>

      {inspection.evidence.some((ev) => ev.imageUrl && !ev.isPlaceholder) && (
        <Card title="Captured Evidence" subtitle="Actual uploaded package photographs for review">
          <div className="flex flex-wrap gap-3">
            {inspection.evidence.filter((ev) => ev.imageUrl && !ev.isPlaceholder).map((ev) => (
              <div key={ev.id} className="flex items-center gap-2 rounded-button border border-slate-200 p-2">
                <img src={ev.imageUrl} alt={ev.surface} className="h-14 w-16 rounded object-cover" />
                <div>
                  <p className="text-xs font-semibold text-navy-900">{ev.surface}</p>
                  <p className="text-[10px] text-slate-500">{ev.id} · {ev.qualityStatus}</p>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      <div>
        <h2 className="mb-3 text-sm font-semibold text-navy-900">Review Findings</h2>
        <div className="space-y-2">
          {findings.map((fnd) => (
            <button key={fnd.id} onClick={() => navigate(`/inspection/${id}/finding/${fnd.id}`)}
              className="w-full rounded-card border border-slate-200 bg-white p-3 text-left transition-all hover:shadow-card">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {fnd.type === 'VIOLATION' ? <XCircle className="h-4 w-4 text-violation-500" /> : <AlertTriangle className="h-4 w-4 text-warning-500" />}
                  <div><p className="text-sm font-medium text-navy-900">{fnd.title}</p><p className="text-[11px] text-slate-500">{fnd.severity}</p></div>
                </div>
                <ChevronRight className="h-4 w-4 text-slate-400" />
              </div>
            </button>
          ))}
        </div>
      </div>

      <Card title="Inspection Notes">
        <textarea value={inspectorNotes} onChange={(e) => setInspectorNotes(e.target.value)}
          placeholder="Add notes for the inspection report..."
          className="w-full rounded-button border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-navy-900 placeholder-slate-400 focus:border-govblue-500 focus:outline-none focus:ring-1 focus:ring-govblue-500" rows={4} />
      </Card>

      <Card title="Final Decision" subtitle="The officer is the final decision-maker for this inspection" icon={ShieldCheck}>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          {decisionOptions.map((opt) => {
            const active = inspectorDecision === opt.key;
            return (
              <button
                key={opt.key}
                onClick={() => setInspectorDecision(opt.key)}
                className={`rounded-button border-2 p-4 text-left transition-all ${active ? opt.activeCls : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50'}`}
              >
                <div className="flex items-center gap-3">
                  <opt.icon className={`h-6 w-6 ${active ? 'text-current' : 'text-slate-400'}`} />
                  <div>
                    <p className={`text-sm font-semibold ${active ? 'text-navy-900' : 'text-slate-700'}`}>{opt.label}</p>
                    <p className="mt-0.5 text-[11px] text-slate-500">{opt.desc}</p>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
        {inspectorDecision && (
          <p className="mt-3 flex items-center gap-2 rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-600">
            <span className="h-2 w-2 rounded-full" style={{ backgroundColor: inspectorDecision === 'COMPLIANT' ? '#16a34a' : inspectorDecision === 'NON-COMPLIANT' ? '#dc2626' : '#d97706' }} />
            Selected: <span className="font-semibold text-navy-900">{inspectorDecision}</span>
            {' '}· Decision will appear on the Inspection Report and Repository.
          </p>
        )}
      </Card>

      <div className="flex gap-3">
        <Button variant="outline" onClick={() => navigate(`/inspection/${id}/result`)} icon={RotateCcw}>Back</Button>
        <Button onClick={() => setDecisionModalOpen(true)} icon={CheckCircle2} fullWidth size="lg" disabled={!inspectorDecision}>
          Confirm Final Decision
        </Button>
      </div>

      <Modal open={decisionModalOpen} onClose={() => setDecisionModalOpen(false)} title="Confirm Final Decision">
        <div className="space-y-4">
          <p className="text-sm text-slate-600">Submit your final decision for inspection <span className="font-mono font-semibold text-navy-900">{inspection.inspectionId}</span>.</p>
          <div className="rounded-card bg-slate-50 p-4 text-xs space-y-1">
            <Row l="Decision" v={inspectorDecision || ''} />
            <Row l="Findings" v={`${findings.length} item(s)`} />
            <Row l="Officer" v={officer.name} />
          </div>
          <div className={`rounded-card border p-3 flex items-start gap-2 ${inspectorDecision === 'COMPLIANT' ? 'border-compliant-200 bg-compliant-50' : inspectorDecision === 'NON-COMPLIANT' ? 'border-violation-200 bg-violation-50' : 'border-warning-200 bg-warning-50'}`}>
            {inspectorDecision === 'COMPLIANT' ? <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-compliant-600" /> : inspectorDecision === 'NON-COMPLIANT' ? <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-violation-600" /> : <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-warning-600" />}
            <div>
              <p className="text-xs font-semibold text-navy-900">{inspectorDecision}</p>
              <p className="text-[11px] text-slate-500">This decision will be recorded in the inspection state and reflected in the generated report PDF.</p>
            </div>
          </div>
          <p className="text-xs text-slate-500">This is a demo environment. Confirming records the decision against the single inspection state used by the Compliance Result, Report and Repository.</p>
          <div className="flex gap-3">
            <Button variant="outline" onClick={() => setDecisionModalOpen(false)} className="flex-1">Cancel</Button>
            <Button onClick={handleFinalSubmit} className="flex-1" loading={submitting}>Confirm & Generate Report</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

const Row: React.FC<{ l: string; v: string }> = ({ l, v }) => (
  <div className="flex items-start justify-between gap-3"><span className="text-slate-500">{l}</span><span className="font-medium text-navy-900">{v}</span></div>
);

export default OfficerReviewPage;