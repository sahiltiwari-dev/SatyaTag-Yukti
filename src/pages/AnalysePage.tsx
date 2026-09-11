import React, { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Check, ChevronRight, ScanSearch, FileSearch, Cpu, Gauge, Table2, Layers, ListChecks,
  BookMarked, Scale, Link2, Loader2,
} from 'lucide-react';
import { Stepper } from '../components/common/Stepper';
import { PageHeader } from '../components/common/PageHeader';
import { Card, Button } from '../components/common/Button';
import { StatusBadge, DemoTag } from '../components/common/StatusBadge';
import { useDemo, sleep } from '../context/DemoContext';

interface StageDef {
  key: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  sub: string;
}

const STAGES: StageDef[] = [
  { key: 'quality', label: 'Image Quality Check', icon: Gauge, sub: 'Resolution · focus · glare' },
  { key: 'preprocess', label: 'Image Preprocessing', icon: Cpu, sub: 'Normalise & enhance' },
  { key: 'ocr', label: 'OCR', icon: ScanSearch, sub: 'Text recognition' },
  { key: 'ocrconf', label: 'OCR Confidence', icon: Gauge, sub: 'Field-level scoring' },
  { key: 'extract', label: 'Information Extraction', icon: Table2, sub: 'Declarations parsed' },
  { key: 'classify', label: 'Product Classification', icon: Layers, sub: 'Category identification' },
  { key: 'applicability', label: 'Applicability Check', icon: ListChecks, sub: 'Applicable rules scope' },
  { key: 'rulematch', label: 'Rule Matching', icon: BookMarked, sub: 'Rule engine lookup' },
  { key: 'compliance', label: 'Compliance Evaluation', icon: Scale, sub: 'Checks evaluated' },
  { key: 'evidence', label: 'Evidence Linking', icon: Link2, sub: 'Findings ↔ images' },
];

type Phase = 'idle' | 'running' | 'complete';

const AnalysePage: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const { inspection, updateStage, addAudit } = useDemo();
  const [phase, setPhase] = useState<Phase>('idle');
  const [current, setCurrent] = useState(0);
  const [progress, setProgress] = useState(0);
  const [running, setRunning] = useState(false);

  const evidenceWithImage = inspection.evidence.filter((e) => e.imageUrl && !e.isPlaceholder);

  const startAnalysis = async () => {
    if (phase !== 'idle' || running) return;
    setRunning(true);
    setPhase('running');
    for (let i = 0; i < STAGES.length; i++) {
      setCurrent(i);
      setProgress(((i + 1) / STAGES.length) * 100);
      await sleep(550);
    }
    setPhase('complete');
    updateStage('ANALYSING');
    addAudit('Full analysis pipeline completed', inspection.inspectionId, 'Success');
    setRunning(false);
  };

  const handleContinue = async () => {
    updateStage('EXTRACTED');
    navigate(`/inspection/${inspection.inspectionId}/result`);
  };

  const statusIcon = (i: number) => {
    if (phase === 'complete' || i < current) return <Check className="h-4 w-4 text-compliant-600" />;
    if (i === current && phase === 'running') return <Loader2 className="h-4 w-4 animate-spin text-govblue-600" />;
    return <span className="h-1.5 w-1.5 rounded-full bg-slate-300" />;
  };

  const showPipeline = () => phase !== 'complete';

  return (
    <div className="space-y-5 animate-[fadeIn_0.3s_ease-out]">
      <PageHeader title="Analyse Information" subtitle="Extracting and verifying product details" backTo={`/inspection/${id}/scan`} stepLabel="Analyse Information" />
      <Stepper steps={['Inspection Setup', 'Scan Product', 'Analyse Information', 'View Result']} current={3} />

      {evidenceWithImage.length === 0 && (
        <div className="rounded-card border border-warning-200 bg-warning-50 p-4">
          <p className="text-sm font-medium text-warning-700">No evidence images uploaded yet</p>
          <p className="mt-1 text-xs text-slate-600">
            No actual package photographs were uploaded during the scan step. Analysis can still
            run on the demo evidence set, but a full demo should upload the front/back package images first.
          </p>
        </div>
      )}

      {evidenceWithImage.length > 0 && (
        <Card title="Evidence Under Analysis" subtitle="Actual uploaded package photographs">
          <div className="flex flex-wrap gap-3">
            {evidenceWithImage.map((ev) => (
              <div key={ev.id} className="flex items-center gap-2 rounded-button border border-slate-200 p-2">
                <img src={ev.imageUrl} alt={ev.surface} className="h-12 w-14 rounded object-cover" />
                <div>
                  <p className="text-xs font-semibold text-navy-900">{ev.surface}</p>
                  <p className="text-[10px] text-slate-500">{ev.id} · {ev.qualityStatus} {ev.qualityScore}%</p>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {showPipeline() && (
        <>
          <Card title="Analysis Pipeline" subtitle="Deterministic demo pipeline — no external AI service">
            <div className="space-y-1">
              {STAGES.map((stage, i) => (
                <div
                  key={stage.key}
                  className={`flex items-center gap-3 rounded-lg px-3 py-2.5 transition-colors ${
                    phase === 'running' && i === current ? 'bg-govblue-50 border border-govblue-100'
                    : i < current || phase === 'complete' ? 'bg-compliant-50/60'
                    : 'bg-slate-50'
                  }`}
                >
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center">{statusIcon(i)}</span>
                  <stage.icon className={`h-4 w-4 shrink-0 ${i < current || phase === 'complete' ? 'text-compliant-600' : i === current && phase === 'running' ? 'text-govblue-600' : 'text-slate-400'}`} />
                  <div className="min-w-0 flex-1">
                    <p className={`text-xs font-medium ${i <= current ? 'text-navy-900' : 'text-slate-500'}`}>{stage.label}</p>
                    <p className="text-[10px] text-slate-500">{stage.sub}</p>
                  </div>
                  {i < current || phase === 'complete' ? (
                    <span className="text-[10px] font-medium text-compliant-600">Completed</span>
                  ) : i === current && phase === 'running' ? (
                    <span className="text-[10px] font-medium text-govblue-600">Processing</span>
                  ) : (
                    <span className="text-[10px] font-medium text-slate-400">Pending</span>
                  )}
                </div>
              ))}
            </div>

            {phase === 'running' && (
              <div className="mt-4">
                <div className="mb-1 flex justify-between text-[11px] text-slate-500">
                  <span>{STAGES[current].label}</span>
                  <span>{Math.round(progress)}%</span>
                </div>
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-200">
                  <div className="h-full rounded-full bg-govblue-600 transition-all duration-300" style={{ width: `${progress}%` }} />
                </div>
              </div>
            )}
          </Card>

          {phase === 'idle' && (
            <Button onClick={startAnalysis} icon={ScanSearch} fullWidth size="lg" loading={running}>
              Start Analysis
            </Button>
          )}
          <div className="flex justify-center"><DemoTag label="DEMO ANALYSIS" /></div>
        </>
      )}

      {phase === 'complete' && (
        <div className="space-y-4 animate-[fadeIn_0.3s_ease-out]">
          <div className="rounded-card border border-compliant-200 bg-compliant-50 p-4 text-center">
            <Check className="mx-auto mb-2 h-8 w-8 text-compliant-500" />
            <p className="text-sm font-semibold text-compliant-700">Analysis pipeline completed</p>
            <p className="text-xs text-slate-500">10 stages · {inspection.extractedFields.length} fields · {inspection.complianceChecks.length} rule checks</p>
          </div>

          <Card title="Extracted Product Information" subtitle={inspection.product.name} icon={FileSearch}>
            <div className="space-y-2">
              {inspection.extractedFields.map((f) => {
                const ev = inspection.evidence.find((e) => e.id === f.evidenceId);
                const confident = f.ocrConfidence >= 90;
                return (
                  <div key={f.id} className="rounded-lg border border-slate-100 bg-slate-50/60 p-3">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-[11px] font-medium uppercase tracking-wide text-slate-500">{f.label}</p>
                      <StatusBadge status={confident ? 'Verified' : 'REVIEW'} small />
                    </div>
                    <p className="mt-0.5 text-sm font-semibold text-navy-900">{f.value}</p>
                    <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px] text-slate-500">
                      <span>OCR Confidence: {f.ocrConfidence}%</span>
                      <span>Source: {f.source}</span>
                      {ev && <span>{ev.id}</span>}
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>

          <Card title="Product Classification" icon={Layers}>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-sm font-medium text-navy-900">{inspection.classification.category} — {inspection.classification.subcategory}</p>
                <p className="mt-1 text-xs text-slate-500">
                  Applicable: {inspection.applicability.productType} · Machine-checkable: {inspection.applicability.machineCheckableCount} · Officer review: {inspection.applicability.officerReviewCount}
                </p>
              </div>
              <div className="text-right">
                <p className="text-lg font-bold text-govblue-700">{inspection.classification.confidence}%</p>
                <p className="text-[10px] text-slate-500">Classification confidence</p>
              </div>
            </div>
            <div className="mt-3 space-y-1.5">
              {inspection.classification.candidates.map((c) => (
                <div key={c.label} className="flex items-center justify-between text-xs">
                  <span className="text-slate-600">{c.label}</span>
                  <div className="flex items-center gap-2">
                    <div className="h-1.5 w-24 overflow-hidden rounded-full bg-slate-200">
                      <div className="h-full rounded-full bg-govblue-600" style={{ width: `${c.confidence}%` }} />
                    </div>
                    <span className="w-8 text-right font-medium text-navy-900">{c.confidence}%</span>
                  </div>
                </div>
              ))}
            </div>
          </Card>

          <Button onClick={handleContinue} icon={ChevronRight} fullWidth size="lg">View Compliance Result</Button>
          <div className="flex justify-center"><DemoTag label="DEMO ANALYSIS" /></div>
        </div>
      )}
    </div>
  );
};

export default AnalysePage;