import React, { useEffect, useState } from 'react';
import { Shield, Search, Filter, Clock, ChevronRight, AlertTriangle, Loader2 } from 'lucide-react';
import { PageHeader } from '../components/common/PageHeader';
import { Card } from '../components/common/Button';
import { useAuth } from '../context/AuthContext';
import * as platform from '../services/platform';

const AuditPage: React.FC = () => {
  const { isAuthenticated } = useAuth();
  const [items, setItems] = useState<platform.AuditItem[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [eventTypes, setEventTypes] = useState<string[]>([]);

  useEffect(() => {
    if (!isAuthenticated) { setLoading(false); return; }
    Promise.all([
      platform.getAuditLog({ limit: 200 }),
      fetch('/api/audit/event-types', { credentials: 'include' }).then(r => r.ok ? r.json() : []),
    ])
      .then(([log, types]) => { setItems(log.items); setTotal(log.total); setEventTypes(types); })
      .catch((e) => setError(e.message || 'Failed to load audit log'))
      .finally(() => setLoading(false));
  }, [isAuthenticated]);

  useEffect(() => {
    if (!isAuthenticated) return;
    setLoading(true);
    platform.getAuditLog({ event_type: typeFilter || undefined, limit: 200 })
      .then((r) => { setItems(r.items); setTotal(r.total); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [typeFilter, isAuthenticated]);

  const eventColor = (et: string) => {
    if (et.includes('CREATED')) return 'bg-compliant-100 text-compliant-700';
    if (et.includes('DECISION')) return 'bg-govblue-100 text-govblue-700';
    if (et.includes('DELETED')) return 'bg-violation-100 text-violation-700';
    if (et.includes('ANALYSIS')) return 'bg-warning-100 text-warning-700';
    if (et.includes('REPORT')) return 'bg-purple-100 text-purple-700';
    return 'bg-slate-100 text-slate-700';
  };

  return (
    <div className="space-y-5 animate-[fadeIn_0.3s_ease-out]">
      <PageHeader title="Audit Trail" subtitle="Recorded system events and actions" icon={Shield} />

      <div className="flex flex-wrap items-center gap-2">
        <button onClick={() => setTypeFilter('')}
          className={`rounded-button px-3 py-1.5 text-xs font-medium transition-colors ${!typeFilter ? 'bg-govblue-600 text-white' : 'border border-slate-200 bg-white text-slate-600 hover:bg-slate-50'}`}>
          All
        </button>
        {eventTypes.slice(0, 8).map((et) => (
          <button key={et} onClick={() => setTypeFilter(et)}
            className={`whitespace-nowrap rounded-button px-3 py-1.5 text-xs font-medium transition-colors ${typeFilter === et ? 'bg-govblue-600 text-white' : 'border border-slate-200 bg-white text-slate-600 hover:bg-slate-50'}`}>
            {et.replace(/_/g, ' ')}
          </button>
        ))}
      </div>

      {loading && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-govblue-500" />
        </div>
      )}

      {error && (
        <Card>
          <div className="flex items-center gap-2 text-sm text-violation-600">
            <AlertTriangle className="h-4 w-4" /> {error}
          </div>
        </Card>
      )}

      {!loading && !error && items.length === 0 && (
        <div className="rounded-card border border-dashed border-slate-300 p-8 text-center">
          <Shield className="mx-auto mb-3 h-8 w-8 text-slate-300" />
          <p className="text-sm text-slate-500">No audit events recorded</p>
          <p className="mt-1 text-xs text-slate-400">Events are logged when inspections are created, analyses are run, and decisions are made.</p>
        </div>
      )}

      <div className="space-y-1.5">
        {items.map((e) => (
          <div key={e.id} className="flex items-center gap-3 rounded-card border border-slate-200 bg-white px-4 py-3">
            <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold ${eventColor(e.event_type)}`}>
              {e.event_type.replace(/_/g, ' ')}
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 text-xs">
                <span className="font-medium text-navy-900">{e.entity_type || '—'}</span>
                {e.entity_id && <span className="font-mono text-slate-400">{e.entity_id.slice(0, 8)}…</span>}
              </div>
              {e.actor_email && <p className="mt-0.5 text-[10px] text-slate-400">by {e.actor_email}</p>}
            </div>
            <div className="text-right text-[10px] text-slate-400">
              {e.created_at && <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{new Date(e.created_at).toLocaleString()}</span>}
            </div>
          </div>
        ))}
      </div>

      <div className="text-center text-xs text-slate-400">
        Showing {items.length} of {total} events
      </div>
    </div>
  );
};

export default AuditPage;
