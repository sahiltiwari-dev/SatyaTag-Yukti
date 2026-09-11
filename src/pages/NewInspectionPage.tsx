import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ClipboardList, Calendar, MapPin, Tag, Camera, Globe, ArrowRight, Info } from 'lucide-react';
import { PageHeader } from '../components/common/PageHeader';
import { Card, Button } from '../components/common/Button';
import { Stepper } from '../components/common/Stepper';
import { DemoTag } from '../components/common/StatusBadge';
import { useDemo } from '../context/DemoContext';

const NewInspectionPage: React.FC = () => {
  const navigate = useNavigate();
  const { inspection, updateStage } = useDemo();
  const [inspectionType, setInspectionType] = useState<'Routine' | 'Complaint' | 'Follow-up'>('Routine');
  const [mode, setMode] = useState<'Physical Package' | 'Product Listing'>('Physical Package');

  const handleContinue = () => {
    updateStage('SETUP');
    if (mode === 'Product Listing') {
      navigate(`/inspection/${inspection.inspectionId}/listing`);
    } else {
      navigate(`/inspection/${inspection.inspectionId}/scan`);
    }
  };

  return (
    <div className="space-y-5 animate-[fadeIn_0.3s_ease-out]">
      <PageHeader title="New Inspection" subtitle="Set up inspection details to begin" icon={ClipboardList} backTo="/dashboard" />

      <Stepper steps={['Inspection Setup', 'Scan Product', 'Analyse Information', 'View Result']} current={1} />

      <Card title="Inspection Details" subtitle="Auto-generated for this demo inspection">
        <div className="space-y-3">
          <DetailRow icon={Tag} label="Inspection ID" value={inspection.inspectionId} />
          <DetailRow icon={ClipboardList} label="Officer" value={`${inspection.officer.name} (Demo Officer)`} />
          <DetailRow icon={Calendar} label="Date & Time" value={inspection.createdAt} />
          <DetailRow icon={MapPin} label="Location" value={inspection.location} />
        </div>
      </Card>

      <Card title="Inspection Type">
        <div className="flex gap-2">
          {(['Routine', 'Complaint', 'Follow-up'] as const).map((t) => (
            <button key={t} onClick={() => setInspectionType(t)}
              className={`rounded-button px-4 py-2.5 text-sm font-medium transition-colors ${inspectionType === t ? 'bg-govblue-600 text-white' : 'border border-slate-200 bg-white text-slate-600 hover:bg-slate-50'}`}>
              {t}
            </button>
          ))}
        </div>
      </Card>

      <div>
        <h2 className="mb-3 text-sm font-semibold text-navy-900">Inspection Mode</h2>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <button onClick={() => setMode('Physical Package')}
            className={`rounded-card border-2 p-5 text-left transition-all ${mode === 'Physical Package' ? 'border-govblue-500 bg-govblue-50' : 'border-slate-200 bg-white hover:border-slate-300'}`}>
            <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-govblue-100 text-govblue-600">
              <Camera className="h-6 w-6" />
            </div>
            <h3 className="text-sm font-semibold text-navy-900">Physical Package</h3>
            <p className="mt-1 text-xs text-slate-500">Scan the actual packaged commodity</p>
            <div className="mt-3 space-y-1 text-xs text-slate-600">
              <p>📸 Camera capture</p><p>🤖 AI extraction</p><p>⚖ Compliance checks</p>
            </div>
          </button>
          <button onClick={() => setMode('Product Listing')}
            className={`rounded-card border-2 p-5 text-left transition-all ${mode === 'Product Listing' ? 'border-govblue-500 bg-govblue-50' : 'border-slate-200 bg-white hover:border-slate-300'}`}>
            <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-navy-100 text-navy-600">
              <Globe className="h-6 w-6" />
            </div>
            <h3 className="text-sm font-semibold text-navy-900">Product Listing</h3>
            <p className="mt-1 text-xs text-slate-500">Check an online product listing</p>
            <div className="mt-3 space-y-1 text-xs text-slate-600">
              <p>🔗 Enter product link</p><p>📋 Extract listing details</p><p>⚖ Check compliance</p>
            </div>
          </button>
        </div>
      </div>

      <div className="rounded-card border border-govblue-100 bg-govblue-50/50 p-3 flex items-start gap-2">
        <Info className="mt-0.5 h-4 w-4 shrink-0 text-govblue-500" />
        <p className="text-xs text-slate-600">You can scan multiple products in this inspection.</p>
      </div>

      <Button onClick={handleContinue} icon={ArrowRight} fullWidth size="lg">
        Continue to {mode === 'Physical Package' ? 'Scan' : 'Product Listing'}
      </Button>

      <DemoTag label="DEMO MODE" className="mx-auto flex w-fit" />
    </div>
  );
};

const DetailRow: React.FC<{ icon: React.FC<any>; label: string; value: string }> = ({ icon: Icon, label, value }) => (
  <div className="flex items-center gap-3">
    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-500">
      <Icon className="h-4 w-4" />
    </div>
    <div>
      <p className="text-[11px] text-slate-500">{label}</p>
      <p className="text-sm font-medium text-navy-900">{value}</p>
    </div>
  </div>
);

export default NewInspectionPage;
