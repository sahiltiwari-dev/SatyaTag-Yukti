import React, { useState } from 'react';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import { KeyRound, ArrowRight, ShieldCheck, Eye, EyeOff, ExternalLink } from 'lucide-react';
import { SatyaTagLogo, GovHeader } from '../components/Brand';
import { useAuth } from '../context/AuthContext';

type Step = 'email' | 'sent' | 'password' | 'success';

const ForgotPasswordPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { requestPasswordReset, resetPassword } = useAuth();

  // A reset link from the email arrives as /reset-password?email=...&token=...
  const linkEmail = searchParams.get('email') || '';
  const linkToken = searchParams.get('token') || '';

  const [step, setStep] = useState<Step>(linkEmail && linkToken ? 'password' : 'email');
  const [email, setEmail] = useState(linkEmail);
  const [token, setToken] = useState(linkToken);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [devResetUrl, setDevResetUrl] = useState('');
  const [showPwd, setShowPwd] = useState(false);

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    const result = await requestPasswordReset(email);
    setLoading(false);
    if (!result.success) { setError(result.error || 'Failed'); return; }
    if (result.devResetUrl) setDevResetUrl(result.devResetUrl);
    setStep('sent');
  };

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (newPassword.length < 6) { setError('Password must be at least 6 characters'); return; }
    if (newPassword !== confirmPassword) { setError('Passwords do not match'); return; }
    if (!token) { setError('Reset link is incomplete. Request a new link.'); return; }
    setLoading(true);
    const result = await resetPassword(email, token, newPassword);
    setLoading(false);
    if (!result.success) { setError(result.error || 'Reset failed'); return; }
    setStep('success');
  };

  const inputClass = 'w-full rounded-button border border-navy-600 bg-navy-800/60 px-3.5 py-2.5 text-sm text-white placeholder-slate-500 focus:border-govblue-500 focus:outline-none focus:ring-1 focus:ring-govblue-500';

  return (
    <div className="flex min-h-screen items-center justify-center bg-navy-950 px-4 py-10">
      <div className="w-full max-w-sm">
        <div className="mb-6 text-center"><GovHeader /></div>
        <div className="mb-2 flex justify-center"><SatyaTagLogo size="lg" /></div>
        <div className="rounded-card border border-navy-700/50 bg-navy-900/80 p-6 shadow-2xl backdrop-blur">
          <div className="mb-4 flex items-center gap-2">
            <KeyRound className="h-5 w-5 text-govblue-400" />
            <h2 className="text-lg font-semibold text-white">Reset Password</h2>
          </div>
          {error && (
            <div className="mb-4 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-400">{error}</div>
          )}

          {step === 'success' && (
            <div className="flex flex-col items-center py-6">
              <ShieldCheck className="mb-4 h-12 w-12 text-compliant-500" />
              <p className="text-sm font-medium text-white">Password reset successfully</p>
              <p className="mt-1 text-xs text-slate-400">Sign in with your new password to continue.</p>
              <button
                onClick={() => navigate('/login')}
                className="mt-5 flex w-full items-center justify-center gap-2 rounded-button bg-govblue-600 py-3 text-sm font-semibold text-white transition-colors hover:bg-govblue-700"
              >
                Back to Sign In <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          )}
{step === 'email' && (
            <form onSubmit={handleEmailSubmit} className="space-y-4">
              <p className="text-sm text-slate-400">
                Enter your account email and we'll send a secure reset link.
              </p>
              <label className="block">
                <span className="mb-1 block text-xs font-medium text-slate-300">Email Address</span>
                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@consumer.gov.in" className={inputClass} required />
              </label>
              <button type="submit" disabled={loading}
                className="flex w-full items-center justify-center gap-2 rounded-button bg-govblue-600 py-3 text-sm font-semibold text-white transition-colors hover:bg-govblue-700 disabled:opacity-50">
                {loading ? 'Sending...' : 'Send Reset Link'} <ArrowRight className="h-4 w-4" />
              </button>
            </form>
          )}

          {step === 'sent' && (
            <div className="space-y-4">
              <p className="text-sm text-slate-400">
                If an account exists for <span className="font-medium text-white">{email}</span>,
                a reset link has been sent to the registered email address.
              </p>
              {devResetUrl && (
                <div className="rounded-lg border border-govblue-500/30 bg-govblue-500/10 px-3 py-2">
                  <p className="text-[10px] font-medium text-govblue-400">DEV MODE \u2014 RESET LINK:</p>
                  <a href={devResetUrl} target="_blank" rel="noreferrer"
                    className="mt-1 flex items-center gap-1 break-all text-xs text-govblue-300 hover:text-govblue-200">
                    <ExternalLink className="h-3 w-3 shrink-0" /> {devResetUrl}
                  </a>
                </div>
              )}
              <button
                onClick={() => setStep('email')}
                className="w-full rounded-button border border-navy-600 py-3 text-xs font-medium text-slate-300 hover:bg-navy-800"
              >
                Use a different email
              </button>
            </div>
          )}

          {step === 'password' && (
            <form onSubmit={handlePasswordSubmit} className="space-y-4">
              <p className="text-sm text-slate-400">Choose a new password for <span className="font-medium text-white">{email}</span>.</p>
              <label className="block">
                <span className="mb-1 block text-xs font-medium text-slate-300">New Password</span>
                <div className="relative">
                  <input type={showPwd ? 'text' : 'password'} value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="Min 6 characters" className={inputClass} required />
                  <button type="button" onClick={() => setShowPwd((s) => !s)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300">
                    {showPwd ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </label>
              <label className="block">
                <span className="mb-1 block text-xs font-medium text-slate-300">Confirm Password</span>
                <input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="Re-enter password" className={inputClass} required />
              </label>
              <button type="submit" disabled={loading}
                className="flex w-full items-center justify-center gap-2 rounded-button bg-govblue-600 py-3 text-sm font-semibold text-white transition-colors hover:bg-govblue-700 disabled:opacity-50">
                {loading ? 'Resetting...' : 'Reset Password'} <ArrowRight className="h-4 w-4" />
              </button>
            </form>
          )}
        </div>
        <p className="mt-5 text-center text-xs text-slate-500">
          <Link to="/login" className="text-govblue-400 hover:text-govblue-300">\u2190 Back to Sign In</Link>
        </p>
      </div>
    </div>
  );
};

export default ForgotPasswordPage;