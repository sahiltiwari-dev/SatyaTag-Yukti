import React, { useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Camera, Upload, Check, ChevronRight, Maximize2, Trash2, FileImage, AlertTriangle, X, RefreshCcw,
} from 'lucide-react';
import { PageHeader } from '../components/common/PageHeader';
import { Card, Button } from '../components/common/Button';
import { Stepper } from '../components/common/Stepper';
import { StatusBadge, DemoTag } from '../components/common/StatusBadge';
import { Modal } from '../components/common/Modal';
import { useDemo } from '../context/DemoContext';
import { useAuth } from '../context/AuthContext';
import { validateImageFile, fileToDataUrl, readImageMeta, deriveQuality, qualityTier, downscaleImage } from '../utils/images';

interface SurfaceDef {
  key: 'Front' | 'Back' | 'Side 1' | 'Side 2' | 'Other';
  label: string;
  hint: string;
  recommended?: boolean;
}

const SURFACES: SurfaceDef[] = [
  { key: 'Front', label: 'Front', hint: 'Brand · MRP · net qty', recommended: true },
  { key: 'Back', label: 'Back', hint: 'Declarations · manufacturer', recommended: true },
  { key: 'Side 1', label: 'Left Side', hint: 'Barcode (optional)' },
  { key: 'Side 2', label: 'Right Side', hint: 'Dates (optional)' },
  { key: 'Other', label: 'Other', hint: 'Optional / close-up' },
];

const ScanProductPage: React.FC = () => {
  const navigate = useNavigate();
  const { inspection, setSurfaceImage, removeSurfaceImage, updateStage, addAudit } = useDemo();
  const { isAuthenticated } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [activeSurface, setActiveSurface] = useState<SurfaceDef['key']>('Front');
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<{ surface: SurfaceDef['key']; url: string } | null>(null);

  const evidenceFor = (surface: SurfaceDef['key']) => inspection.evidence.find((e) => e.surface === surface);
  const uploadedCount = inspection.evidence.filter((e) => e.imageUrl && !e.isPlaceholder).length;

  const handleFileSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setError(null);

    const mime = validateImageFile(file);
    if (!mime) {
      setError('Unsupported file type. Please upload an image of the product package.');
      return;
    }

    try {
      const rawDataUrl = await fileToDataUrl(file);
      const meta = await readImageMeta(rawDataUrl);
      const score = deriveQuality(meta);
      const tier = qualityTier(score);
      const dataUrl = await downscaleImage(rawDataUrl);
      await setSurfaceImage(activeSurface, dataUrl, file.name);
      addAudit(`${activeSurface} evidence uploaded`, inspection.inspectionId, 'Success');
      addAudit(`Quality: ${tier} (${score}%)`, file.name, 'Success');
    } catch {
      setError('Could not read the selected image. Please try another image file.');
    }
  };

  const handleReplace = (surface: SurfaceDef['key']) => {
    setActiveSurface(surface);
    if (fileInputRef.current) fileInputRef.current.click();
  };

  return (
    <div className="space-y-5 animate-[fadeIn_0.3s_ease-out]">
      <PageHeader title="Scan Product" subtitle="Capture the actual package surfaces" icon={Camera} backTo="/inspection/new" stepLabel="Scan Product" />
      <Stepper steps={['Inspection Setup', 'Scan Product', 'Analyse Information', 'View Result']} current={2} />

      <div className="rounded-card border border-govblue-100 bg-govblue-50/50 p-4">
        <div className="flex items-start gap-3">
          <Upload className="mt-0.5 h-5 w-5 shrink-0 text-govblue-600" />
          <div>
            <p className="text-sm font-medium text-navy-900">Upload actual photographs of the packaged product</p>
            <p className="mt-0.5 text-xs text-slate-600">
              Capture the <span className="font-semibold">Front</span> and <span className="font-semibold">Back</span> surfaces as a minimum.
              Left, Right and Other surfaces are optional but improve evidence quality.
            </p>
            <p className="mt-1 text-[11px] text-slate-500">Accepted: JPG · PNG · WEBP · HEIC/HEIF (where supported) — image files only.</p>
          </div>
        </div>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/heic,image/heif,image/gif,image/bmp,image/avif,.jpg,.jpeg,.png,.webp,.heic,.heif"
        className="hidden"
        onChange={handleFileSelected}
      />

      {error && (
        <div className="flex items-start gap-2 rounded-card border border-violation-200 bg-violation-50 p-3">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-violation-600" />
          <div>
            <p className="text-sm font-medium text-violation-700">Unsupported file type.</p>
            <p className="text-xs text-slate-600">Please upload an image of the product package.</p>
          </div>
          <button onClick={() => setError(null)} className="ml-auto shrink-0 text-violation-400 hover:text-violation-600"><X className="h-4 w-4" /></button>
        </div>
      )}

      <div className="space-y-3">
        <h2 className="text-sm font-semibold text-navy-900">Package Surface Capture</h2>

        {SURFACES.map((surf) => {
          const ev = evidenceFor(surf.key);
          const hasImage = !!ev && !!ev.imageUrl && !ev.isPlaceholder;
          return (
            <div key={surf.key} className={`rounded-card border bg-white p-4 transition-all ${hasImage ? 'border-compliant-200' : 'border-slate-200'}`}>
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${hasImage ? 'bg-compliant-50 text-compliant-600' : 'bg-navy-50 text-navy-500'}`}>
                    {hasImage ? <Check className="h-5 w-5" /> : <Camera className="h-5 w-5" />}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-navy-900">
                      {surf.label}
                      {surf.recommended && <span className="ml-2 rounded bg-govblue-50 px-1.5 py-0.5 text-[9px] font-medium text-govblue-700">RECOMMENDED</span>}
                    </p>
                    <p className="text-[11px] text-slate-500">{surf.hint}</p>
                  </div>
                </div>
                <StatusBadge status={hasImage ? 'Uploaded' : surf.key === 'Other' ? 'Optional' : 'Pending'} small />
              </div>

              <div className="mt-3 flex items-center gap-3">
                <div className="relative h-20 w-24 shrink-0 overflow-hidden rounded-button border border-slate-200 bg-slate-100">
                  {hasImage ? (
                    <img src={ev!.imageUrl} alt={surf.label} className="h-full w-full object-cover" onClick={() => setPreview({ surface: surf.key, url: ev!.imageUrl })} />
                  ) : (
                    <div className="flex h-full w-full flex-col items-center justify-center gap-1 text-slate-300">
                      <FileImage className="h-5 w-5" />
                      <span className="text-[9px]">Empty</span>
                    </div>
                  )}
                </div>

                <div className="min-w-0 flex-1">
                  {hasImage ? (
                    <div className="space-y-1">
                      <p className="truncate text-xs font-medium text-navy-900">{ev!.fileName || `${surf.label} image`}</p>
                      <p className="text-[10px] text-slate-500">Evidence: {ev!.id} · {ev!.qualityStatus}</p>
                      <div className="flex flex-wrap gap-1.5">
                        <button onClick={() => setPreview({ surface: surf.key, url: ev!.imageUrl })} className="inline-flex items-center gap-1 rounded-button bg-navy-50 px-2 py-1 text-[10px] font-medium text-navy-700 hover:bg-navy-100">
                          <Maximize2 className="h-3 w-3" /> Preview
                        </button>
                        <button onClick={() => handleReplace(surf.key)} className="inline-flex items-center gap-1 rounded-button bg-slate-100 px-2 py-1 text-[10px] font-medium text-slate-700 hover:bg-slate-200">
                          <RefreshCcw className="h-3 w-3" /> Replace
                        </button>
                        <button onClick={() => { void removeSurfaceImage(surf.key).then(() => addAudit(`${surf.label} evidence removed`, inspection.inspectionId, 'Success')); }} className="inline-flex items-center gap-1 rounded-button bg-violation-50 px-2 py-1 text-[10px] font-medium text-violation-600 hover:bg-violation-100">
                          <Trash2 className="h-3 w-3" /> Remove
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button
                      onClick={() => { setActiveSurface(surf.key); fileInputRef.current?.click(); }}
                      className="inline-flex w-full items-center justify-center gap-2 rounded-button border-2 border-dashed border-slate-300 py-2.5 text-xs font-medium text-slate-600 transition-colors hover:border-govblue-400 hover:bg-govblue-50 hover:text-govblue-700"
                    >
                      <Upload className="h-4 w-4" /> Upload {surf.key === 'Other' ? '(optional)' : 'image'}
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>


      <Card title="Captured Evidence" subtitle={`${uploadedCount} surface(s) uploaded`}>
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
          {SURFACES.map((surf) => {
            const ev = evidenceFor(surf.key);
            const hasImage = !!ev && !!ev.imageUrl && !ev.isPlaceholder;
            return (
              <div key={surf.key} className={`relative flex flex-col items-center gap-1 rounded-button border p-2 ${hasImage ? 'border-compliant-200 bg-compliant-50' : 'border-slate-200 bg-slate-50'}`}>
                {hasImage ? (
                  <img src={ev!.imageUrl} alt={surf.key} className="h-12 w-12 rounded object-cover" />
                ) : (
                  <span className="flex h-12 w-12 items-center justify-center text-slate-300"><FileImage className="h-6 w-6" /></span>
                )}
                <span className="text-[9px] font-medium text-slate-600">{surf.label}</span>
                {hasImage && <Check className="absolute -right-1 -top-1 h-4 w-4 rounded-full bg-compliant-500 text-white" />}
              </div>
            );
          })}
        </div>
      </Card>

      <Button
        onClick={() => { updateStage('SCANNING'); addAudit('Scan completed', inspection.inspectionId, 'Success'); navigate(`/inspection/${inspection.inspectionId}/analyse`); }}
        icon={ChevronRight} fullWidth size="lg"
        disabled={uploadedCount === 0}
      >
        Continue to Analysis
      </Button>
      <div className="flex justify-center">
        {isAuthenticated ? (
          <span className="inline-flex items-center gap-1 rounded-md bg-compliant-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-compliant-700">
            <span className="h-1.5 w-1.5 rounded-full bg-compliant-500" />
            Evidence saved to SATYATAG database
          </span>
        ) : (
          <DemoTag label="DEMO EVIDENCE" />
        )}
      </div>

      <Modal open={!!preview} onClose={() => setPreview(null)} title={preview ? `${preview.surface} — Image Preview` : ''} wide>
        {preview && (
          <div>
            <img src={preview.url} alt={`${preview.surface} preview`} className="w-full rounded-card border border-slate-200 bg-slate-100 object-contain" />
            <p className="mt-2 text-[10px] text-slate-500">Use your browser zoom (Ctrl/Cmd + scroll) to inspect fine detail.</p>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default ScanProductPage;

