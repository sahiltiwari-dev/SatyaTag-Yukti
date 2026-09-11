import React, { useEffect, useState } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { Globe, CheckCircle2, XCircle, AlertTriangle, ChevronRight, ScanSearch } from 'lucide-react';
import { PageHeader } from '../components/common/PageHeader';
import { Stepper } from '../components/common/Stepper';
import { Card, Button } from '../components/common/Button';
import { StatusBadge, DemoTag } from '../components/common/StatusBadge';
import { useDemo } from '../context/DemoContext';

interface ListingDetail {
  label: string;
  value: string;
  status: 'OK' | 'MISSING';
}

const ListingAnalysePage: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const location = useLocation();
  const { updateStage, addAudit } = useDemo();
  const url = (location.state as { url?: string } | null)?.url || 'https://mware.in/p/maggi-2-minute-noodles-70g';

  const [phase, setPhase] = useState<'extracting' | 'analyzing' | 'done'>('extracting');
  const [details, setDetails] = useState<ListingDetail[]>([]);

  useEffect(() => {
    let t1: ReturnType<typeof setTimeout>;
    let t2: ReturnType<typeof setTimeout>;
    t1 = setTimeout(() => {
      setPhase('analyzing');
      const missing = url.includes('surf') || url.includes('good-day');
      setDetails([
        { label: 'Product Name', value: 'Surf Excel Detergent 500ml', status: 'OK' },
        { label: 'MRP', value: missing ? 'Not displayed' : '₹145.00', status: missing ? 'MISSING' : 'OK' },
        { label: 'Net Quantity', value: missing ? 'Not displayed' : '500 ml', status: missing ? 'MISSING' : 'OK' },
        { label: 'Manufacturer Details', value: 'Not displayed', status: 'MISSING' },
        { label: 'Date of Manufacture', value: 'Not applicable (fake data)', status: 'OK' },
        { label: 'Country of Origin', value: missing ? 'Not displayed' : 'India', status: missing ? 'MISSING' : 'OK' },
      ]);
      addAudit('Listing extracted', url, 'Success');
    }, 1400);
    t2 = setTimeout(() => setPhase('done'), 2600);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, [url, addAudit]);

  const missCount = details.filter((d) => d.status === 'MISSING').length;

  const handleResult = () => {
    updateStage('EXTRACTED');
    navigate(`/inspection/${id}/result`);
  };

  return (
    <div className="space-y-5 animate-[fadeIn_0.3s_ease-out]">
      <PageHeader title="Listing Analysis" subtitle="AI extraction from online listing" icon={ScanSearch} backTo={`/inspection/${id}/listing`} />
      <Stepper steps={['Inspection Setup', 'Listing Link', 'Analyse Listing', 'View Result']} current={3} />

      <div className="rounded-card border border-slate-200 bg-white p-3">
        <p className="text-[10px] text-slate-400">TARGET LISTING</p>
        <p className="truncate text-xs font-mono text-navy-900">{url}</p>
      </div>

      {phase !== 'done' && (
        <Card padded className="text-center">
          <div className="mb-3 flex justify-center">
            <div className="h-10 w-10 animate-spin rounded-full border-2 border-govblue-500 border-t-transparent" />
          </div>
          <p className="text-sm font-medium text-navy-900">
            {phase === 'extracting' ? 'Extracting listing fields...' : 'Running compliance checks...'}
          </p>
          <p className="mt-1 text-xs text-slate-500">
            {phase === 'extracting' ? 'Reading product name, MRP, net quantity, seller info' : 'Comparing against Legal Metrology rules'}
          </p>
        </Card>
      )}

      {phase === 'done' && (
        <>
          <Card title="Extracted Listing Details" subtitle="Fields surfaced from the product page">
            <div className="space-y-2">
              {details.map((d) => (
                <div key={d.label} className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2">
                  <div>
                    <p className="text-[10px] text-slate-500">{d.label}</p>
                    <p className="text-xs font-medium text-navy-900">{d.value}</p>
                  </div>
                  {d.status === 'OK'
                    ? <CheckCircle2 className="h-5 w-5 text-compliant-500" />
                    : <XCircle className="h-5 w-5 text-violation-500" />}
                </div>
              ))}
            </div>
          </Card>

          <div className={`rounded-card border-2 p-5 ${missCount > 0 ? 'border-violation-200 bg-violation-50' : 'border-compliant-200 bg-compliant-50'}`}>
            <div className="flex items-center gap-3">
              {missCount > 0
                ? <AlertTriangle className="h-8 w-8 text-violation-500" />
                : <CheckCircle2 className="h-8 w-8 text-compliant-500" />}
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Listing Compliance</p>
                <p className="text-xl font-bold text-navy-900">
                  {missCount > 0 ? `${missCount} mandatory declaration${missCount === 1 ? '' : 's'} missing` : 'All declarations present'}
                </p>
              </div>
            </div>
          </div>

          <Card title="Applies to Online Listings" subtitle="Declaration rules checked (simplified)">
            <div className="space-y-2">
              {['MRP displayed', 'Net quantity displayed', 'Manufacturer details provided', 'Country of origin declared'].map((r) => (
                <div key={r} className="flex items-center justify-between rounded-lg border border-slate-100 px-3 py-2 text-xs">
                  <span className="text-slate-600">{r}</span>
                  <StatusBadge status={missCount > 0 && (r === 'MRP displayed' || r === 'Manufacturer details provided') ? 'Non-Compliant' : 'Compliant'} small />
                </div>
              ))}
            </div>
          </Card>

          <Button onClick={handleResult} icon={ChevronRight} fullWidth size="lg">
            View Compliance Result
          </Button>
          <DemoTag label="DEMO LISTING EXTRACTION" className="mx-auto flex w-fit" />
        </>
      )}
    </div>
  );
};

export default ListingAnalysePage;
