/**
 * SatyaTag Authentication Service
 * Talks to the FastAPI backend via `/api/auth/*`. The session is a server-side
 * HttpOnly cookie (`satyatag_session`); no credentials or password hashes are
 * stored client-side.
 *
 * OTPs / reset links are delivered by email. When the backend runs in
 * `console` email mode it echoes them back (`dev_otp` / `dev_reset_url`) so the
 * local flow can be exercised end-to-end.
 */
import { Officer, UserAccount, UserRole } from '../types';

const API_BASE = '/api/auth';

export interface AuthResult {
  success: boolean;
  error?: string;
  accountId?: string;
  email?: string;
  user?: UserAccount;
}

export interface SignupResult {
  success: boolean;
  error?: string;
  accountId?: string;
  devOtp?: string;
  devResetUrl?: string;
  maskedEmail?: string;
  cooldownSeconds?: number;
}

export interface SignUpParams {
  email: string;
  password: string;
  fullName: string;
  role?: UserRole;
  department?: string;
  jurisdiction?: string;
  employeeId?: string;
}

/** Shape of the backend `UserOut` schema (snake_case). */
interface BackendUser {
  id: string;
  email: string;
  full_name: string;
  role: UserRole;
  department: string | null;
  jurisdiction: string | null;
  employee_id: string | null;
  email_verified: boolean;
  account_status: 'active' | 'disabled' | 'pending_verification';
  created_at: string;
}

class ApiError extends Error {
  readonly status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

/** Module-scope cache of the authenticated user (restored via /me on boot). */
let cachedUser: UserAccount | null = null;

function mapBackendUser(u: BackendUser): UserAccount {
  return {
    id: u.id,
    email: u.email,
    fullName: u.full_name,
    role: u.role,
    department: u.department || 'Department of Consumer Affairs',
    jurisdiction: u.jurisdiction || 'Not Specified',
    employeeId: u.employee_id || u.id,
    emailVerified: u.email_verified,
    accountStatus: u.account_status,
    createdAt: u.created_at,
    updatedAt: u.created_at,
    lastLogin: u.created_at,
  };
}

async function apiRequest<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    credentials: 'include', // HttpOnly session cookie
    headers: { 'Content-Type': 'application/json', ...(options?.headers || {}) },
  });
  if (!res.ok) {
    let detail = `Request failed (${res.status})`;
    try {
      const body = await res.json();
      if (body?.detail) {
        if (typeof body.detail === 'string') detail = body.detail;
        else if (Array.isArray(body.detail)) detail = body.detail.map((d: { msg?: string }) => d.msg).join('; ');
        else detail = JSON.stringify(body.detail);
      }
    } catch {
      /* non-JSON error body — keep the generic message */
    }
    throw new ApiError(res.status, detail);
  }
  return (await res.json()) as T;
}

export function getCurrentUser(): UserAccount | null {
  return cachedUser;
}

export function isAuthenticated(): boolean {
  return cachedUser !== null;
}

/** Restores the session when the HttpOnly cookie is still valid. */
export async function initAuth(): Promise<void> {
  try {
    const data = await apiRequest<{ user: BackendUser }>('/me');
    cachedUser = mapBackendUser(data.user);
  } catch {
    cachedUser = null;
  }
}

/** Re-fetches /me and refreshes the cached user (used by the context). */
export async function refreshUser(): Promise<void> {
  try {
    const data = await apiRequest<{ user: BackendUser }>('/me');
    cachedUser = mapBackendUser(data.user);
  } catch {
    cachedUser = null;
  }
}

export async function login(
  email: string,
  password: string,
  rememberMe = false,
): Promise<AuthResult> {
  try {
    const data = await apiRequest<{ user: BackendUser; message: string }>('/login', {
      method: 'POST',
      body: JSON.stringify({
        email: email.trim().toLowerCase(),
        password,
        remember_me: rememberMe,
      }),
    });
    cachedUser = mapBackendUser(data.user);
    return {
      success: true,
      accountId: cachedUser.id,
      email: cachedUser.email,
      user: cachedUser,
    };
  } catch (e) {
    return { success: false, error: e instanceof ApiError ? e.message : 'Login failed.' };
  }
}

export async function logout(): Promise<void> {
  try {
    await apiRequest('/logout', { method: 'POST' });
  } catch {
    /* session already gone — nothing to revoke */
  }
  cachedUser = null;
}

export async function signUp(params: SignUpParams): Promise<SignupResult> {
  try {
    const data = await apiRequest<{
      user: BackendUser;
      masked_email: string;
      dev_otp: string | null;
    }>('/signup', {
      method: 'POST',
      body: JSON.stringify({
        email: params.email.trim().toLowerCase(),
        password: params.password,
        full_name: params.fullName.trim(),
        department: params.department || null,
        jurisdiction: params.jurisdiction || null,
        employee_id: params.employeeId || null,
      }),
    });
    return {
      success: true,
      accountId: data.user.id,
      devOtp: data.dev_otp || undefined,
      maskedEmail: data.masked_email,
    };
  } catch (e) {
    return { success: false, error: e instanceof ApiError ? e.message : 'Signup failed.' };
  }
}

export async function verifyOTP(email: string, otp: string): Promise<AuthResult> {
  try {
    await apiRequest<{ message: string; email_verified: boolean }>('/verify-email', {
      method: 'POST',
      body: JSON.stringify({ email: email.trim().toLowerCase(), otp }),
    });
    return { success: true, email: email.trim().toLowerCase() };
  } catch (e) {
    return {
      success: false,
      error: e instanceof ApiError ? e.message : 'Verification failed.',
    };
  }
}

export async function resendOTP(email: string): Promise<SignupResult> {
  try {
    const data = await apiRequest<{
      message: string;
      masked_email: string;
      cooldown_seconds: number | null;
      dev_otp: string | null;
    }>('/resend-otp', {
      method: 'POST',
      body: JSON.stringify({ email: email.trim().toLowerCase() }),
    });
    return {
      success: true,
      devOtp: data.dev_otp || undefined,
      maskedEmail: data.masked_email,
      cooldownSeconds: data.cooldown_seconds ?? undefined,
    };
  } catch (e) {
    return {
      success: false,
      error: e instanceof ApiError ? e.message : 'Could not resend the code.',
    };
  }
}

export async function requestPasswordReset(email: string): Promise<SignupResult> {
  try {
    const data = await apiRequest<{ message: string; dev_reset_url: string | null }>(
      '/forgot-password',
      { method: 'POST', body: JSON.stringify({ email: email.trim().toLowerCase() }) },
    );
    return { success: true, devResetUrl: data.dev_reset_url || undefined };
  } catch (e) {
    return {
      success: false,
      error: e instanceof ApiError ? e.message : 'Could not request a reset.',
    };
  }
}

export async function resetPassword(
  email: string,
  token: string,
  newPassword: string,
): Promise<AuthResult> {
  try {
    await apiRequest<{ message: string }>('/reset-password', {
      method: 'POST',
      body: JSON.stringify({
        email: email.trim().toLowerCase(),
        token,
        new_password: newPassword,
      }),
    });
    return { success: true, email: email.trim().toLowerCase() };
  } catch (e) {
    return { success: false, error: e instanceof ApiError ? e.message : 'Reset failed.' };
  }
}

export async function changePassword(
  _accountId: string,
  currentPassword: string,
  newPassword: string,
): Promise<AuthResult> {
  // The backend identifies the account from the session cookie, so accountId is
  // ignored — it is accepted purely for legacy call-site compatibility.
  try {
    await apiRequest<{ message: string }>('/change-password', {
      method: 'POST',
      body: JSON.stringify({
        current_password: currentPassword,
        new_password: newPassword,
      }),
    });
    return { success: true };
  } catch (e) {
    return {
      success: false,
      error: e instanceof ApiError ? e.message : 'Password change failed.',
    };
  }
}

export function userToOfficer(account: UserAccount): Officer {
  const roleLabel =
    account.role === 'officer'
      ? 'Legal Metrology Officer'
      : account.role === 'supervisor'
        ? 'Senior Supervisor'
        : 'System Administrator';
  const initials = account.fullName
    .split(' ')
    .map((w) => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
  return {
    id: account.employeeId || account.id,
    name: account.fullName,
    displayName: account.fullName,
    role: roleLabel,
    department: account.department,
    jurisdiction: account.jurisdiction,
    email: account.email,
    status: account.accountStatus === 'active' ? 'Active' : 'Inactive',
    avatarInitials: initials,
    employeeId: account.employeeId,
  };
}