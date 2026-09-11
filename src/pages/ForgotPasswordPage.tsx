import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { KeyRound, ArrowRight, ShieldCheck, Eye, EyeOff } from 'lucide-react';
import { SatyaTagLogo, GovHeader } from '../components/Brand';
import { useAuth } from '../context/AuthContext';
import { useDemo } from '../context/DemoContext';
import { userToOfficer } from '../services/auth';

const ForgotPasswordPage: React.FC = () => {
  const navigate = useNavigate();
  const { requestPasswordReset, resetPassword } = useAuth();
  const { setOfficer } = useDemo();
  const [step, setStep] = useState<'email' | 'otp' | 'password' | 'success'>('email');
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [devOtp, setDevOtp] = useState('');
  const [showPwd, setShowPwd] = useState(false);

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    const result = await requestPasswordReset(email);
    setLoading(false);
    if (!result.success) { setError(result.error || 'Failed'); return; }
    if (result.devOtp) setDevOtp(result.devOtp);
    setStep('otp');
  };

  const handleOtpSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (otp.length !== 6) { setError('Enter a 6-digit code'); return; }
    setError('');
    setStep('password');
  };

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (newPassword.length < 6) { setError('Password must be at least 6 characters'); return; }
    if (newPassword !== confirmPassword) { setError('Passwords do not match'); return; }
    setLoading(true);
    const result = await resetPassword(email, otp, newPassword);
    setLoading(false);
    if (!result.success) { setError(result.error || 'Reset failed'); return; }
    setStep('success');
    const { getCurrentUser } = await import('../services/auth');
    const user = getCurrentUser();
    if (user) setOfficer(userToOfficer(user));
    setTimeout(() => navigate('/dashboard'), 2000);
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
              <p className="text-sm font-medium text-white">Password reset successfully!</p>
              <p className="mt-1 text-xs text-slate-400">Redirecting to dashboard...</p>
            </div>
          )}
          {step === 'email' && (
            <form onSubmit={handleEmailSubmit} className="space-y-4">
              <p className="text-sm text-slate-400">Enter your registered email address. We'll send a verification code.</p>
              <label className="block">
                <span className="mb-1 block text-xs font-medium text-slate-300">Email Address</span>
                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@consumer.gov.in" className={inputClass} required />
              </label>
              <button type="submit" disabled={loading}
                className="flex w-full items-center justify-center gap-2 rounded-button bg-govblue-600 py-3 text-sm font-semibold text-white transition-colors hover:bg-govblue-700 disabled:opacity-50">
                {loading ? 'Sending...' : 'Send Verification Code'} <ArrowRight className="h-4 w-4" />
              </button>
            </form>
          )}
          {step === 'otp' && (
            <form onSubmit={handleOtpSubmit} className="space-y-4">
              <p className="text-sm text-slate-400">Enter the 6-digit code sent to your email.</p>
              {devOtp && (
                <div className="rounded-lg border border-govblue-500/30 bg-govblue-500/10 px-3 py-2">
                  <p className="text-[10px] font-medium text-govblue-400">DEV MODE \u2014 OTP:</p>
                  <p className="text-lg font-bold tracking-widest text-govblue-300">{devOtp}</p>
                </div>
              )}
              <label className="block">
                <span className="mb-1 block text-xs font-medium text-slate-300">Verification Code</span>
                <input type="text" value={otp} onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  placeholder="000000" maxLength={6}
                  className="w-full rounded-button border border-navy-600 bg-navy-800/60 px-3.5 py-3 text-center text-lg font-mono tracking-[0.5em] text-white placeholder-slate-500 focus:border-govblue-500 focus:outline-none focus:ring-1 focus:ring-govblue-500" required />
              </label>
              <button type="submit" disabled={otp.length !== 6}
                className="flex w-full items-center justify-center gap-2 rounded-button bg-govblue-600 py-3 text-sm font-semibold text-white transition-colors hover:bg-govblue-700 disabled:opacity-50">
                Continue <ArrowRight className="h-4 w-4" />
              </button>
            </form>
          )}
          {step === 'password' && (
            <form onSubmit={handlePasswordSubmit} className="space-y-4">
              <p className="text-sm text-slate-400">Enter your new password below.</p>
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
        <p className="mt-5 text-center text-xs text-slate-500"><Link to="/login" className="text-govblue-400 hover:text-govblue-300">\u2190 Back to Sign In</Link></p>
      </div>
    </div>
  );
};

export default ForgotPasswordPage;
