import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ClipboardList, Calendar, MapPin, Tag, Camera, Globe, ArrowRight, Info } from 'lucide-react';
import { PageHeader } from '../components/common/PageHeader';
import { Card, Button } from '../components/common/Button';
import { Stepper } from '../components/common/Stepper';
import { useDemo } from '../context/DemoContext';
import { useAuth } from '../context/AuthContext';

const NewInspectionPage: React.FC = () => {
  const navigate = useNavigate();
  const { createRealInspection, officer } = useDemo();
  const { user, isAuthenticated } = useAuth();
  const [inspectionType, setInspectionType] = useState<'Routine' | 'Complaint' | 'Follow-up'>('Routine');
  const [mode, setMode] = useState<'Physical Package' | 'Product Listing'>('Physical Package');
  const [location, setLocation] = useState('');
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');

  const handleContinue = async () => {
    setError('');
    if (!isAuthenticated) {
      setError('Please sign in before creating an inspection.');
      return;
    }
    setCreating(true);
    try {
      const created = await createRealInspection(inspectionType, mode, location.trim());
      navigate(mode === 'Product Listing'
        ? `/inspection/${created.inspectionId}/listing`
        : `/inspection/${created.inspectionId}/scan`);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not create the inspection.');
      setCreating(false);
    }
  };

  return (
    <div className="space-y-5 animate-[fadeIn_0.3s_ease-out]">
      <PageHeader title="New Inspection" subtitle="Set up inspection details to begin" icon={ClipboardList} backTo="/dashboard" />

      <Stepper steps={['Inspection Setup', 'Scan Product', 'Analyse Information', 'View Result']} current={1} />

      <Card title="Inspection Details" subtitle="Saved to the SATYATAG database">
        <div className="space-y-3">
          <DetailRow icon={Tag} label="Officer" value={user ? `${user.fullName} (${user.department || 'Enforcement Officer'})` : officer.name} />
          <DetailRow icon={Calendar} label="Date & Time" value={new Date().toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })} />
          <DetailRow icon={MapPin} label="Location" value={location || '—'} />
        </div>
      </Card>

      <Card title="Inspection Location">
        <input
          value={location}
          onChange={(e) => setLocation(e.target.value)}
          placeholder="e.g. Retail Store, Chandni Chowk, Delhi"
          className="w-full rounded-button border border-slate-200 bg-white px-3 py-2.5 text-sm text-navy-900 placeholder-slate-400 focus:border-govblue-500 focus:outline-none focus:ring-1 focus:ring-govblue-500"
        />
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
        <p className="text-xs text-slate-600">You can scan multiple products in this inspection. Records are stored in the SATYATAG database and remain available after refresh.</p>
      </div>

      {error && (
        <div className="rounded-card border border-violation-200 bg-violation-50 p-3 text-sm text-violation-700">
          {error}
        </div>
      )}

      <Button onClick={handleContinue} icon={ArrowRight} fullWidth size="lg" loading={creating}>
        {creating ? 'Creating Inspection…' : `Continue to ${mode === 'Physical Package' ? 'Scan' : 'Product Listing'}`}
      </Button>
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
