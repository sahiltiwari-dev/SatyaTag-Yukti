import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { User, MapPin, Bell, Lock, ShieldCheck, LogOut, CheckCircle2, ChevronRight, HelpCircle, Info, Mail, Phone, FileText, Eye, EyeOff } from 'lucide-react';
import { PageHeader } from '../components/common/PageHeader';
import { Card, Button } from '../components/common/Button';
import { StatusBadge, DemoTag } from '../components/common/StatusBadge';
import { useDemo } from '../context/DemoContext';
import { useAuth } from '../context/AuthContext';

const ProfilePage: React.FC = () => {
  const navigate = useNavigate();
  const { officer, resetDemo } = useDemo();
  const { user, logout, changePassword } = useAuth();
  const [showChangePwd, setShowChangePwd] = useState(false);
  const [currentPwd, setCurrentPwd] = useState('');
  const [newPwd, setNewPwd] = useState('');
  const [confirmPwd, setConfirmPwd] = useState('');
  const [showCurrentPwd, setShowCurrentPwd] = useState(false);
  const [showNewPwd, setShowNewPwd] = useState(false);
  const [pwdError, setPwdError] = useState('');
  const [pwdSuccess, setPwdSuccess] = useState(false);
  const [pwdLoading, setPwdLoading] = useState(false);
  const [saved, setSaved] = useState(false);
  const [prefs, setPrefs] = useState({ notifications: true, compactMode: false, darkMode: false, biometric: true });

  const handleSave = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const togglePref = (key: keyof typeof prefs) => setPrefs((p) => ({ ...p, [key]: !p[key] }));

  const handleSignOut = () => {
    logout();
    navigate('/login');
  };

  const handleChangePassword = async () => {
    setPwdError('');
    setPwdSuccess(false);
    if (!currentPwd || !newPwd || !confirmPwd) { setPwdError('All fields are required'); return; }
    if (newPwd !== confirmPwd) { setPwdError('New passwords do not match'); return; }
    if (newPwd.length < 6) { setPwdError('New password must be at least 6 characters'); return; }
    setPwdLoading(true);
    const result = await changePassword(currentPwd, newPwd);
    setPwdLoading(false);
    if (!result.success) { setPwdError(result.error || 'Failed'); return; }
    setPwdSuccess(true);
    setCurrentPwd(''); setNewPwd(''); setConfirmPwd('');
    setTimeout(() => { setPwdSuccess(false); setShowChangePwd(false); }, 2000);
  };

  return (
    <div className="space-y-5 animate-[fadeIn_0.3s_ease-out]">
      <PageHeader title="Officer Profile" subtitle="Manage your profile and preferences" icon={User} />

      {/* Profile card */}
      <Card>
        <div className="flex flex-col items-center py-2 text-center">
          <div className="flex h-20 w-20 items-center justify-center rounded-full bg-govblue-100 text-2xl font-bold text-govblue-700">{officer.avatarInitials}</div>
          <h3 className="mt-3 text-base font-bold text-navy-900">{officer.displayName}</h3>
          <p className="text-xs text-slate-500">{officer.role}</p>
          <div className="mt-2"><StatusBadge status={officer.status} small /></div>
        </div>
        <div className="mt-4 space-y-2 border-t border-slate-100 pt-3 text-xs">
          <ProfileRow label="Department" value={officer.department} />
          <ProfileRow label="Jurisdiction" value={officer.jurisdiction} />
          <ProfileRow label="Email" value={user?.email || officer.email} />
          <ProfileRow label="Employee ID" value={user?.employeeId || officer.id} />
          <ProfileRow label="Account Status" value={user?.emailVerified ? 'Verified' : 'Pending Verification'} />
          {user?.lastLogin && <ProfileRow label="Last Login" value={new Date(user.lastLogin).toLocaleString()} />}
        </div>
      </Card>

      <DemoTag label="DEMO OFFICER" className="w-fit" />

      {/* Preferences */}
      <Card title="Preferences" subtitle="Demo settings (not persisted server-side)">
        {[
          { key: 'notifications' as const, label: 'Push notifications', desc: 'Get notified of inspection updates', icon: Bell },
          { key: 'compactMode' as const, label: 'Compact Mode', desc: 'Show denser information layouts', icon: MapPin },
          { key: 'darkMode' as const, label: 'Dark Mode', desc: 'Reduce eye strain in low light', icon: Lock },
          { key: 'biometric' as const, label: 'Biometric Sign-in', desc: 'Use fingerprint or face to unlock', icon: ShieldCheck },
        ].map((t) => (
          <label key={t.key} className="mb-2 flex items-center justify-between rounded-lg border border-slate-200 p-3 last:mb-0">
            <div className="flex items-center gap-3">
              <t.icon className="h-4 w-4 text-slate-400" />
              <div>
                <p className="text-xs font-medium text-navy-900">{t.label}</p>
                <p className="text-[10px] text-slate-500">{t.desc}</p>
              </div>
            </div>
            <button onClick={() => togglePref(t.key)} aria-label={t.label}
              className={`relative h-6 w-11 rounded-full transition-colors ${prefs[t.key] ? 'bg-govblue-600' : 'bg-slate-300'}`}>
              <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all ${prefs[t.key] ? 'left-[22px]' : 'left-0.5'}`} />
            </button>
          </label>
        ))}
      </Card>

      {/* Security */}
      <Card title="Security" icon={Lock}>
        <button onClick={() => setShowChangePwd(!showChangePwd)}
          className="flex w-full items-center justify-between rounded-lg border border-slate-200 p-3 text-left transition-colors hover:bg-slate-50">
          <span className="text-xs font-medium text-navy-900">Change Password</span>
          <ChevronRight className={`h-4 w-4 text-slate-400 transition-transform ${showChangePwd ? 'rotate-90' : ''}`} />
        </button>
        {showChangePwd && (
          <div className="mt-3 space-y-3 rounded-lg border border-slate-200 bg-slate-50 p-3">
            <label className="block">
              <span className="mb-1 block text-xs font-medium text-slate-600">Current Password</span>
              <div className="relative">
                <input type={showCurrentPwd ? 'text' : 'password'} value={currentPwd} onChange={(e) => setCurrentPwd(e.target.value)}
                  className="w-full rounded border border-slate-300 px-3 py-2 text-xs text-navy-900 placeholder-slate-400 focus:border-govblue-500 focus:outline-none" placeholder="Enter current password" />
                <button type="button" onClick={() => setShowCurrentPwd((s) => !s)} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400">
                  {showCurrentPwd ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                </button>
              </div>
            </label>
            <label className="block">
              <span className="mb-1 block text-xs font-medium text-slate-600">New Password</span>
              <div className="relative">
                <input type={showNewPwd ? 'text' : 'password'} value={newPwd} onChange={(e) => setNewPwd(e.target.value)}
                  className="w-full rounded border border-slate-300 px-3 py-2 text-xs text-navy-900 placeholder-slate-400 focus:border-govblue-500 focus:outline-none" placeholder="Min 6 characters" />
                <button type="button" onClick={() => setShowNewPwd((s) => !s)} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400">
                  {showNewPwd ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                </button>
              </div>
            </label>
            <label className="block">
              <span className="mb-1 block text-xs font-medium text-slate-600">Confirm New Password</span>
              <input type="password" value={confirmPwd} onChange={(e) => setConfirmPwd(e.target.value)}
                className="w-full rounded border border-slate-300 px-3 py-2 text-xs text-navy-900 placeholder-slate-400 focus:border-govblue-500 focus:outline-none" placeholder="Re-enter password" />
            </label>
            {pwdError && <p className="text-xs text-red-500">{pwdError}</p>}
            {pwdSuccess && (
              <div className="flex items-center gap-1 text-xs text-compliant-600">
                <CheckCircle2 className="h-3.5 w-3.5" /> Password changed successfully!
              </div>
            )}
            <button onClick={handleChangePassword} disabled={pwdLoading}
              className="w-full rounded bg-govblue-600 py-2 text-xs font-medium text-white hover:bg-govblue-700 disabled:opacity-50">
              {pwdLoading ? 'Changing...' : 'Update Password'}
            </button>
          </div>
        )}
        {['Two-Factor Authentication', 'Active Sessions'].map((item) => (
          <button key={item} className="flex w-full items-center justify-between rounded-lg border border-slate-200 p-3 text-left transition-colors hover:bg-slate-50">
            <span className="text-xs font-medium text-navy-900">{item}</span>
            <ChevronRight className="h-4 w-4 text-slate-400" />
          </button>
        ))}
      </Card>

      {saved && (
        <div className="flex items-center gap-2 rounded-card border border-compliant-200 bg-compliant-50 p-3 text-xs font-medium text-compliant-700">
          <CheckCircle2 className="h-4 w-4" /> Preferences saved successfully
        </div>
      )}

      <Button onClick={handleSave} fullWidth size="lg">Save Preferences</Button>

      <div className="space-y-2">
        <Button variant="outline" onClick={() => { resetDemo(); }} fullWidth>Reset Demo Data</Button>
        <Button variant="danger" onClick={handleSignOut} icon={LogOut} fullWidth>Sign Out</Button>
      </div>

      {/* Help & Support */}
      <Card title="Help & Support" icon={HelpCircle}>
        {[
          { label: 'Help Center', desc: 'Guides and walkthroughs', icon: HelpCircle },
          { label: 'Contact Support', desc: 'support@consumer.gov.in · 1800-11-4000', icon: Phone },
          { label: 'Report an Issue', desc: 'Share feedback on this demo build', icon: Mail },
          { label: 'Guidelines & Rules', desc: 'Legal Metrology rule library', icon: FileText },
        ].map((h) => (
          <button key={h.label} onClick={() => h.label === 'Guidelines & Rules' && navigate('/rules')}
            className="flex w-full items-center justify-between rounded-lg border border-slate-200 p-3 text-left transition-colors hover:bg-slate-50">
            <div className="flex items-center gap-3">
              <h.icon className="h-4 w-4 text-govblue-600" />
              <div>
                <p className="text-xs font-medium text-navy-900">{h.label}</p>
                <p className="text-[10px] text-slate-500">{h.desc}</p>
              </div>
            </div>
            <ChevronRight className="h-4 w-4 text-slate-400" />
          </button>
        ))}
      </Card>

      {/* About */}
      <Card title="About SatyaTag" icon={Info}>
        <div className="space-y-3 text-xs text-slate-600">
          <p>
            SatyaTag is a multi-inspection compliance platform for Legal Metrology — enabling officers to verify
            packaged commodity declarations through AI-assisted extraction and rule-based evaluation.
          </p>
          <p className="font-medium text-navy-900">Version 0.1.0 (Demo)</p>
          <p className="text-[10px] text-slate-400">
            Department of Consumer Affairs · Legal Metrology Division. All information in this demo is illustrative and not a legal verdict.
          </p>
        </div>
      </Card>
    </div>
  );
};

const ProfileRow: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <div className="flex items-center justify-between">
    <span className="text-slate-500">{label}</span>
    <span className="font-medium text-navy-900">{value}</span>
  </div>
);

export default ProfilePage;