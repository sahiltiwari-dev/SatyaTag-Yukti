import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, ChevronRight, MapPin, Calendar, Building2, FileText, Loader2 } from 'lucide-react';
import { PageHeader } from '../components/common/PageHeader';
import { Button } from '../components/common/Button';
import { StatusBadge } from '../components/common/StatusBadge';
import { useDemo } from '../context/DemoContext';

interface RepoItem {
  id: string;
  product: string;
  status: string;
  location: string;
  date: string;
  score: number;
  image?: string;
  live?: boolean;
}

const RepositoryPage: React.FC = () => {
  const navigate = useNavigate();
  const { allInspections, loadInspection, repositoryOrigin, isRepoLoading } = useDemo();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [opening, setOpening] = useState(false);

  const frontImage = (insp: typeof allInspections[number]) =>
    insp.evidence.find((e) => e.surface === 'Front' && e.imageUrl && !e.isPlaceholder)?.imageUrl
    || insp.evidence.find((e) => e.imageUrl && !e.isPlaceholder)?.imageUrl;

  const toStatus = (insp: typeof allInspections[number]) =>
    insp.officerDecision === 'COMPLIANT' ? 'Compliant'
    : insp.officerDecision === 'NON-COMPLIANT' ? 'Non-Compliant'
    : insp.officerDecision === 'MANUAL REVIEW' ? 'Manual Review'
    : insp.status;

  const repoItems: RepoItem[] = allInspections.map((insp) => ({
    id: insp.inspectionId,
    product: insp.product.name,
    status: toStatus(insp),
    location: insp.location,
    date: insp.decisionDate || insp.createdAt,
    score: insp.analyticsScore,
    image: frontImage(insp),
  }));

  const filters = ['ALL', 'Draft', 'In Progress', 'Under Review', 'Manual Review', 'Compliant', 'Non-Compliant'];

  const filtered = repoItems.filter((item) => {
    if (search && !item.product.toLowerCase().includes(search.toLowerCase()) && !item.id.toLowerCase().includes(search.toLowerCase())) return false;
    if (statusFilter !== 'ALL' && item.status !== statusFilter) return false;
    return true;
  });

  const openInspection = async (id: string) => {
    if (repositoryOrigin !== 'backend') {
      navigate(`/inspection/${id}/result`);
      return;
    }
    setOpening(true);
    try {
      await loadInspection(id);
      navigate(`/inspection/${id}/result`);
    } catch (e) {
      console.error('Could not open inspection.', e);
    } finally {
      setOpening(false);
    }
  };

  return (
    <div className="space-y-5 animate-[fadeIn_0.3s_ease-out]">
      <PageHeader title="Inspection Repository" subtitle="Browse and search inspections from the SATYATAG database" icon={Building2} />

      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by ID or product name..."
            className="w-full rounded-button border border-slate-200 bg-white pl-9 pr-3 py-2.5 text-sm text-navy-900 placeholder-slate-400 focus:border-govblue-500 focus:outline-none focus:ring-1 focus:ring-govblue-500" />
        </div>
      </div>

      <div className="flex gap-1.5 overflow-x-auto pb-1">
        {filters.map((s) => (
          <button key={s} onClick={() => setStatusFilter(s)}
            className={`whitespace-nowrap rounded-button px-3 py-1.5 text-xs font-medium transition-colors ${statusFilter === s ? 'bg-govblue-600 text-white' : 'border border-slate-200 bg-white text-slate-600 hover:bg-slate-50'}`}>
            {s}
          </button>
        ))}
      </div>

      {isRepoLoading && (
        <div className="flex items-center gap-2 rounded-card border border-slate-200 bg-white p-4 text-sm text-slate-500">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading inspections from database…
        </div>
      )}

      <div className="space-y-2">
        {filtered.map((item) => (
          <button key={item.id} onClick={() => openInspection(item.id)} disabled={opening}
            className="w-full rounded-card border border-slate-200 bg-white p-4 text-left transition-all hover:shadow-card">
            <div className="flex items-start gap-3">
              {item.image ? (
                <img src={item.image} alt={item.product} className="h-14 w-16 shrink-0 rounded-button object-cover" />
              ) : (
                <span className="flex h-14 w-16 shrink-0 items-center justify-center rounded-button bg-navy-50 text-2xl">📦</span>
              )}
              <div className="min-w-0 flex-1">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-navy-900">{item.product}</p>
                    <p className="text-[11px] font-mono text-slate-500">{item.id}</p>
                  </div>
                  <StatusBadge status={item.status} small />
                </div>
                <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-slate-500">
                  <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{item.location}</span>
                  <span className="flex items-center gap-1"><Calendar className="h-3 w-3" />{item.date}</span>
                </div>
                <div className="mt-2 flex items-center justify-between">
                  <span className="text-[11px] text-slate-500">Score: <span className="font-semibold text-navy-900">{item.score}/100</span> <span className="text-[9px] text-slate-400">(informational)</span></span>
                  <ChevronRight className="h-4 w-4 text-slate-400" />
                </div>
              </div>
            </div>
          </button>
        ))}
      </div>

      {!isRepoLoading && filtered.length === 0 && (
        <div className="rounded-card border border-dashed border-slate-300 p-8 text-center">
          <p className="text-sm text-slate-500">No inspections match your filters</p>
        </div>
      )}

      {allInspections.length > 0 && (
        <Button variant="outline" fullWidth icon={FileText} onClick={() => openInspection(allInspections[allInspections.length - 1].inspectionId)}>
          Open Inspection Report
        </Button>
      )}
    </div>
  );
};

export default RepositoryPage;