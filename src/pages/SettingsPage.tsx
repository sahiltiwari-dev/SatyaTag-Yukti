import React, { useState } from 'react';
import { Settings, Save, Shield, Bell, Lock, Loader2, CheckCircle2, AlertTriangle } from 'lucide-react';
import { PageHeader } from '../components/common/PageHeader';
import { Card, Button } from '../components/common/Button';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';

const SettingsPage: React.FC = () => {
  const navigate = useNavigate();
  const { user, changePassword } = useAuth();
  const [activeTab, setActiveTab] = useState<'profile' | 'security' | 'notifications'>('profile');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentPassword || !newPassword) return;
    if (newPassword !== confirmPassword) {
      setMessage({ type: 'error', text: 'New passwords do not match.' });
      return;
    }
    if (newPassword.length < 8) {
      setMessage({ type: 'error', text: 'Password must be at least 8 characters.' });
      return;
    }
    setSaving(true);
    setMessage(null);
    try {
      const result = await changePassword(currentPassword, newPassword);
      if (result.success) {
        setMessage({ type: 'success', text: 'Password updated successfully.' });
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
      } else {
        setMessage({ type: 'error', text: result.error || 'Failed to update password.' });
      }
    } catch {
      setMessage({ type: 'error', text: 'An error occurred while updating password.' });
    } finally {
      setSaving(false);
    }
  };

  const tabs = [
    { key: 'profile' as const, label: 'Profile', icon: Settings },
    { key: 'security' as const, label: 'Security', icon: Lock },
    { key: 'notifications' as const, label: 'Notifications', icon: Bell },
  ];

  return (
    <div className="space-y-5 animate-[fadeIn_0.3s_ease-out]">
      <PageHeader title="Settings" subtitle="Manage your account preferences" icon={Settings} />
      <div className="flex gap-1.5 overflow-x-auto">
        {tabs.map((t) => (
          <button key={t.key} onClick={() => setActiveTab(t.key)}
            className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-button px-3 py-1.5 text-xs font-medium transition-colors ${activeTab === t.key ? 'bg-govblue-600 text-white' : 'border border-slate-200 bg-white text-slate-600 hover:bg-slate-50'}`}>
            <t.icon className="h-3.5 w-3.5" /> {t.label}
          </button>
        ))}
      </div>

      {activeTab === 'profile' && (
        <Card title="Profile Settings">
          <div className="space-y-4">
            <div className="rounded-card bg-slate-50 p-4 text-xs space-y-2">
              <Row l="Email" v={user?.email || '—'} />
              <Row l="Full Name" v={user?.fullName || '—'} />
              <Row l="Role" v={user?.role || '—'} />
              <Row l="Department" v={user?.department || '—'} />
              <Row l="Email Verified" v={user?.emailVerified ? 'Yes' : 'No'} />
            </div>
            <p className="text-xs text-slate-500">To update profile details, please contact your administrator.</p>
            <Button variant="outline" onClick={() => navigate('/profile')} fullWidth>Go to Full Profile</Button>
          </div>
        </Card>
      )}
{activeTab === 'security' && (
        <Card title="Change Password" subtitle="Ensure your account remains secure">
          <form onSubmit={handleChangePassword} className="space-y-4">
            {message && (
              <div className={`flex items-center gap-2 rounded-lg px-3 py-2 text-xs ${message.type === 'success' ? 'bg-compliant-50 text-compliant-700' : 'bg-violation-50 text-violation-700'}`}>
                {message.type === 'success' ? <CheckCircle2 className="h-4 w-4" /> : <AlertTriangle className="h-4 w-4" />}
                {message.text}
              </div>
            )}
            <Field label="Current Password" value={currentPassword} setValue={setCurrentPassword} type="password" />
            <Field label="New Password" value={newPassword} setValue={setNewPassword} type="password" />
            <Field label="Confirm New Password" value={confirmPassword} setValue={setConfirmPassword} type="password" />
            <Button type="submit" fullWidth icon={saving ? Loader2 : Save} disabled={saving}>
              {saving ? 'Updating…' : 'Update Password'}
            </Button>
          </form>
        </Card>
      )}

      {activeTab === 'notifications' && (
        <Card title="Notification Preferences">
          <div className="space-y-4">
            {[
              { label: 'Inspection created', desc: 'When a new inspection is initiated' },
              { label: 'Analysis completed', desc: 'When the compliance analysis finishes' },
              { label: 'Review required', desc: 'When officer review is needed' },
              { label: 'Decision recorded', desc: 'When an officer records a final decision' },
              { label: 'Report generated', desc: 'When a PDF report is ready for download' },
            ].map((pref) => (
              <div key={pref.label} className="flex items-center justify-between rounded-lg border border-slate-200 bg-white px-4 py-3">
                <div>
                  <p className="text-sm font-medium text-navy-900">{pref.label}</p>
                  <p className="text-[11px] text-slate-500">{pref.desc}</p>
                </div>
                <div className="flex h-5 w-5 items-center justify-center rounded bg-govblue-100">
                  <CheckCircle2 className="h-3.5 w-3.5 text-govblue-600" />
                </div>
              </div>
            ))}
            <p className="text-xs text-slate-400">Notification preferences are configured at the system level. Contact your administrator to modify.</p>
          </div>
        </Card>
      )}

      <Card>
        <div className="flex items-center gap-2 text-xs text-slate-500">
          <Shield className="h-4 w-4 text-govblue-500" />
          <span>SATYATAG uses encrypted sessions and secure storage. All actions are audit-logged.</span>
        </div>
      </Card>
    </div>
  );
};

const Field: React.FC<{ label: string; value: string; setValue: (v: string) => void; type?: string }> = ({ label, value, setValue, type = 'text' }) => (
  <div>
    <label className="mb-1 block text-xs font-medium text-navy-900">{label}</label>
    <input type={type} value={value} onChange={(e) => setValue(e.target.value)}
      className="w-full rounded-button border border-slate-200 bg-white px-3 py-2.5 text-sm text-navy-900 focus:border-govblue-500 focus:outline-none focus:ring-1 focus:ring-govblue-500" required />
  </div>
);

const Row: React.FC<{ l: string; v: string }> = ({ l, v }) => (
  <div className="flex items-center justify-between gap-3">
    <span className="text-slate-500">{l}</span>
    <span className="font-medium text-navy-900">{v}</span>
  </div>
);

export default SettingsPage;