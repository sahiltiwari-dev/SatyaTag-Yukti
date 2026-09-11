/**
 * Shared fetch wrapper for the SATYATAG backend.
 * Sessions are HttpOnly cookies (`satyatag_session`); every request sends
 * credentials so cookies flow automatically. JSON errors are parsed into a
 * readable message.
 */
export class ApiError extends Error {
  readonly status: number;
  constructor(status: number, message: string) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

async function parseError(res: Response, fallback: string): Promise<ApiError> {
  let detail = fallback;
  try {
    const body = await res.json();
    if (body?.detail) {
      if (typeof body.detail === 'string') detail = body.detail;
      else if (Array.isArray(body.detail)) detail = body.detail.map((d: { msg?: string }) => d.msg).join('; ');
      else detail = JSON.stringify(body.detail);
    }
  } catch { /* non-JSON body — keep fallback */ }
  return new ApiError(res.status, detail);
}

/** JSON request helper. Prefix paths with /api. */
export async function apiRequest<T = unknown>(
  path: string,
  options?: RequestInit,
): Promise<T> {
  const res = await fetch(path, {
    ...options,
    credentials: 'include',
    headers: { 'Content-Type': 'application/json', ...(options?.headers || {}) },
  });
  if (!res.ok) throw await parseError(res, `Request failed (${res.status})`);
  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

/** Form-data request helper (uploads). */
export async function apiForm<T = unknown>(
  path: string,
  formData: FormData,
): Promise<T> {
  const res = await fetch(path, { method: 'POST', credentials: 'include', body: formData });
  if (!res.ok) throw await parseError(res, `Request failed (${res.status})`);
  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

/** Raw request for downloads / binary content. */
export async function apiRaw(
  path: string,
  options?: RequestInit,
): Promise<Response> {
  const res = await fetch(path, { ...options, credentials: 'include' });
  if (!res.ok) throw await parseError(res, `Request failed (${res.status})`);
  return res;
}

export function openDownload(url: string, filename?: string): void {
  const a = document.createElement('a');
  a.href = url;
  if (filename) a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
}