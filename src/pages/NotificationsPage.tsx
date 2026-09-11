import React, { useEffect, useState } from 'react';
import { Bell, CheckCheck, Clock, ChevronRight, AlertTriangle, FileText, Shield, Loader2 } from 'lucide-react';
import { PageHeader } from '../components/common/PageHeader';
import { Card } from '../components/common/Button';
import { StatusBadge } from '../components/common/StatusBadge';
import { useAuth } from '../context/AuthContext';
import * as platform from '../services/platform';

const NotificationsPage: React.FC = () => {
  const { isAuthenticated } = useAuth();
  const [items, setItems] = useState<platform.NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isAuthenticated) {
      setLoading(false);
      return;
    }
    platform.getNotifications()
      .then((r) => { setItems(r.items); setUnreadCount(r.unread_count); })
      .catch((e) => setError(e.message || 'Failed to load notifications'))
      .finally(() => setLoading(false));
  }, [isAuthenticated]);

  const handleMarkRead = async (id: string) => {
    try {
      const updated = await platform.markNotificationRead(id);
      setItems((prev) => prev.map((n) => n.id === id ? { ...n, is_read: true } : n));
      setUnreadCount((c) => Math.max(0, c - 1));
    } catch { /* ignore */ }
  };

  const handleMarkAllRead = async () => {
    try {
      await platform.markAllNotificationsRead();
      setItems((prev) => prev.map((n) => ({ ...n, is_read: true })));
      setUnreadCount(0);
    } catch { /* ignore */ }
  };

  const typeIcon = (type: string) => {
    if (type === 'ANALYSIS') return <Bell className="h-4 w-4 text-govblue-500" />;
    if (type === 'INSPECTION') return <FileText className="h-4 w-4 text-compliant-500" />;
    if (type === 'COMPLIANCE') return <Shield className="h-4 w-4 text-warning-500" />;
    return <Bell className="h-4 w-4 text-slate-400" />;
  };

  return (
    <div className="space-y-5 animate-[fadeIn_0.3s_ease-out]">
      <PageHeader title="Notifications" subtitle="System alerts and status updates" icon={Bell} />
      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-600">
          {unreadCount > 0 ? <span className="font-semibold text-navy-900">{unreadCount}</span> : 'No'} unread notification{unreadCount !== 1 ? 's' : ''}
        </p>
        {unreadCount > 0 && (
          <button onClick={handleMarkAllRead} className="inline-flex items-center gap-1.5 rounded-button border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50">
            <CheckCheck className="h-3.5 w-3.5" /> Mark all read
          </button>
        )}
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
          <Bell className="mx-auto mb-3 h-8 w-8 text-slate-300" />
          <p className="text-sm text-slate-500">No notifications yet</p>
          <p className="mt-1 text-xs text-slate-400">Notifications will appear here when inspections are created or analysis completes.</p>
        </div>
      )}

      <div className="space-y-2">
        {items.map((n) => (
          <div key={n.id} className={`rounded-card border p-4 transition-all ${n.is_read ? 'border-slate-200 bg-white' : 'border-govblue-200 bg-govblue-50'}`}>
            <div className="flex items-start gap-3">
              <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-100">
                {typeIcon(n.type)}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-start justify-between gap-2">
                  <p className="text-sm font-semibold text-navy-900">{n.title}</p>
                  {!n.is_read && <span className="h-2 w-2 shrink-0 rounded-full bg-govblue-500" />}
                </div>
                {n.body && <p className="mt-1 text-xs text-slate-600">{n.body}</p>}
                <div className="mt-2 flex items-center gap-3 text-[10px] text-slate-400">
                  {n.created_at && (
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {new Date(n.created_at).toLocaleString()}
                    </span>
                  )}
                  {n.related_inspection_id && (
                    <span className="rounded bg-slate-100 px-1.5 py-0.5 font-mono">{n.related_inspection_id.slice(0, 8)}…</span>
                  )}
                </div>
              </div>
              {!n.is_read && (
                <button onClick={() => handleMarkRead(n.id)} className="shrink-0 rounded-lg px-2 py-1 text-[10px] font-medium text-govblue-600 hover:bg-govblue-100">
                  Mark read
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default NotificationsPage;
