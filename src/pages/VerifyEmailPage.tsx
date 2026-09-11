import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { ShieldCheck, RefreshCw, ArrowRight } from 'lucide-react';
import { SatyaTagLogo, GovHeader } from '../components/Brand';
import { useAuth } from '../context/AuthContext';

const VerifyEmailPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { verifyOTP, resendOTP } = useAuth();
  const state = location.state as { email?: string; otp?: string; maskedEmail?: string } | null;
  const email = state?.email || '';
  const devOtp = state?.otp || '';
  const maskedEmail = state?.maskedEmail || email;

  const [otp, setOtp] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [countdown, setCountdown] = useState(60);
  const [resendOtp, setResendOtp] = useState('');
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (!email) navigate('/signup', { replace: true });
  }, [email, navigate]);

  useEffect(() => {
    if (countdown <= 0) return;
    const timer = setTimeout(() => setCountdown((c) => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [countdown]);

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (otp.length !== 6) { setError('Please enter a 6-digit code'); return; }
    setError('');
    setLoading(true);
    const result = await verifyOTP(email, otp);
    setLoading(false);
    if (!result.success) { setError(result.error || 'Verification failed'); return; }
    setSuccess(true);
    // The account is now active; the officer signs in to continue.
    setTimeout(() => navigate('/login'), 1800);
  };

  const handleResend = async () => {
    setResendLoading(true);
    const result = await resendOTP(email);
    setResendLoading(false);
    if (result.cooldownSeconds) {
      setError('A fresh code was recently sent. Please wait before requesting another.');
      setCountdown(result.cooldownSeconds);
      return;
    }
    if (!result.success) { setError(result.error || 'Could not resend the code'); return; }
    if (result.devOtp) setResendOtp(result.devOtp);
    setCountdown(60);
  };
  if (!email) return null;

  return (
    <div className="flex min-h-screen items-center justify-center bg-navy-950 px-4 py-10">
      <div className="w-full max-w-sm">
        <div className="mb-6 text-center"><GovHeader /></div>
        <div className="mb-2 flex justify-center"><SatyaTagLogo size="lg" /></div>
        <div className="rounded-card border border-navy-700/50 bg-navy-900/80 p-6 shadow-2xl backdrop-blur">
          {success ? (
            <div className="flex flex-col items-center py-6">
              <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-compliant-100">
                <ShieldCheck className="h-8 w-8 text-compliant-600" />
              </div>
              <h2 className="text-lg font-semibold text-white">Email Verified!</h2>
              <p className="mt-2 text-sm text-slate-400">Redirecting to sign in...</p>
              <div className="mt-4 h-2 w-32 overflow-hidden rounded-full bg-navy-700">
                <div className="h-full rounded-full bg-govblue-500 animate-pulse" style={{ width: '100%' }} />
              </div>
            </div>
          ) : (
            <>
              <div className="mb-4 flex items-center gap-2">
                <ShieldCheck className="h-5 w-5 text-govblue-400" />
                <h2 className="text-lg font-semibold text-white">Verify Your Email</h2>
              </div>
              <p className="mb-4 text-sm text-slate-400">
                We sent a 6-digit code to <span className="font-medium text-white">{maskedEmail}</span>.
              </p>
              {devOtp && (
                <div className="mb-4 rounded-lg border border-govblue-500/30 bg-govblue-500/10 px-3 py-2">
                  <p className="text-[10px] font-medium text-govblue-400">DEV MODE \u2014 OTP:</p>
                  <p className="text-lg font-bold tracking-widest text-govblue-300">{devOtp}</p>
                </div>
              )}
              {resendOtp && !devOtp && (
                <div className="mb-4 rounded-lg border border-govblue-500/30 bg-govblue-500/10 px-3 py-2">
                  <p className="text-[10px] font-medium text-govblue-400">NEW OTP:</p>
                  <p className="text-lg font-bold tracking-widest text-govblue-300">{resendOtp}</p>
                </div>
              )}
              {error && (
                <div className="mb-4 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-400">{error}</div>
              )}
              <form onSubmit={handleVerify} className="space-y-4">
                <label className="block">
                  <span className="mb-1 block text-xs font-medium text-slate-300">Verification Code</span>
                  <input type="text" value={otp} onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    placeholder="000000" maxLength={6}
                    className="w-full rounded-button border border-navy-600 bg-navy-800/60 px-3.5 py-3 text-center text-lg font-mono tracking-[0.5em] text-white placeholder-slate-500 focus:border-govblue-500 focus:outline-none focus:ring-1 focus:ring-govblue-500" required />
                </label>
                <button type="submit" disabled={loading || otp.length !== 6}
                  className="flex w-full items-center justify-center gap-2 rounded-button bg-govblue-600 py-3 text-sm font-semibold text-white transition-colors hover:bg-govblue-700 disabled:cursor-not-allowed disabled:opacity-50">
                  {loading ? 'Verifying...' : 'Verify Email'} <ArrowRight className="h-4 w-4" />
                </button>
              </form>
              <div className="mt-4 flex items-center justify-between text-xs">
                <button onClick={handleResend} disabled={countdown > 0 || resendLoading}
                  className="flex items-center gap-1 text-govblue-400 hover:text-govblue-300 disabled:text-slate-600">
                  <RefreshCw className="h-3 w-3" /> {resendLoading ? 'Sending...' : countdown > 0 ? `Resend in ${countdown}s` : 'Resend Code'}
                </button>
                <Link to="/signup" className="text-slate-500 hover:text-slate-300">Change email</Link>
              </div>
            </>
          )}
        </div>
        <p className="mt-5 text-center text-xs text-slate-500"><Link to="/login" className="text-govblue-400 hover:text-govblue-300">\u2190 Back to Sign In</Link></p>
      </div>
    </div>
  );
};

export default VerifyEmailPage;