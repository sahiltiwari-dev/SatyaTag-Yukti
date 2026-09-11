import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { ArrowRight, Shield, UserPlus } from 'lucide-react';
import { SatyaTagLogo, GovHeader } from '../components/Brand';
import { DemoTag } from '../components/common/StatusBadge';
import { useAuth } from '../context/AuthContext';
import { useDemo } from '../context/DemoContext';
import { userToOfficer } from '../services/auth';
import { UserRole } from '../types';

const SignupPage: React.FC = () => {
  const navigate = useNavigate();
  const { signUp } = useAuth();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [role, setRole] = useState<UserRole>('officer');
  const [department, setDepartment] = useState('Department of Consumer Affairs');
  const [jurisdiction, setJurisdiction] = useState('');
  const [employeeId, setEmployeeId] = useState('');
  const [showPwd, setShowPwd] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [pwdErrors, setPwdErrors] = useState<string[]>([]);

  const checkPassword = (pwd: string) => {
    const errs: string[] = [];
    if (pwd.length > 0 && pwd.length < 6) errs.push('At least 6 characters');
    if (pwd.length > 0 && !/[A-Za-z]/.test(pwd)) errs.push('At least one letter');
    if (pwd.length > 0 && !/[0-9]/.test(pwd)) errs.push('At least one number');
    setPwdErrors(errs);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!fullName.trim()) { setError('Please enter your full name'); return; }
    if (!email.trim()) { setError('Please enter your email'); return; }
    if (password !== confirmPassword) { setError('Passwords do not match'); return; }
    if (password.length < 6) { setError('Password must be at least 6 characters'); return; }
    setLoading(true);
    const result = await signUp({ email, password, fullName, role, department, jurisdiction: jurisdiction || 'Not Specified', employeeId });
    setLoading(false);
    if (!result.success) { setError(result.error || 'Signup failed'); return; }
    navigate('/verify-email', { state: { email, otp: result.devOtp, maskedEmail: result.maskedEmail } });
  };
  const inputClass = 'w-full rounded-button border border-navy-600 bg-navy-800/60 px-3.5 py-2.5 text-sm text-white placeholder-slate-500 focus:border-govblue-500 focus:outline-none focus:ring-1 focus:ring-govblue-500';
  const labelClass = 'mb-1 block text-xs font-medium text-slate-300';

  return (
    <div className="flex min-h-screen items-center justify-center bg-navy-950 px-4 py-10">
      <div className="w-full max-w-md">
        <div className="mb-6 text-center"><GovHeader /></div>
        <div className="mb-2 flex justify-center"><SatyaTagLogo size="lg" /></div>
        <p className="mb-6 text-center text-sm text-slate-400">Create an Officer Account</p>
        <div className="rounded-card border border-navy-700/50 bg-navy-900/80 p-6 shadow-2xl backdrop-blur">
          <div className="mb-4 flex items-center gap-2">
            <UserPlus className="h-5 w-5 text-govblue-400" />
            <h2 className="text-lg font-semibold text-white">Sign Up</h2>
          </div>
          {error && (
            <div className="mb-4 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-400">{error}</div>
          )}
          <form onSubmit={handleSubmit} className="space-y-3">
            <label className="block">
              <span className={labelClass}>Full Name</span>
              <input type="text" value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="e.g. Rajesh Kumar" className={inputClass} required />
            </label>
            <label className="block">
              <span className={labelClass}>Email Address</span>
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@consumer.gov.in" className={inputClass} required />
            </label>
            <div className="grid grid-cols-2 gap-3">
              <label className="block">
                <span className={labelClass}>Password</span>
                <div className="relative">
                  <input type={showPwd ? 'text' : 'password'} value={password} onChange={(e) => { setPassword(e.target.value); checkPassword(e.target.value); }} placeholder="Min 6 chars" className={inputClass} required />
                </div>
              </label>
              <label className="block">
                <span className={labelClass}>Confirm Password</span>
                <input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="Re-enter" className={inputClass} required />
              </label>
            </div>
            {pwdErrors.length > 0 && (
              <div className="space-y-0.5">
                {pwdErrors.map((e) => <p key={e} className="text-[10px] text-amber-400">\u2022 {e}</p>)}
              </div>
            )}
            <label className="block">
              <span className={labelClass}>Role</span>
              <select value={role} onChange={(e) => setRole(e.target.value as UserRole)} className={inputClass}>
                <option value="officer">Enforcement Officer</option>
                <option value="supervisor">Senior Supervisor</option>
                <option value="admin">System Administrator</option>
              </select>
            </label>
            <div className="grid grid-cols-2 gap-3">
              <label className="block">
                <span className={labelClass}>Department</span>
                <input type="text" value={department} onChange={(e) => setDepartment(e.target.value)} className={inputClass} />
              </label>
              <label className="block">
                <span className={labelClass}>Jurisdiction</span>
                <input type="text" value={jurisdiction} onChange={(e) => setJurisdiction(e.target.value)} placeholder="e.g. Delhi (Central)" className={inputClass} />
              </label>
            </div>
            <label className="block">
              <span className={labelClass}>Employee ID (optional)</span>
              <input type="text" value={employeeId} onChange={(e) => setEmployeeId(e.target.value)} placeholder="Auto-generated if blank" className={inputClass} />
            </label>
            <button type="submit" disabled={loading}
              className="flex w-full items-center justify-center gap-2 rounded-button bg-govblue-600 py-3 text-sm font-semibold text-white transition-colors hover:bg-govblue-700 disabled:cursor-not-allowed disabled:opacity-50">
              {loading ? 'Creating Account...' : 'Create Account'} <ArrowRight className="h-4 w-4" />
            </button>
            <p className="text-center text-xs text-slate-400">
              Already have an account?{' '}
              <Link to="/login" className="font-medium text-govblue-400 hover:text-govblue-300">Sign In</Link>
            </p>
          </form>
        </div>
        <div className="mt-6 flex justify-center"><DemoTag label="DEMO ENVIRONMENT" /></div>
      </div>
    </div>
  );
};

export default SignupPage;
