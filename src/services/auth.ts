/**
 * SatyaTag Authentication Service
 * Frontend-only auth layer using localStorage as persistent storage.
 * Passwords are hashed with SHA-256 (Web Crypto API).
 * OTP verification runs in DEV MODE (no real email delivery).
 */

import { UserAccount, PendingVerification, PasswordResetToken, AuditEvent, UserRole } from '../types';

const ACCOUNTS_KEY = 'satyatag-accounts';
const PENDING_KEY = 'satyatag-pending';
const SESSION_KEY = 'satyatag-session';
const RESET_KEY = 'satyatag-reset-tokens';
const AUDIT_KEY = 'satyatag-audit-events';
const SESSION_USER_KEY = 'satyatag-current-user-id';

function generateId(prefix: string): string {
  const ts = Date.now().toString(36);
  const rand = Math.random().toString(36).substring(2, 8);
  return `${prefix}-${ts}-${rand}`;
}

async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(password + 'satyatag-salt-v1');
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hashBuffer)).map((b) => b.toString(16).padStart(2, '0')).join('');
}

function generateOTP(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

async function hashString(s: string): Promise<string> {
  const encoder = new TextEncoder();
  const hashBuffer = await crypto.subtle.digest('SHA-256', encoder.encode(s));
  return Array.from(new Uint8Array(hashBuffer)).map((b) => b.toString(16).padStart(2, '0')).join('');
}

function getNow(): string { return new Date().toISOString(); }
function addMinutes(date: Date, minutes: number): Date { return new Date(date.getTime() + minutes * 60000); }
function loadAccounts(): UserAccount[] {
  try { const raw = localStorage.getItem(ACCOUNTS_KEY); return raw ? JSON.parse(raw) : []; } catch { return []; }
}
function saveAccounts(accounts: UserAccount[]): void { localStorage.setItem(ACCOUNTS_KEY, JSON.stringify(accounts)); }

function loadPending(): PendingVerification[] {
  try { const raw = localStorage.getItem(PENDING_KEY); return raw ? JSON.parse(raw) : []; } catch { return []; }
}
function savePending(items: PendingVerification[]): void { localStorage.setItem(PENDING_KEY, JSON.stringify(items)); }

function loadResetTokens(): PasswordResetToken[] {
  try { const raw = localStorage.getItem(RESET_KEY); return raw ? JSON.parse(raw) : []; } catch { return []; }
}
function saveResetTokens(tokens: PasswordResetToken[]): void { localStorage.setItem(RESET_KEY, JSON.stringify(tokens)); }

function loadAudit(): AuditEvent[] {
  try { const raw = localStorage.getItem(AUDIT_KEY); return raw ? JSON.parse(raw) : []; } catch { return []; }
}
function saveAudit(events: AuditEvent[]): void { localStorage.setItem(AUDIT_KEY, JSON.stringify(events)); }

function addAuditEvent(accountId: string, action: string, entity: string, status: string): void {
  const events = loadAudit();
  events.push({ id: generateId('AUD'), accountId, action, entity, status, timestamp: getNow() });
  saveAudit(events);
}
async function seedDemoAccountsIfEmpty(): Promise<void> {
  const existing = loadAccounts();
  if (existing.length > 0) return;
  const demoUsers: Array<{ email: string; fullName: string; role: UserRole; department: string; jurisdiction: string; employeeId: string }> = [
    { email: 'officer@consumer.gov.in', fullName: 'A. Sharma', role: 'officer', department: 'Department of Consumer Affairs', jurisdiction: 'Delhi (Central)', employeeId: 'LM-DEL-001' },
    { email: 'supervisor@consumer.gov.in', fullName: 'R. Mehta', role: 'supervisor', department: 'Department of Consumer Affairs', jurisdiction: 'Delhi (All Zones)', employeeId: 'LM-DEL-050' },
    { email: 'admin@consumer.gov.in', fullName: 'P. Gupta', role: 'admin', department: 'Department of Consumer Affairs', jurisdiction: 'National', employeeId: 'LM-ADM-001' },
  ];
  const now = getNow();
  const hashedPwd = await hashPassword('demo123');
  const accounts: UserAccount[] = demoUsers.map((u) => ({
    id: generateId('USR'), email: u.email, passwordHash: hashedPwd, fullName: u.fullName,
    role: u.role, department: u.department, jurisdiction: u.jurisdiction, employeeId: u.employeeId,
    emailVerified: true, accountStatus: 'active' as const, createdAt: now, updatedAt: now, lastLogin: now,
  }));
  saveAccounts(accounts);
  accounts.forEach((a) => addAuditEvent(a.id, 'ACCOUNT_SEEDED', `user:${a.id}`, 'Success'));
}
// ─── Public API ─────────────────────────────────────

export interface AuthResult {
  success: boolean;
  error?: string;
  accountId?: string;
  email?: string;
}

export interface SignupResult {
  success: boolean;
  error?: string;
  accountId?: string;
  devOtp?: string;
  maskedEmail?: string;
}

export async function initAuth(): Promise<void> {
  await seedDemoAccountsIfEmpty();
}

export function emailExists(email: string): boolean {
  return loadAccounts().some((a) => a.email.toLowerCase() === email.toLowerCase().trim());
}

export function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

export function validatePassword(password: string): { valid: boolean; error?: string } {
  if (password.length < 6) return { valid: false, error: 'Password must be at least 6 characters' };
  if (password.length > 128) return { valid: false, error: 'Password must be less than 128 characters' };
  if (!/[A-Za-z]/.test(password)) return { valid: false, error: 'Password must contain at least one letter' };
  if (!/[0-9]/.test(password)) return { valid: false, error: 'Password must contain at least one number' };
  return { valid: true };
}
export async function signUp(params: {
  email: string; password: string; fullName: string; role: UserRole;
  department: string; jurisdiction: string; employeeId?: string;
}): Promise<SignupResult> {
  const email = params.email.trim().toLowerCase();
  if (!isValidEmail(email)) return { success: false, error: 'Please enter a valid email address' };
  if (emailExists(email)) return { success: false, error: 'An account already exists with this email address.' };
  const pwdCheck = validatePassword(params.password);
  if (!pwdCheck.valid) return { success: false, error: pwdCheck.error };
  if (!params.fullName.trim()) return { success: false, error: 'Please enter your full name' };

  const now = getNow();
  const accountId = generateId('USR');
  const passwordHash = await hashPassword(params.password);
  const account: UserAccount = {
    id: accountId, email, passwordHash, fullName: params.fullName.trim(),
    role: params.role, department: params.department || 'Department of Consumer Affairs',
    jurisdiction: params.jurisdiction || 'Not Specified', employeeId: params.employeeId || generateId('EMP'),
    emailVerified: false, accountStatus: 'pending_verification', createdAt: now, updatedAt: now, lastLogin: '',
  };
  const accounts = loadAccounts();
  accounts.push(account);
  saveAccounts(accounts);

  const otp = generateOTP();
  const otpHash = await hashString(otp);
  const pending: PendingVerification = {
    accountId, email, otpHash, createdAt: now,
    expiresAt: addMinutes(new Date(), 10).toISOString(), attempts: 0, maxAttempts: 5,
  };
  const pendings = loadPending();
  pendings.push(pending);
  savePending(pendings);
  addAuditEvent(accountId, 'ACCOUNT_CREATED', `user:${accountId}`, 'Success');
  addAuditEvent(accountId, 'OTP_GENERATED', `verification:${accountId}`, 'Success');

  const [local, domain] = email.split('@');
  const masked = local[0] + '***@' + domain;
  console.log(`[DEV MODE] OTP for ${email}: ${otp}`);
  return { success: true, accountId, devOtp: otp, maskedEmail: masked };
}
export async function verifyOTP(email: string, otp: string): Promise<AuthResult> {
  const normalizedEmail = email.trim().toLowerCase();
  const pendings = loadPending();
  const pending = pendings.find((p) => p.email.toLowerCase() === normalizedEmail && new Date(p.expiresAt) > new Date());
  if (!pending) return { success: false, error: 'Verification code has expired. Please request a new one.' };
  if (pending.attempts >= pending.maxAttempts) return { success: false, error: 'Too many verification attempts. Please request a new code.' };

  const otpHash = await hashString(otp);
  pending.attempts += 1;
  savePending(pendings.filter((p) => !(p.accountId === pending.accountId && p.email === pending.email)));

  if (otpHash !== pending.otpHash) {
    addAuditEvent(pending.accountId, 'OTP_VERIFICATION_FAILED', `verification:${pending.accountId}`, 'Failed');
    return { success: false, error: `Incorrect code. ${pending.maxAttempts - pending.attempts} attempts remaining.` };
  }

  const accounts = loadAccounts();
  const account = accounts.find((a) => a.id === pending.accountId);
  if (!account) return { success: false, error: 'Account not found.' };
  account.emailVerified = true;
  account.accountStatus = 'active';
  account.updatedAt = getNow();
  saveAccounts(accounts);
  addAuditEvent(account.id, 'EMAIL_VERIFIED', `user:${account.id}`, 'Success');
  return { success: true, accountId: account.id, email: account.email };
}

export async function resendOTP(email: string): Promise<SignupResult> {
  const normalizedEmail = email.trim().toLowerCase();
  const accounts = loadAccounts();
  const account = accounts.find((a) => a.email.toLowerCase() === normalizedEmail);
  if (!account) return { success: false, error: 'Account not found.' };
  if (account.emailVerified) return { success: false, error: 'Email is already verified.' };
  const pendings = loadPending().filter((p) => p.email.toLowerCase() !== normalizedEmail);
  const otp = generateOTP();
  const otpHash = await hashString(otp);
  const now = getNow();
  pendings.push({ accountId: account.id, email: normalizedEmail, otpHash, createdAt: now, expiresAt: addMinutes(new Date(), 10).toISOString(), attempts: 0, maxAttempts: 5 });
  savePending(pendings);
  addAuditEvent(account.id, 'OTP_RESENT', `verification:${account.id}`, 'Success');
  const [local, domain] = normalizedEmail.split('@');
  console.log(`[DEV MODE] New OTP for ${normalizedEmail}: ${otp}`);
  return { success: true, devOtp: otp, maskedEmail: local[0] + '***@' + domain, accountId: account.id };
}
export async function login(email: string, password: string): Promise<AuthResult> {
  const normalizedEmail = email.trim().toLowerCase();
  const accounts = loadAccounts();
  const account = accounts.find((a) => a.email.toLowerCase() === normalizedEmail);
  if (!account) return { success: false, error: 'Account not found. Please check your email or create an account.' };
  if (account.accountStatus === 'disabled') return { success: false, error: 'This account has been disabled. Please contact an administrator.' };
  if (account.accountStatus === 'pending_verification') return { success: false, error: 'Please verify your email address before signing in.' };
  if (!account.emailVerified) return { success: false, error: 'Please verify your email address before signing in.' };

  const passwordHash = await hashPassword(password);
  if (passwordHash !== account.passwordHash) {
    addAuditEvent(account.id, 'LOGIN_FAILED', `user:${account.id}`, 'Failed');
    return { success: false, error: 'Incorrect email or password.' };
  }
  account.lastLogin = getNow();
  account.updatedAt = getNow();
  saveAccounts(accounts);
  localStorage.setItem(SESSION_KEY, generateId('SES'));
  localStorage.setItem(SESSION_USER_KEY, account.id);
  addAuditEvent(account.id, 'LOGIN_SUCCESS', `user:${account.id}`, 'Success');
  return { success: true, accountId: account.id, email: account.email };
}

export function logout(): void {
  const accountId = localStorage.getItem(SESSION_USER_KEY);
  if (accountId) addAuditEvent(accountId, 'LOGOUT', `user:${accountId}`, 'Success');
  localStorage.removeItem(SESSION_KEY);
  localStorage.removeItem(SESSION_USER_KEY);
}

export function getCurrentUser(): UserAccount | null {
  const userId = localStorage.getItem(SESSION_USER_KEY);
  if (!userId) return null;
  return loadAccounts().find((a) => a.id === userId) || null;
}

export function isAuthenticated(): boolean {
  return !!(localStorage.getItem(SESSION_KEY) && localStorage.getItem(SESSION_USER_KEY));
}

export function getAccountById(id: string): UserAccount | null {
  return loadAccounts().find((a) => a.id === id) || null;
}

export async function changePassword(accountId: string, currentPassword: string, newPassword: string): Promise<AuthResult> {
  const accounts = loadAccounts();
  const account = accounts.find((a) => a.id === accountId);
  if (!account) return { success: false, error: 'Account not found.' };
  const currentHash = await hashPassword(currentPassword);
  if (currentHash !== account.passwordHash) {
    addAuditEvent(accountId, 'PASSWORD_CHANGE_FAILED', `user:${accountId}`, 'Failed');
    return { success: false, error: 'Current password is incorrect.' };
  }
  const pwdCheck = validatePassword(newPassword);
  if (!pwdCheck.valid) return { success: false, error: pwdCheck.error };
  account.passwordHash = await hashPassword(newPassword);
  account.updatedAt = getNow();
  saveAccounts(accounts);
  addAuditEvent(accountId, 'PASSWORD_CHANGED', `user:${accountId}`, 'Success');
  return { success: true };
}
export async function requestPasswordReset(email: string): Promise<SignupResult> {
  const normalizedEmail = email.trim().toLowerCase();
  const accounts = loadAccounts();
  const account = accounts.find((a) => a.email.toLowerCase() === normalizedEmail);
  if (!account) return { success: false, error: 'No account found with this email address.' };
  const tokens = loadResetTokens().filter((t) => t.accountId !== account.id);
  const otp = generateOTP();
  const tokenHash = await hashString(otp);
  const now = getNow();
  tokens.push({ accountId: account.id, tokenHash, createdAt: now, expiresAt: addMinutes(new Date(), 10).toISOString(), used: false });
  saveResetTokens(tokens);
  addAuditEvent(account.id, 'PASSWORD_RESET_REQUESTED', `user:${account.id}`, 'Success');
  const [local, domain] = normalizedEmail.split('@');
  console.log(`[DEV MODE] Password reset OTP for ${normalizedEmail}: ${otp}`);
  return { success: true, devOtp: otp, maskedEmail: local[0] + '***@' + domain, accountId: account.id };
}

export async function resetPassword(email: string, otp: string, newPassword: string): Promise<AuthResult> {
  const normalizedEmail = email.trim().toLowerCase();
  const accounts = loadAccounts();
  const account = accounts.find((a) => a.email.toLowerCase() === normalizedEmail);
  if (!account) return { success: false, error: 'Account not found.' };
  const tokens = loadResetTokens().filter((t) => t.accountId === account.id && !t.used && new Date(t.expiresAt) > new Date());
  if (tokens.length === 0) return { success: false, error: 'Reset code has expired. Please request a new one.' };
  const token = tokens[0];
  const otpHash = await hashString(otp);
  if (otpHash !== token.tokenHash) {
    addAuditEvent(account.id, 'PASSWORD_RESET_FAILED', `user:${account.id}`, 'Failed');
    return { success: false, error: 'Incorrect reset code.' };
  }
  const pwdCheck = validatePassword(newPassword);
  if (!pwdCheck.valid) return { success: false, error: pwdCheck.error };
  token.used = true;
  saveResetTokens(loadResetTokens().map((t) => (t.accountId === token.accountId && t.tokenHash === token.tokenHash ? token : t)));
  account.passwordHash = await hashPassword(newPassword);
  account.updatedAt = getNow();
  saveAccounts(accounts);
  addAuditEvent(account.id, 'PASSWORD_RESET_COMPLETED', `user:${account.id}`, 'Success');
  return { success: true };
}

export function userToOfficer(account: UserAccount) {
  const roleLabel = account.role === 'officer' ? 'Legal Metrology Officer' : account.role === 'supervisor' ? 'Senior Supervisor' : 'System Administrator';
  const initials = account.fullName.split(' ').map((w) => w[0]).join('').toUpperCase().slice(0, 2);
  return {
    id: account.employeeId || account.id, name: account.fullName, displayName: account.fullName,
    role: roleLabel, department: account.department, jurisdiction: account.jurisdiction,
    email: account.email, status: (account.accountStatus === 'active' ? 'Active' : 'Inactive') as 'Active' | 'Inactive',
    avatarInitials: initials, employeeId: account.employeeId,
  };
}

export function getAllAccounts(): UserAccount[] { return loadAccounts(); }
export function getAuditEvents(accountId?: string): AuditEvent[] {
  const events = loadAudit();
  return accountId ? events.filter((e) => e.accountId === accountId) : events;
}
