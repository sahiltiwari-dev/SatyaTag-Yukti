import React, { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Globe, Link2, ArrowRight, Upload, Info } from 'lucide-react';
import { PageHeader } from '../components/common/PageHeader';
import { Stepper } from '../components/common/Stepper';
import { Card, Button } from '../components/common/Button';
import { DemoTag } from '../components/common/StatusBadge';
import { useDemo } from '../context/DemoContext';
import { useAuth } from '../context/AuthContext';

const DEMO_LISTINGS = [
  { title: 'MWare — Maggi Noodles 70g', url: 'https://mware.in/p/maggi-2-minute-noodles-70g', danger: false },
  { title: 'ShopFast — Surf Excel Detergent 500ml', url: 'https://shopfast.in/p/surf-excel-500ml', danger: true },
  { title: 'BayBazaar — Amul Butter 100g', url: 'https://baybazaar.in/p/amul-butter-100g', danger: false },
  { title: 'KartWale — Britannia Good Day 250g', url: 'https://kartwale.in/p/good-day-250g', danger: true },
];

const ListingSetupPage: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const { updateStage, addAudit } = useDemo();
  const { isAuthenticated } = useAuth();
  const [url, setUrl] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handleContinue = () => {
    if (!url.trim()) {
      setError('Please enter a product listing URL or pick a demo listing.');
      return;
    }
    updateStage('ANALYSING');
    addAudit('Listing URL added', id || 'listing', 'Success');
    navigate(`/inspection/${id}/listing/analyse`, { state: { url } });
  };

  return (
    <div className="space-y-5 animate-[fadeIn_0.3s_ease-out]">
      <PageHeader title="Product Listing Check" subtitle="Check an online product listing" icon={Globe} backTo="/inspection/new" />
      <Stepper steps={['Inspection Setup', 'Listing Link', 'Analyse Listing', 'View Result']} current={2} />

      <Card>
        <div className="space-y-4">
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-slate-700">Product Listing URL</span>
            <div className="relative">
              <Link2 className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                type="url"
                value={url}
                onChange={(e) => { setUrl(e.target.value); setError(null); }}
                placeholder="https://marketplace.in/product/... (demo)"
                className="w-full rounded-button border border-slate-200 bg-white py-2.5 pl-9 pr-3 text-sm text-navy-900 placeholder-slate-400 focus:border-govblue-500 focus:outline-none focus:ring-1 focus:ring-govblue-500"
              />
            </div>
          </label>

          <div>
            <p className="mb-2 text-xs font-semibold text-navy-900">Or pick a demo listing (no live fetch)</p>
            <div className="space-y-2">
              {DEMO_LISTINGS.map((l) => (
                <button
                  key={l.url}
                  onClick={() => setUrl(l.url)}
                  className={`w-full rounded-button border p-3 text-left transition-colors ${url === l.url ? 'border-govblue-400 bg-govblue-50' : 'border-slate-200 bg-white hover:bg-slate-50'}`}
                >
                  <p className="text-xs font-medium text-navy-900">{l.title}</p>
                  <p className="mt-0.5 text-[10px] font-mono text-slate-500">{l.url}</p>
                </button>
              ))}
            </div>
          </div>
        </div>
      </Card>

      {error && <p className="text-xs font-medium text-violation-600">{error}</p>}

      <div className="flex gap-2">
        <Button variant="outline" icon={Upload} fullWidth onClick={() => setUrl(DEMO_LISTINGS[0].url)}>
          Use First Demo Listing
        </Button>
        <Button onClick={handleContinue} icon={ArrowRight} fullWidth size="lg">
          Analyze Listing
        </Button>
      </div>

      <div className="rounded-card border border-govblue-100 bg-govblue-50/50 p-3 flex items-start gap-2">
        <Info className="mt-0.5 h-4 w-4 shrink-0 text-govblue-500" />
        <p className="text-xs text-slate-600">
          Online listings may omit mandatory declarations. SatyaTag flags missing fields as non-compliant with the applicable Legal Metrology rules.
        </p>
      </div>

      {isAuthenticated ? <DemoTag label="LIVE LISTING FLOW" className="mx-auto flex w-fit" /> : <DemoTag label="DEMO LISTING FLOW" className="mx-auto flex w-fit" />}
    </div>
  );
};

export default ListingSetupPage;