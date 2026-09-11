import React, { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { AlertTriangle, XCircle, BookOpen, MessageSquare, Maximize2, Image as ImageIcon } from 'lucide-react';
import { PageHeader } from '../components/common/PageHeader';
import { Card, Button } from '../components/common/Button';
import { StatusBadge, DemoTag } from '../components/common/StatusBadge';
import { Modal } from '../components/common/Modal';
import { useDemo } from '../context/DemoContext';

const FindingDetailPage: React.FC = () => {
  const navigate = useNavigate();
  const { id, findingId } = useParams();
  const { inspection: activeInspection, allInspections, updateFinding } = useDemo();
  const inspection = allInspections.find((i) => i.inspectionId === id) || activeInspection;
  const finding = inspection.findings.find((f) => f.id === findingId);
  const [notes, setNotes] = useState(finding?.officerNotes || '');
  const [decision, setDecision] = useState<string>(finding?.officerDecision || 'Pending');
  const [zoom, setZoom] = useState<{ surface: string; url: string } | null>(null);

  const frontEv = inspection.evidence.find((e) => e.surface === 'Front');
  const backEv = inspection.evidence.find((e) => e.surface === 'Back');

  if (!finding) return <div className="p-8 text-center text-slate-500">Finding not found</div>;

  const handleSave = () => {
    updateFinding(finding.id, decision as any, notes);
  };

  return (
    <div className="space-y-5 animate-[fadeIn_0.3s_ease-out]">
      <PageHeader title="Finding Detail" subtitle={finding.title} icon={finding.type === 'VIOLATION' ? XCircle : AlertTriangle} backTo={`/inspection/${id}/result`} />
      <DemoTag label="DEMO FINDING" className="w-fit" />

      <div className={`rounded-card border-2 p-4 ${finding.type === 'VIOLATION' ? 'border-violation-200 bg-violation-50' : 'border-warning-200 bg-warning-50'}`}>
        <div className="flex items-center gap-3">
          {finding.type === 'VIOLATION' ? <XCircle className="h-6 w-6 text-violation-500" /> : <AlertTriangle className="h-6 w-6 text-warning-500" />}
          <div>
            <p className="text-xs font-medium text-slate-500">{finding.severity} · {finding.status}</p>
            <p className="text-base font-bold text-navy-900">{finding.title}</p>
          </div>
        </div>
      </div>

      <Card title="Evidence Comparison" subtitle="MRP conflict between captured surfaces">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {/* Front evidence */}
          <div className="rounded-card border border-slate-200 p-3">
            <div className="mb-2 flex items-center justify-between">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">FRONT SURFACE</p>
              <StatusBadge status="Good" small />
            </div>
            <div className="relative overflow-hidden rounded-button border border-slate-200 bg-navy-50">
              {frontEv && frontEv.imageUrl && !frontEv.isPlaceholder ? (
                <>
                  <img src={frontEv.imageUrl} alt="Front" className="h-44 w-full object-cover" />
                  <div className="absolute bottom-3 left-1/2 w-3/5 -translate-x-1/2 rounded border-2 border-warning-400 bg-warning-400/15 px-2 py-1 text-center backdrop-blur-[1px]">
                    <p className="text-sm font-bold text-navy-900">{finding.frontValue}</p>
                    <p className="text-[9px] font-medium text-warning-700">MRP · OCR 98%</p>
                  </div>
                </>
              ) : (
                <div className="flex h-44 items-center justify-center"><ImageIcon className="h-8 w-8 text-slate-300" /></div>
              )}
            </div>
            <div className="mt-2 flex items-center justify-between text-[10px] text-slate-500">
              <span>Evidence: {finding.evidenceFront}</span>
              {frontEv && frontEv.imageUrl && (
                <button onClick={() => setZoom({ surface: 'Front', url: frontEv.imageUrl })} className="inline-flex items-center gap-1 font-medium text-govblue-600 hover:text-govblue-700">
                  <Maximize2 className="h-3 w-3" /> Zoom
                </button>
              )}
            </div>
          </div>

          {/* Back evidence */}
          <div className="rounded-card border border-slate-200 p-3">
            <div className="mb-2 flex items-center justify-between">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">BACK SURFACE</p>
              <StatusBadge status="Good" small />
            </div>
            <div className="relative overflow-hidden rounded-button border border-slate-200 bg-navy-50">
              {backEv && backEv.imageUrl && !backEv.isPlaceholder ? (
                <>
                  <img src={backEv.imageUrl} alt="Back" className="h-44 w-full object-cover" />
                  <div className="absolute bottom-3 left-1/2 w-3/5 -translate-x-1/2 rounded border-2 border-warning-400 bg-warning-400/15 px-2 py-1 text-center backdrop-blur-[1px]">
                    <p className="text-sm font-bold text-navy-900">{finding.backValue}</p>
                    <p className="text-[9px] font-medium text-warning-700">MRP · OCR 97%</p>
                  </div>
                </>
              ) : (
                <div className="flex h-44 items-center justify-center"><ImageIcon className="h-8 w-8 text-slate-300" /></div>
              )}
            </div>
            <div className="mt-2 flex items-center justify-between text-[10px] text-slate-500">
              <span>Evidence: {finding.evidenceBack}</span>
              {backEv && backEv.imageUrl && (
                <button onClick={() => setZoom({ surface: 'Back', url: backEv.imageUrl })} className="inline-flex items-center gap-1 font-medium text-govblue-600 hover:text-govblue-700">
                  <Maximize2 className="h-3 w-3" /> Zoom
                </button>
              )}
            </div>
          </div>
        </div>

        {finding.difference !== '—' && finding.difference && (
          <div className="mt-3 rounded-lg bg-slate-50 p-3 text-center">
            <p className="text-xs text-slate-500">Difference</p>
            <p className="text-lg font-bold text-violation-600">{finding.difference}</p>
          </div>
        )}
        <p className="mt-2 text-xs text-slate-500">OCR confidence: {finding.ocrConfidence}% · Finding type: CROSS-SIDE_CONFLICT</p>
      </Card>

      <Card title="Applicable Rule" icon={BookOpen}>
        <div className="space-y-2 text-xs">
          <DetailRow label="Rule" value={finding.ruleTitle} />
          <DetailRow label="Rule ID" value={finding.ruleId} />
          <DetailRow label="Version" value={finding.ruleVersion} />
          <DetailRow label="Why flagged" value="The same package presents inconsistent MRP values across captured surfaces." />
        </div>
        <div className="mt-3 rounded-lg border border-warning-200 bg-warning-50 p-3 text-[11px] text-slate-600">
          <p><span className="font-semibold text-warning-700">Demo finding:</span> {finding.description} Officer verifies the physical package before final determination.</p>
        </div>
      </Card>

      <Card title="Officer Notes" icon={MessageSquare}>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Add your notes about this finding..."
          className="w-full rounded-button border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-navy-900 placeholder-slate-400 focus:border-govblue-500 focus:outline-none focus:ring-1 focus:ring-govblue-500"
          rows={3}
        />
      </Card>

      <Card title="Officer Decision">
        <p className="mb-3 text-xs text-slate-500">Verify the physical package and declaration before final determination.</p>
        <div className="flex flex-wrap gap-2">
          {[
            { d: 'Confirmed', cls: 'bg-compliant-600 text-white' },
            { d: 'Needs Review', cls: 'bg-warning-500 text-white' },
            { d: 'Not Established', cls: 'bg-slate-600 text-white' },
          ].map((opt) => (
            <button key={opt.d} onClick={() => setDecision(opt.d)}
              className={`rounded-button px-4 py-2 text-sm font-medium transition-colors ${decision === opt.d ? opt.cls : 'border border-slate-200 bg-white text-slate-600 hover:bg-slate-50'}`}>
              {opt.d}
            </button>
          ))}
        </div>
      </Card>

      <div className="flex gap-3">
        <Button variant="outline" onClick={() => navigate(`/inspection/${id}/result`)} fullWidth>Back</Button>
        <Button onClick={() => { handleSave(); navigate(`/inspection/${id}/result`); }} fullWidth size="lg">Save & Return</Button>
      </div>
      <div className="flex justify-center"><DemoTag label="DEMO FINDING" /></div>

      <Modal open={!!zoom} onClose={() => setZoom(null)} title={zoom ? `${zoom.surface} — Evidence Zoom` : ''} wide>
        {zoom && (
          <div>
            <img src={zoom.url} alt="Evidence" className="w-full rounded-card border border-slate-200 bg-slate-100 object-contain" />
            <p className="mt-2 text-[10px] text-slate-500">Use your browser zoom (Ctrl/Cmd + scroll) to inspect fine detail.</p>
          </div>
        )}
      </Modal>
    </div>
  );
};

const DetailRow: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <div className="flex items-start justify-between gap-3">
    <span className="shrink-0 text-slate-500">{label}</span>
    <span className="text-right font-medium text-navy-900">{value}</span>
  </div>
);

export default FindingDetailPage;