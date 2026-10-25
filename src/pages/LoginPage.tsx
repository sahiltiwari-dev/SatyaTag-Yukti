import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Eye, EyeOff, ArrowRight, Mail, Lock, Shield, ScanLine, FileCheck, ShieldCheck, ChevronDown, ChevronUp } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useDemo } from '../context/DemoContext';
import { userToOfficer } from '../services/auth';

const GovEmblem: React.FC<{ className?: string }> = ({ className = '' }) => (
  <svg viewBox="0 0 100 100" className={className} aria-label="Government emblem">
    <circle cx="50" cy="50" r="48" fill="#0d1524" />
    <circle cx="50" cy="50" r="45" fill="none" stroke="#c9a84c" strokeWidth="1" />
    <circle cx="50" cy="50" r="42" fill="none" stroke="#c9a84c" strokeWidth="0.5" />
    {Array.from({ length: 24 }).map((_, i) => {
      const angle = (i * 15 * Math.PI) / 180;
      const x1 = 50 + 16 * Math.cos(angle);
      const y1 = 50 + 16 * Math.sin(angle);
      const x2 = 50 + 38 * Math.cos(angle);
      const y2 = 50 + 38 * Math.sin(angle);
      return <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke="#c9a84c" strokeWidth="0.6" opacity="0.7" />;
    })}
    <circle cx="50" cy="50" r="14" fill="none" stroke="#c9a84c" strokeWidth="1.2" />
    <circle cx="50" cy="50" r="4" fill="#c9a84c" />
    <rect x="42" y="16" width="16" height="24" rx="2" fill="none" stroke="#c9a84c" strokeWidth="0.8" opacity="0.6" />
    <line x1="50" y1="16" x2="50" y2="10" stroke="#c9a84c" strokeWidth="1" />
    <circle cx="50" cy="8" r="2.5" fill="#c9a84c" />
  </svg>
);

const FeatureItem: React.FC<{ icon: React.ReactNode; label: string; desc: string }> = ({ icon, label, desc }) => (
  <div className="flex items-center gap-3">
    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-white shadow-sm">
      {icon}
    </div>
    <div>
      <p className="text-sm font-semibold text-navy-900">{label}</p>
      <p className="text-xs text-slate-500">{desc}</p>
    </div>
  </div>
);

const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const { login } = useAuth();
  const { setOfficer } = useDemo();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPwd, setShowPwd] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [phase, setPhase] = useState<'form' | 'verifying' | 'loading'>('form');
  const [error, setError] = useState('');
  const [showDev, setShowDev] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) return;
    setError('');
    setPhase('verifying');
    const result = await login(email.trim(), password);
    if (!result.success) {
      setPhase('form');
      setError(result.error || 'Login failed. Please try again.');
      return;
    }
    setPhase('loading');
    const { getCurrentUser } = await import('../services/auth');
    const user = getCurrentUser();
    if (user) setOfficer(userToOfficer(user));
    await new Promise((r) => setTimeout(r, 800));
    navigate('/dashboard');
  };

  const handleDevLogin = (emailAddr: string) => {
    setEmail(emailAddr);
    setPassword('demo123');
    setShowDev(false);
  };

  if (phase !== 'form') {
    return (
      <div className="login-page flex min-h-screen items-center justify-center px-4">
        <div className="relative z-10 flex flex-col items-center">
          <div className="mb-8 flex items-center gap-2.5">
            <svg width="44" height="44" viewBox="0 0 40 40" aria-hidden="true">
              <rect width="40" height="40" rx="10" fill="#0d1524" />
              <text x="7" y="27" fontFamily="Inter,system-ui" fontWeight="700" fontSize="18" fill="#3b82f6">S</text>
              <circle cx="30" cy="10" r="5" fill="#22c55e" />
            </svg>
            <span className="text-3xl font-extrabold tracking-tight">
              <span className="text-navy-900">Satya</span>
              <span className="text-compliant-600">Tag</span>
            </span>
          </div>
          <div className="mb-5 h-12 w-12 rounded-full border-[3px] border-govblue-200 border-t-govblue-600 animate-spin" />
          <h2 className="text-lg font-semibold text-navy-900">
            {phase === 'verifying' ? 'Signing you in...' : 'Loading your workspace...'}
          </h2>
          <p className="mt-2 max-w-xs text-center text-sm text-slate-500">
            {phase === 'verifying'
              ? 'Verifying credentials and checking account status'
              : 'Preparing your enforcement dashboard'}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="login-page flex min-h-screen flex-col">
      {/* === GOVERNMENT HEADER === */}
      <header className="relative z-10 border-b border-slate-200/80 bg-white/80 backdrop-blur-sm">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-2.5 sm:px-6">
          <div className="flex items-center gap-3">
            <GovEmblem className="h-10 w-10 shrink-0 sm:h-11 sm:w-11" />
            <div className="leading-tight">
              <p className="text-[11px] font-bold uppercase tracking-wide text-navy-900 sm:text-xs">
                Department of Consumer Affairs
              </p>
              <p className="text-[10px] font-medium text-slate-500 sm:text-[11px]">Government of India</p>
            </div>
          </div>
          <div className="mx-4 hidden h-8 w-px bg-slate-300 sm:block" />
          <div className="hidden text-right sm:block">
            <p className="text-[11px] font-semibold leading-tight text-navy-800">
              Fair Markets<br />Strong Consumers
            </p>
            <p className="mt-0.5 text-[10px] text-compliant-600">A Trustworthy India</p>
          </div>
        </div>
      </header>

      {/* === MAIN CONTENT === */}
      <main className="relative z-10 flex flex-1 flex-col">
        <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col px-4 py-8 sm:px-6 md:flex-row md:items-center md:gap-12 md:py-0 lg:gap-20">
          {/* --- LEFT: Branding + Features --- */}
          <div className="mb-8 flex flex-1 flex-col items-center text-center md:mb-0 md:max-w-md md:items-start md:text-left lg:max-w-lg">
            <div className="mb-5 flex items-center gap-3">
              <svg width="50" height="50" viewBox="0 0 40 40" aria-hidden="true">
                <rect width="40" height="40" rx="10" fill="#0d1524" />
                <text x="7" y="27" fontFamily="Inter,system-ui" fontWeight="700" fontSize="18" fill="#3b82f6">S</text>
                <circle cx="30" cy="10" r="5" fill="#22c55e" />
              </svg>
              <div className="flex items-baseline gap-0.5">
                <span className="text-4xl font-extrabold tracking-tight text-navy-900 sm:text-5xl">Satya</span>
                <span className="text-4xl font-extrabold tracking-tight text-compliant-600 sm:text-5xl">Tag</span>
                <svg className="ml-1.5 inline-block h-5 w-5 sm:h-6 sm:w-6" viewBox="0 0 24 24" fill="#22c55e" aria-hidden="true">
                  <path d="M17 8C8 10 5.9 16.17 3.82 21.34l1.89.66l.95-2.3c.48.17.98.3 1.34.3C19 20 22 3 22 3c-1 2-8 2.25-13 3.25S2 11.5 2 13.5s1.75 3.75 1.75 3.75" />
                </svg>
              </div>
            </div>
            <h1 className="mb-2 text-lg font-medium text-slate-600 sm:text-xl">
              AI-Assisted Compliance for<br />Packaged Commodities
            </h1>
            <p className="mb-6 text-xs text-slate-400 sm:hidden">
              Fair Markets {'\u00b7'} Strong Consumers {'\u00b7'} A Trustworthy India
            </p>
            <div className="mt-4 flex w-full max-w-xs flex-col gap-3 sm:max-w-sm md:mt-6">
              <FeatureItem
                icon={<ScanLine className="h-5 w-5 text-govblue-600" />}
                label="Scan Products"
                desc="Capture package surface images"
              />
              <FeatureItem
                icon={<FileCheck className="h-5 w-5 text-govblue-600" />}
                label="Verify Declarations"
                desc="Check mandatory label compliance"
              />
              <FeatureItem
                icon={<ShieldCheck className="h-5 w-5 text-govblue-600" />}
                label="Ensure Fair Trade"
                desc="Protect consumer interests"
              />
            </div>
          </div>

          {/* --- RIGHT: Login Card --- */}
          <div className="flex w-full justify-center md:w-auto md:flex-shrink-0">
            <div className="w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-6 shadow-[0_2px_20px_rgba(0,0,0,0.06)] sm:p-8">
              <div className="mb-6">
                <h2 className="text-xl font-bold text-navy-900">Welcome back, Officer</h2>
                <p className="mt-1 text-sm text-slate-500">Sign in to continue</p>
              </div>
              {error && (
                <div className="mb-5 flex items-start gap-2.5 rounded-xl border border-red-200 bg-red-50 px-4 py-3">
                  <div className="mt-0.5 h-2 w-2 shrink-0 rounded-full bg-red-500" />
                  <p className="text-sm text-red-600">{error}</p>
                </div>
              )}
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label htmlFor="login-email" className="mb-1.5 block text-sm font-medium text-slate-700">
                    Official Email / ID
                  </label>
                  <div className="relative">
                    <Mail className="pointer-events-none absolute left-3.5 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-slate-400" />
                    <input
                      id="login-email"
                      type="text"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="name@gov.in"
                      autoComplete="username"
                      className="w-full rounded-xl border border-slate-300 bg-white py-3 pl-11 pr-4 text-sm text-slate-900 placeholder-slate-400 transition-all focus:border-govblue-500 focus:outline-none focus:ring-2 focus:ring-govblue-500/20"
                      required
                    />
                  </div>
                </div>
                <div>
                  <label htmlFor="login-password" className="mb-1.5 block text-sm font-medium text-slate-700">
                    Password
                  </label>
                  <div className="relative">
                    <Lock className="pointer-events-none absolute left-3.5 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-slate-400" />
                    <input
                      id="login-password"
                      type={showPwd ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Enter your password"
                      autoComplete="current-password"
                      className="w-full rounded-xl border border-slate-300 bg-white py-3 pl-11 pr-12 text-sm text-slate-900 placeholder-slate-400 transition-all focus:border-govblue-500 focus:outline-none focus:ring-2 focus:ring-govblue-500/20"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPwd((s) => !s)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 transition-colors hover:text-slate-600"
                      tabIndex={-1}
                    >
                      {showPwd ? <EyeOff className="h-[18px] w-[18px]" /> : <Eye className="h-[18px] w-[18px]" />}
                    </button>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <label className="flex cursor-pointer items-center gap-2 text-sm text-slate-600">
                    <input
                      type="checkbox"
                      checked={rememberMe}
                      onChange={() => setRememberMe((r) => !r)}
                      className="h-4 w-4 rounded border-slate-300 text-govblue-600 focus:ring-govblue-500"
                    />
                    Remember me
                  </label>
                  <Link to="/forgot-password" className="text-sm font-medium text-govblue-600 transition-colors hover:text-govblue-700">
                    Forgot password?
                  </Link>
                </div>
                <button
                  type="submit"
                  disabled={!email.trim() || !password.trim()}
                  className="group flex w-full items-center justify-center gap-2 rounded-xl bg-govblue-600 py-3.5 text-sm font-semibold text-white shadow-md shadow-govblue-600/20 transition-all hover:bg-govblue-700 hover:shadow-lg hover:shadow-govblue-600/25 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 disabled:shadow-none"
                >
                  Sign In
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                </button>
              </form>

            </div>
          </div>
        </div>

          {/* === LOWER TRUST / FOOTER === */}
          <footer className="relative z-10 border-t border-slate-200/80 bg-white/60 backdrop-blur-sm">
            <div className="mx-auto max-w-6xl px-4 py-5 sm:px-6">
              <div className="flex flex-col items-center gap-4 sm:flex-row sm:justify-between">
                <div className="flex flex-wrap items-center justify-center gap-6 text-sm">
                  <div className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-govblue-500" />
                    <span className="font-medium text-navy-900">Transparent Labels</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-compliant-500" />
                    <span className="font-medium text-navy-900">Trustworthy Markets</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-navy-800" />
                    <span className="font-medium text-navy-900">Stronger Consumers</span>
                  </div>
                </div>
                <div className="flex items-center gap-2 text-sm text-slate-500">
                  <Shield className="h-4 w-4" />
                  <span>Secure access for authorised personnel</span>
                </div>
              </div>
              <div className="mt-4 border-t border-slate-100 pt-3">
                <button
                  onClick={() => setShowDev((s) => !s)}
                  className="mx-auto flex items-center gap-1.5 text-[11px] font-medium text-slate-400 transition-colors hover:text-slate-500"
                >
                  {showDev ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                  Development Quick Sign-In
                </button>
                {showDev && (
                  <div className="mt-3 flex flex-wrap justify-center gap-2">
                    {[
                      { role: 'Officer', email: 'officer@consumer.gov.in' },
                      { role: 'Supervisor', email: 'supervisor@consumer.gov.in' },
                      { role: 'Admin', email: 'admin@consumer.gov.in' },
                    ].map((acc) => (
                      <button
                        key={acc.email}
                        onClick={() => handleDevLogin(acc.email)}
                        className="rounded-lg border border-dashed border-slate-300 bg-white px-3 py-2 text-[11px] text-slate-600 transition-all hover:border-govblue-300 hover:bg-govblue-50 hover:text-govblue-700"
                      >
                        <span className="font-medium">{acc.role}</span>
                        <span className="ml-1 text-slate-400">{'\u00b7'} {acc.email}</span>
                      </button>
                    ))}
                    <p className="mt-1 w-full text-center text-[10px] text-slate-400">Password for all accounts: demo123</p>
                  </div>
                )}
              </div>
            </div>
          </footer>
      </main>
    </div>
  );
};

export default LoginPage;
