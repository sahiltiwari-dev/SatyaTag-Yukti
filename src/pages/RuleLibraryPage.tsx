import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, BookOpen, ChevronRight, ShieldCheck, Cpu, Clock } from 'lucide-react';
import { PageHeader } from '../components/common/PageHeader';
import { StatusBadge, DemoTag } from '../components/common/StatusBadge';
import { demoRules } from '../data/demoRules';

const RuleLibraryPage: React.FC = () => {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('ALL');

  const cats = ['ALL', ...Array.from(new Set(demoRules.map((r) => r.category)))];
  const filtered = demoRules.filter((r) => {
    if (search && !r.title.toLowerCase().includes(search.toLowerCase()) && !r.ruleId.includes(search) && !r.description.toLowerCase().includes(search.toLowerCase()) && !(r.subcategory || '').toLowerCase().includes(search.toLowerCase())) return false;
    if (category !== 'ALL' && r.category !== category) return false;
    return true;
  });

  return (
    <div className="space-y-5 animate-[fadeIn_0.3s_ease-out]">
      <PageHeader title="Rule Library" subtitle="Legal Metrology rules and regulatory knowledge base" icon={BookOpen} />
      <DemoTag label="DEMO RULE DATA" className="w-fit" />

      <div className="rounded-card border border-warning-100 bg-warning-50/60 p-3">
        <p className="text-xs text-slate-600">
          <span className="font-semibold text-warning-700">DEMO / REQUIRES VERIFICATION:</span> This rule pack simulates the
          Legal Metrology (Packaged Commodities) Rules framework for the Lay's packaged-food demo. It is illustrative
          demo content, not an official government database.
        </p>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search rules by ID, title, category or subcategory..."
          className="w-full rounded-button border border-slate-200 bg-white pl-9 pr-3 py-2.5 text-sm text-navy-900 placeholder-slate-400 focus:border-govblue-500 focus:outline-none focus:ring-1 focus:ring-govblue-500" />
      </div>

      <div className="flex gap-1.5 overflow-x-auto pb-1">
        {cats.map((c) => (
          <button key={c} onClick={() => setCategory(c)}
            className={`whitespace-nowrap rounded-button px-3 py-1.5 text-xs font-medium transition-colors ${category === c ? 'bg-govblue-600 text-white' : 'border border-slate-200 bg-white text-slate-600'}`}>
            {c}
          </button>
        ))}
      </div>

      <div className="space-y-2">
        {filtered.map((rule) => (
          <button key={rule.id} onClick={() => navigate(`/rules/${rule.id}`)}
            className="w-full rounded-card border border-slate-200 bg-white p-4 text-left transition-all hover:shadow-card">
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-start gap-2">
                <ShieldCheck className={`mt-0.5 h-4 w-4 shrink-0 ${rule.checkType === 'CONSISTENCY' ? 'text-warning-500' : rule.severity === 'MAJOR' ? 'text-violation-500' : 'text-govblue-500'}`} />
                <div>
                  <p className="text-sm font-semibold text-navy-900">{rule.title}</p>
                  <p className="mt-1 text-[11px] text-slate-600 line-clamp-2">{rule.description}</p>
                </div>
              </div>
              <ChevronRight className="h-4 w-4 shrink-0 text-slate-400" />
            </div>
            <div className="mt-2 flex flex-wrap items-center gap-1.5">
              <span className="rounded bg-slate-100 px-2 py-0.5 font-mono text-[10px] font-medium text-slate-600">{rule.ruleId}</span>
              <StatusBadge status={rule.severity} small />
              <StatusBadge status={rule.status} small />
              <span className="rounded bg-govblue-50 px-2 py-0.5 text-[10px] font-medium text-govblue-700">{rule.category}{rule.subcategory !== 'All' ? ` / ${rule.subcategory}` : ''}</span>
              <span className="flex items-center gap-1 rounded bg-navy-50 px-2 py-0.5 text-[10px] font-medium text-navy-700"><Cpu className="h-3 w-3" />{rule.checkType}</span>
              <span className="flex items-center gap-1 rounded bg-slate-50 px-2 py-0.5 text-[10px] font-medium text-slate-500"><Clock className="h-3 w-3" />v{rule.version} · {rule.effectiveFrom}</span>
            </div>
            <div className="mt-2 flex items-center gap-2 text-[10px] text-slate-500">
              <span>{rule.machineCheckable ? 'Machine-checkable' : 'Requires officer review'}</span>
              <span>·</span>
              <span>Source: {rule.sourceAuthority}</span>
            </div>
          </button>
        ))}
      </div>

      {filtered.length === 0 && (
        <div className="rounded-card border border-dashed border-slate-300 p-8 text-center">
          <p className="text-sm text-slate-500">No rules found</p>
        </div>
      )}
    </div>
  );
};

export default RuleLibraryPage;