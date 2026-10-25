import React, { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import {
  Home, ClipboardList, Plus, FileText, BarChart3, BookOpen, User, LogOut, RotateCcw,
  Bell, Menu, X, ShieldCheck, Settings, Shield,
} from 'lucide-react';
import { SatyaTagLogo, GovHeader } from '../Brand';
import { useDemo } from '../../context/DemoContext';
import { useAuth } from '../../context/AuthContext';
import * as platform from '../../services/platform';

export const AppShell: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { resetDemo, inspection } = useDemo();
  const { logout, isAuthenticated, user } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [notifications, setNotifications] = useState<platform.NotificationItem[]>([]);
  const [unread, setUnread] = useState(0);
  const notifRef = useRef<HTMLDivElement>(null);
  const mobileMenuRef = useRef<HTMLDivElement>(null);

  // Load real notifications from the backend when authenticated.
  useEffect(() => {
    if (!isAuthenticated) return;
    platform.getNotifications().then((r) => {
      setNotifications(r.items.slice(0, 8));
      setUnread(r.unread_count);
    }).catch(() => {
      setNotifications([]);
      setUnread(0);
    });
  }, [isAuthenticated]);

  useEffect(() => {
    setMobileMenuOpen(false);
    setNotifOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) setNotifOpen(false);
      if (mobileMenuRef.current && !mobileMenuRef.current.contains(e.target as Node)) setMobileMenuOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const desktopNav = [
    { label: 'Dashboard', path: '/dashboard', icon: Home },
    ...(user?.role === 'admin' ? [{ label: 'Admin Users', path: '/admin/users', icon: Shield }] : []),
    { label: 'New Inspection', path: '/inspection/new', icon: ClipboardList, accent: true },
    { label: 'Inspections', path: '/inspections', icon: FileText },
    { label: 'Analytics', path: '/analytics', icon: BarChart3 },
    { label: 'Rule Library', path: '/rules', icon: BookOpen },
    { label: 'Notifications', path: '/notifications', icon: Bell },
    { label: 'Audit Trail', path: '/audit', icon: ShieldCheck },
    { label: 'Profile', path: '/profile', icon: User },
    { label: 'Settings', path: '/settings', icon: Settings },
  ];

  const isActive = (path: string) => {
    if (path === '/dashboard') return location.pathname === '/dashboard';
    if (path === '/inspections') return location.pathname.startsWith('/inspections');
    return location.pathname.startsWith(path);
  };
const handleReset = () => {
    resetDemo();
    navigate('/dashboard');
    setMobileMenuOpen(false);
    setNotifOpen(false);
  };

  const stageBadge = inspection.stage !== 'IDLE' ? (
    <button
      onClick={() => navigate('/inspection/new')}
      className="hidden items-center gap-2 rounded-full border border-govblue-200 bg-govblue-50 px-3 py-1 text-[11px] font-medium text-govblue-700 lg:inline-flex"
    >
      <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-govblue-500" />
      Inspection: {inspection.stage.toLocaleLowerCase().replace(/_/g, ' ')}
    </button>
  ) : null;

  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-2.5 md:px-6">
          <Link to="/dashboard" className="shrink-0"><SatyaTagLogo size="sm" /></Link>
          <div className="hidden items-center gap-3 md:flex">
            {stageBadge}
            <button onClick={() => setNotifOpen((o) => !o)} className="relative rounded-lg p-2 text-slate-600 hover:bg-slate-100" aria-label="Notifications">
              <Bell className="h-5 w-5" />
              {unread > 0 && <span className="absolute right-1 top-1 flex h-2 w-2 rounded-full bg-violation-500" />}
            </button>
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-navy-800 text-sm font-semibold text-white" title="A. Sharma">AS</div>
          </div>
          <div className="flex items-center gap-1 md:hidden">
            <button onClick={() => setNotifOpen((o) => !o)} className="relative rounded-lg p-2 text-slate-600 hover:bg-slate-100" aria-label="Notifications">
              <Bell className="h-5 w-5" />
              {unread > 0 && <span className="absolute right-1 top-1 flex h-2 w-2 rounded-full bg-violation-500" />}
            </button>
            <button onClick={() => setMobileMenuOpen((o) => !o)} className="rounded-lg p-2 text-slate-600 hover:bg-slate-100" aria-label="Menu">
              {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>
        <div className="border-t border-slate-100 px-4 py-1.5 md:hidden">
          <GovHeader compact />
        </div>

        {notifOpen && (
          <div ref={notifRef} className="absolute right-2 top-16 z-50 w-80 rounded-card border border-slate-200 bg-white p-3 shadow-xl md:right-6">
            <div className="mb-2 flex items-center justify-between">
              <p className="text-sm font-semibold text-navy-900">Notifications</p>
              <button onClick={() => navigate('/notifications')} className="text-[10px] font-medium text-govblue-600 hover:text-govblue-700">
                View all {unread > 0 && <span className="ml-0.5 rounded-full bg-govblue-600 px-1.5 text-[9px] font-semibold text-white">{unread}</span>}
              </button>
            </div>
            <div className="max-h-72 space-y-2 overflow-y-auto text-sm">
              {notifications.length === 0 ? (
                <p className="rounded-lg bg-slate-50 p-2.5 text-slate-600">No notifications yet.</p>
              ) : (
                notifications.map((n) => (
                  <button key={n.id}
                    onClick={() => {
                      setNotifOpen(false);
                      if (n.related_inspection_id) navigate(`/inspection/${n.related_inspection_id}/result`);
                    }}
                    className={`block w-full rounded-lg p-2.5 text-left text-slate-600 transition-colors hover:bg-slate-100 ${!n.is_read ? 'bg-govblue-50' : 'bg-slate-50'}`}>
                    <span className="block font-medium text-navy-800">{n.title}</span>
                    {n.body && <span className="mt-0.5 block text-xs text-slate-500">{n.body}</span>}
                  </button>
                ))
              )}
            </div>
          </div>
        )}
      </header>
<div className="mx-auto flex w-full max-w-7xl flex-1 gap-6 px-4 py-5 md:px-6">
        <aside className="hidden w-60 shrink-0 lg:block">
          <nav className="sticky top-24 space-y-1">
            {desktopNav.map((item) => {
              const Icon = item.icon;
              const active = isActive(item.path);
              const isNew = (item as any).accent;
              return (
                <button
                  key={item.label}
                  onClick={() => navigate(item.path)}
                  className={`flex w-full items-center gap-3 rounded-button px-3.5 py-2.5 text-left text-sm font-medium transition-colors ${
                    active ? 'bg-govblue-50 text-govblue-700' : 'text-slate-600 hover:bg-slate-100'
                  } ${isNew ? 'border border-govblue-200 bg-govblue-50 text-govblue-700' : ''}`}
                >
                  <Icon className={`h-5 w-5 ${isNew || active ? 'text-govblue-600' : 'text-slate-400'}`} />
                  {item.label}
                </button>
              );
            })}
            <div className="mt-4 border-t border-slate-200 pt-3">
              <p className="mb-1 px-3 text-[10px] font-semibold uppercase tracking-wide text-slate-400">Demo Controls</p>
              <button onClick={handleReset} className="flex w-full items-center gap-3 rounded-button px-3.5 py-2.5 text-left text-sm font-medium text-slate-500 hover:bg-slate-100">
                <RotateCcw className="h-5 w-5 text-slate-400" /> Reset Demo
              </button>
              <button onClick={() => { logout(); navigate('/login'); }} className="flex w-full items-center gap-3 rounded-button px-3.5 py-2.5 text-left text-sm font-medium text-slate-500 hover:bg-slate-100">
                <LogOut className="h-5 w-5 text-slate-400" /> Logout
              </button>
            </div>
          </nav>
        </aside>
        <main className="min-w-0 flex-1 pb-24 lg:pb-8">{children}</main>
      </div>
<nav className="fixed inset-x-0 bottom-0 z-40 border-t border-slate-200 bg-white shadow-nav md:hidden" aria-label="Bottom navigation">
        <div className="mx-auto flex max-w-md items-center justify-around px-2 py-1.5">
          <BottomItem label="Home" icon={Home} path="/dashboard" navigate={navigate} active={location.pathname === '/dashboard'} />
          <BottomItem label="Inspections" icon={FileText} path="/inspections" navigate={navigate} active={location.pathname.startsWith('/inspections')} />
          <button
            onClick={() => navigate('/inspection/new')}
            className="relative -mt-6 flex h-14 w-14 items-center justify-center rounded-full bg-govblue-600 text-white shadow-lg transition-transform hover:scale-105 active:scale-95"
            aria-label="New Inspection"
          >
            <Plus className="h-7 w-7" />
          </button>
          <BottomItem label="Repository" icon={FileText} path="/inspections" navigate={navigate} active={false} />
          <button
            onClick={() => setMobileMenuOpen((o) => !o)}
            className={`flex flex-1 flex-col items-center gap-0.5 py-1.5 text-[10px] font-medium ${mobileMenuOpen ? 'text-govblue-600' : 'text-slate-500'}`}
            aria-label="More"
          >
            <span className="flex h-6 w-6 items-center justify-center"><span className="flex h-5 w-5 items-center justify-center rounded-full text-sm font-bold">···</span></span>
            More
          </button>
        </div>
      </nav>

      {mobileMenuOpen && (
        <div
          ref={mobileMenuRef}
          className="fixed bottom-16 left-0 right-0 z-40 mx-auto max-w-md rounded-t-card border-t border-slate-200 bg-white p-4 shadow-nav md:hidden"
        >
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">More</p>
          <div className="grid grid-cols-2 gap-2">
            {user?.role === 'admin' && <MenuTile icon={Shield} label="Admin Users" onClick={() => navigate('/admin/users')} />}
            <MenuTile icon={BarChart3} label="Analytics" onClick={() => navigate('/analytics')} />
            <MenuTile icon={BookOpen} label="Rule Library" onClick={() => navigate('/rules')} />
            <MenuTile icon={Bell} label="Notifications" onClick={() => navigate('/notifications')} />
            <MenuTile icon={ShieldCheck} label="Audit Trail" onClick={() => navigate('/audit')} />
            <MenuTile icon={User} label="Profile" onClick={() => navigate('/profile')} />
            <MenuTile icon={Settings} label="Settings" onClick={() => navigate('/settings')} />
          </div>
          <div className="mt-3 space-y-1 border-t border-slate-100 pt-3">
            <button onClick={handleReset} className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100">
              <RotateCcw className="h-4 w-4 text-govblue-600" /> Reset Demo
            </button>
            <button onClick={() => { logout(); navigate('/login'); }} className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-violation-600 hover:bg-violation-50">
              <LogOut className="h-4 w-4" /> Logout
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

const BottomItem: React.FC<{ label: string; icon: any; path: string; navigate: any; active: boolean }> = ({ label, icon: Icon, path, navigate, active }) => (
  <button
    onClick={() => navigate(path)}
    className={`flex flex-col items-center gap-0.5 px-2 py-1.5 text-[10px] font-medium transition-colors ${active ? 'text-govblue-600' : 'text-slate-500'}`}
  >
    <Icon className={`h-6 w-6 ${active ? 'text-govblue-600' : 'text-slate-400'}`} />
    {label}
  </button>
);

const MenuTile: React.FC<{ icon: any; label: string; onClick: () => void }> = ({ icon: Icon, label, onClick }) => (
  <button onClick={onClick} className="flex flex-col items-center gap-1.5 rounded-card border border-slate-200 bg-white px-3 py-3 text-xs font-medium text-slate-700 hover:bg-slate-50">
    <Icon className="h-5 w-5 text-govblue-600" />
    {label}
  </button>
);
