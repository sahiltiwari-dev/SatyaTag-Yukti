import React, { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Download, Eye, Printer, Share2, CheckCircle2, AlertTriangle, XCircle, RotateCcw, FileDown, Loader2,
} from 'lucide-react';
import { PageHeader } from '../components/common/PageHeader';
import { Card, Button } from '../components/common/Button';
import { DemoTag } from '../components/common/StatusBadge';
import { useDemo } from '../context/DemoContext';
import { generateInspectionPdf } from '../utils/report';

type GeneratePhase = 'idle' | 'generating' | 'ready';

const InspectionReportPage: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const { inspection: activeInspection, allInspections, officer, setReportGenerated } = useDemo();
  const inspection = allInspections.find((i) => i.inspectionId === id) || activeInspection;
  const [phase, setPhase] = useState<GeneratePhase>(inspection.reportGenerated ? 'ready' : 'idle');
  const [previewOpen, setPreviewOpen] = useState(false);

  const checks = inspection.complianceChecks;
  const passed = checks.filter((c) => c.status === 'PASS').length;
  const review = checks.filter((c) => c.status === 'REVIEW').length;
  const violations = checks.filter((c) => c.status === 'VIOLATION').length;
  const decision = inspection.officerDecision === 'Pending' ? 'MANUAL REVIEW' : inspection.officerDecision;
  const decisionBadge =
    decision === 'COMPLIANT'
      ? { text: 'COMPLIANT', cls: 'border-compliant-300 bg-compliant-50 text-compliant-700' }
      : decision === 'NON-COMPLIANT'
        ? { text: 'NON-COMPLIANT', cls: 'border-violation-300 bg-violation-50 text-violation-700' }
        : { text: 'MANUAL REVIEW', cls: 'border-warning-300 bg-warning-50 text-warning-700' };

  const handleGenerate = async () => {
    setPhase('generating');
    await generateInspectionPdf(inspection, officer);
    setReportGenerated(true);
    setPhase('ready');
  };

  const handlePreview = () => {
    if (phase !== 'ready') return;
    setPreviewOpen(true);
  };

  const handlePrint = () => {
    if (phase !== 'ready') return;
    window.print();
  };

  const handleShare = () => {
    if (phase !== 'ready') return;
    if (navigator.share) {
      navigator.share({ title: `SATYATAG Inspection Report — ${inspection.inspectionId}`, text: `Final status: ${decision}` }).catch(() => undefined);
    }
  };

  return (
    <div className="space-y-5 animate-[fadeIn_0.3s_ease-out]">
      <PageHeader title="Inspection Report" subtitle={inspection.inspectionId} backTo={`/inspection/${id}/review`} />
      <DemoTag label="DEMO REPORT" className="w-fit" />

      {/* Generation / download UX */}
      <Card>
        {phase === 'idle' && (
          <div className="flex flex-col items-center gap-3 py-2 text-center">
            <FileDown className="h-10 w-10 text-govblue-500" />
            <div>
              <p className="text-sm font-semibold text-navy-900">Generate the official inspection report</p>
              <p className="mt-1 text-xs text-slate-500">
                The PDF is generated from the current inspection state and reflects the officer's final decision: <span className="font-semibold text-navy-900">{decision}</span>
              </p>
            </div>
            <Button onClick={handleGenerate} icon={Download} size="lg">Download PDF Report</Button>
          </div>
        )}
        {phase === 'generating' && (
          <div className="flex flex-col items-center gap-3 py-2 text-center">
            <Loader2 className="h-8 w-8 animate-spin text-govblue-500" />
            <p className="text-sm font-medium text-navy-900">Generating report with evidence photographs…</p>
            <p className="text-xs text-slate-500">Assembling document · embedding captured images · finalising officer decision</p>
          </div>
        )}
        {phase === 'ready' && (
          <div className="space-y-3">
            <div className="flex items-center gap-2 rounded-card border border-compliant-200 bg-compliant-50 px-4 py-3">
              <CheckCircle2 className="h-5 w-5 shrink-0 text-compliant-600" />
              <p className="text-sm font-medium text-compliant-700">Report generated successfully</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button onClick={handleGenerate} variant="outline" icon={Download} size="sm">Download PDF</Button>
              <Button onClick={handlePreview} variant="outline" icon={Eye} size="sm">Preview</Button>
              <Button onClick={handlePrint} variant="outline" icon={Printer} size="sm">Print</Button>
              <Button onClick={handleShare} variant="outline" icon={Share2} size="sm">Share</Button>
            </div>
            <p className="text-[11px] text-slate-500">Saved as SATYATAG_Inspection_Report_{inspection.inspectionId}.pdf</p>
          </div>
        )}
      </Card>

      {/* Report document preview */}
      <Card className="!p-0">
        <div className="rounded-card border border-slate-200 bg-white p-6 shadow-card">
          <div className="border-b border-slate-200 pb-4">
            <div className="mb-1 flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded bg-navy-900 text-xs font-bold text-white">S</div>
                <div>
                  <p className="text-xs font-semibold text-navy-900">SATYATAG — Inspection Report</p>
                  <p className="text-[10px] text-slate-500">Government of India · Department of Consumer Affairs</p>
                </div>
              </div>
              <span className={`rounded-lg border px-3 py-1 text-xs font-bold ${decisionBadge.cls}`}>{decisionBadge.text}</span>
            </div>
            <h2 className="mt-3 text-lg font-bold text-navy-900">Inspection Report</h2>
          </div>

          <Section title="Inspection Information">
            <Field label="Inspection ID" value={inspection.inspectionId} />
            <Field label="Officer" value={`${officer.name} (${officer.id})`} />
            <Field label="Date / Time" value={inspection.createdAt} />
            <Field label="Location" value={inspection.location} />
            <Field label="Type" value={inspection.type} />
            <Field label="Mode" value={inspection.mode} />
          </Section>

          <Section title="Product Information">
            <Field label="Product Name" value={inspection.product.name} />
            <Field label="Brand" value={inspection.product.brand} />
            <Field label="Category" value={inspection.product.category} />
            <Field label="Net Quantity" value={inspection.product.netQuantity} />
            <Field label="MRP" value={inspection.product.mrp} />
            <Field label="Manufacturer" value={inspection.product.manufacturer.split(',')[0]} />
            <Field label="Date of Manufacture" value={inspection.product.dateOfManufacture} />
            <Field label="Best Before" value={inspection.product.bestBefore} />
            <Field label="Country of Origin" value={inspection.product.countryOfOrigin} />
          </Section>

          <Section title="Captured Evidence">
            <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
              {inspection.evidence.map((ev) => (
                <div key={ev.id} className="rounded-button border border-slate-200 p-2">
                  {ev.imageUrl && !ev.isPlaceholder ? (
                    <img src={ev.imageUrl} alt={ev.surface} className="h-24 w-full rounded object-cover" />
                  ) : (
                    <div className="flex h-24 w-full items-center justify-center rounded bg-slate-100 text-[10px] text-slate-400">No image</div>
                  )}
                  <p className="mt-1 text-[10px] font-semibold text-navy-900">{ev.surface}</p>
                  <p className="text-[9px] text-slate-500">{ev.id}</p>
                </div>
              ))}
            </div>
          </Section>

          <Section title="Compliance Summary">
            <div className="grid grid-cols-4 gap-3 py-2 text-center">
              <SummaryCell value={checks.length} label="Total" tone="text-navy-900" />
              <SummaryCell value={passed} label="Pass" tone="text-compliant-600" />
              <SummaryCell value={review} label="Review" tone="text-warning-600" />
              <SummaryCell value={violations} label="Violation" tone="text-violation-600" />
            </div>
          </Section>

          <Section title="Findings">
            {inspection.findings.length === 0 && <Field label="Findings" value="No findings recorded" />}
            {inspection.findings.map((fnd) => (
              <div key={fnd.id} className={`mb-2 rounded border p-3 ${fnd.type === 'VIOLATION' ? 'border-violation-200 bg-violation-50' : 'border-warning-200 bg-warning-50'}`}>
                <div className="mb-1 flex items-center gap-2">
                  {fnd.type === 'VIOLATION' ? <XCircle className="h-4 w-4 text-violation-500" /> : <AlertTriangle className="h-4 w-4 text-warning-500" />}
                  <p className="text-xs font-semibold text-navy-900">{fnd.title}</p>
                </div>
                <p className="text-[11px] text-slate-600">{fnd.description}</p>
                <p className="mt-1 text-[10px] text-slate-500">Rule: {fnd.ruleId} · Front: {fnd.frontValue} · Back: {fnd.backValue}</p>
              </div>
            ))}
          </Section>

          <Section title="Officer Decision">
            <div className="rounded-button border border-slate-200 p-3">
              <Field label="Final Status" value={decision} />
              <Field label="Officer" value={officer.name} />
              <Field label="Decision Date" value={inspection.decisionDate || '—'} />
              <Field label="Notes" value={inspection.finalNotes || '—'} />
            </div>
          </Section>

          <Section title="Compliance Fingerprint">
            <div className="flex flex-wrap items-center gap-1.5">
              {inspection.fingerprint.map((node, i) => (
                <React.Fragment key={node}>
                  <span className="rounded bg-navy-800 px-2 py-1 text-[9px] font-semibold text-white">{node}</span>
                  {i < inspection.fingerprint.length - 1 && <span className="text-[9px] text-slate-400">→</span>}
                </React.Fragment>
              ))}
            </div>
          </Section>

          <div className="border-t border-slate-200 pt-3 text-[10px] text-slate-500">
            <p>Analytics score ({inspection.analyticsScore}/100) is informational and does NOT constitute a legal verdict.</p>
            <p className="mt-1">Fingerprint: CF-DEMO-INSP-0017 - Generated by SATYATAG Demo - DEMO DATA - REQUIRES VERIFICATION</p>
          </div>
        </div>
      </Card>

      <div className="flex gap-3">
        <Button variant="outline" onClick={() => navigate('/dashboard')} icon={RotateCcw}>New Inspection</Button>
        <Button onClick={() => navigate('/inspections')} fullWidth size="lg">Go to Inspection Repository</Button>
      </div>

      {/* Preview modal */}
      {previewOpen && (
        <div className="fixed inset-0 z-[90] flex items-center justify-center bg-navy-950/60 p-4" onClick={() => setPreviewOpen(false)}>
          <div className="max-h-[90vh] w-full max-w-2xl overflow-auto rounded-card bg-white p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-navy-900">Report Preview - {inspection.inspectionId}</h3>
              <button onClick={() => setPreviewOpen(false)} className="rounded-lg px-2 py-1 text-xs font-medium text-slate-500 hover:bg-slate-100">Close</button>
            </div>
            <div className="rounded-card border border-slate-100 bg-slate-50 p-6">
              <div className="mx-auto max-w-2xl rounded-card border border-slate-200 bg-white p-6 shadow-card">
                <div className="border-b border-slate-200 pb-3">
                  <p className="text-sm font-bold text-navy-900">SATYATAG - Inspection Report</p>
                  <p className="text-[10px] text-slate-500">{inspection.inspectionId} · {decisionBadge.text}</p>
                </div>
                <div className="mt-4 grid grid-cols-3 gap-2 text-[11px]">
                  <FieldA label="Officer" value={officer.name} />
                  <FieldA label="Location" value={inspection.location} />
                  <FieldA label="Decision" value={decision} />
                </div>
                <div className="mt-4 rounded-button border border-slate-200 p-3 text-center">
                  <p className="text-[10px] uppercase text-slate-500">Captured evidence</p>
                  <div className="mt-2 grid grid-cols-2 gap-2">
                    {inspection.evidence.slice(0, 4).map((ev) => (
                      <div key={ev.id} className="rounded border border-slate-100 bg-slate-50 p-1.5">
                        {ev.imageUrl && !ev.isPlaceholder ? (
                          <img src={ev.imageUrl} alt={ev.surface} className="h-16 w-full rounded object-cover" />
                        ) : (
                          <div className="flex h-16 items-center justify-center text-[9px] text-slate-400">No image</div>
                        )}
                        <p className="mt-1 text-[9px] font-semibold text-navy-900">{ev.surface}</p>
                      </div>
                    ))}
                  </div>
                </div>
                <p className="mt-3 text-center text-[10px] text-slate-500">Full PDF contains product data, compliance summary, findings, officer decision and compliance fingerprint.</p>
              </div>
            </div>
            <div className="mt-3 flex justify-center gap-2">
              <Button onClick={handleGenerate} variant="outline" size="sm" icon={Download}>Download PDF</Button>
              <Button onClick={handlePrint} variant="outline" size="sm" icon={Printer}>Print</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const Section: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
  <div className="mb-4">
    <h3 className="mb-2 text-xs font-bold uppercase tracking-wide text-navy-900">{title}</h3>
    {children}
  </div>
);

const Field: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <div className="flex items-baseline justify-between border-b border-slate-100 py-1 last:border-0">
    <span className="text-[11px] text-slate-500">{label}</span>
    <span className="text-[11px] font-medium text-navy-900">{value}</span>
  </div>
);

const FieldA: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <div className="rounded border border-slate-100 bg-slate-50 p-2">
    <p className="text-[9px] uppercase text-slate-400">{label}</p>
    <p className="text-[11px] font-medium text-navy-900">{value}</p>
  </div>
);

const SummaryCell: React.FC<{ value: number; label: string; tone: string }> = ({ value, label, tone }) => (
  <div>
    <p className={`text-xl font-bold ${tone}`}>{value}</p>
    <p className="text-[10px] text-slate-500">{label}</p>
  </div>
);

export default InspectionReportPage;