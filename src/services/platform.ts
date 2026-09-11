/**
 * SatyaTag Dashboard, Analytics, Notifications, Audit and Reports services.
 */
import { apiRequest, apiRaw, openDownload } from './api';

// --- Dashboard ---------------------------------------------------------

export interface DashboardStats {
  total_inspections: number;
  compliant: number;
  non_compliant: number;
  manual_review: number;
  pending: number;
  in_progress: number;
  completed: number;
  compliance_rate: number;
  avg_analytics_score: number;
  trend: { days: number; data: { date: string; count: number }[] };
}

export function getDashboardStats(): Promise<DashboardStats> {
  return apiRequest<DashboardStats>('/api/dashboard/stats');
}

// --- Analytics ---------------------------------------------------------

export interface AnalyticsOverview {
  total_inspections: number;
  compliance_rate: number;
  manual_reviews: number;
  potential_violations: number;
  status_distribution: { label: string; value: number }[];
  category_distribution: { label: string; value: number }[];
  mode_distribution: { label: string; value: number }[];
  recent: Record<string, unknown>[];
}

export function getAnalytics(): Promise<AnalyticsOverview> {
  return apiRequest<AnalyticsOverview>('/api/analytics/overview');
}

// --- Notifications -----------------------------------------------------

export interface NotificationItem {
  id: string;
  title: string;
  body: string | null;
  type: string;
  is_read: boolean;
  related_inspection_id: string | null;
  created_at: string | null;
}

export interface NotificationsResponse {
  items: NotificationItem[];
  unread_count: number;
}

export function getNotifications(): Promise<NotificationsResponse> {
  return apiRequest<NotificationsResponse>('/api/notifications');
}

export function markNotificationRead(id: string): Promise<NotificationItem> {
  return apiRequest<NotificationItem>(`/api/notifications/${id}/read`, { method: 'POST' });
}

export function markAllNotificationsRead(): Promise<{ updated: number }> {
  return apiRequest<{ updated: number }>('/api/notifications/read-all', { method: 'POST' });
}

// --- Audit -------------------------------------------------------------

export interface AuditItem {
  id: string;
  event_type: string;
  actor_email: string | null;
  entity_type: string | null;
  entity_id: string | null;
  metadata: Record<string, unknown> | null;
  ip_address: string | null;
  created_at: string | null;
}

export function getAuditLog(params?: { event_type?: string; limit?: number }): Promise<{ items: AuditItem[]; total: number }> {
  const qs = new URLSearchParams();
  if (params?.event_type) qs.set('event_type', params.event_type);
  if (params?.limit) qs.set('limit', String(params.limit));
  const q = qs.toString();
  return apiRequest(`/api/audit${q ? `?${q}` : ''}`);
}
// --- Reports ------------------------------------------------------------

export interface ReportMetadataItem {
  id: string;
  file_name: string;
  file_size: number | null;
  checksum: string | null;
  decision_at_generation: string | null;
  generated_at: string | null;
  url: string;
}

export interface GenerateReportResult {
  file_name: string;
  url: string;
  checksum: string;
  file_size: number;
  decision_at_generation: string;
  generated_at: string | null;
}

export async function generateReport(inspectionId: string): Promise<GenerateReportResult> {
  return apiRequest<GenerateReportResult>(`/api/inspections/${inspectionId}/report`, {
    method: 'POST',
  });
}

export async function getReportMetadata(inspectionId: string): Promise<ReportMetadataItem[]> {
  return apiRequest<ReportMetadataItem[]>(`/api/inspections/${inspectionId}/report/metadata`);
}

/** Verifies a report exists then triggers a browser download. */
export async function openReportDownload(inspectionId: string): Promise<string> {
  await apiRaw(`/api/inspections/${inspectionId}/report/download`);
  openDownload(`/api/inspections/${inspectionId}/report/download`);
  return `/api/inspections/${inspectionId}/report/download`;
}

// --- Users ---------------------------------------------------------------

export interface UserProfileResult {
  id: string;
  email: string;
  full_name: string;
  role: string;
  department: string | null;
  jurisdiction: string | null;
  employee_id: string | null;
  email_verified: boolean;
  account_status: string;
  last_login: string | null;
  created_at: string | null;
  profile: { designation: string | null; phone: string | null; address: string | null } | null;
}

export function getMyProfile(): Promise<UserProfileResult> {
  return apiRequest<UserProfileResult>('/api/users/me');
}

export function updateMyProfile(patch: Record<string, unknown>): Promise<UserProfileResult> {
  return apiRequest<UserProfileResult>('/api/users/me', {
    method: 'PATCH',
    body: JSON.stringify(patch),
  });
}

export function getSessions(): Promise<{ id: string; ip: string | null; user_agent: string | null; created_at: string | null }[]> {
  return apiRequest('/api/users/me/sessions');
}

// --- Listing -------------------------------------------------------------

export interface ListingCheckResult {
  id: string;
  inspection_id: string;
  platform_name: string;
  listing_url: string;
  listing_title: string;
  listing_price: string;
  listing_quantity: string;
  seller_name: string;
  status: string;
}

export async function createListingCheck(
  inspectionId: string,
  payload: {
    platform_name?: string;
    listing_url: string;
    listing_title?: string;
    listing_price?: string;
    listing_quantity?: string;
    seller_name?: string;
  },
): Promise<ListingCheckResult> {
  return apiRequest<ListingCheckResult>(`/api/inspections/${inspectionId}/listing`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function analyseListing(inspectionId: string, listingId: string): Promise<{
  id: string;
  listing_id: string;
  status: string;
  summary: string;
  results: { issues: string[]; ok_checks: string[] };
  machine_checks: { label: string; passed: boolean }[];
  demo: boolean;
  note: string;
}> {
  return apiRequest(`/api/inspections/${inspectionId}/listing/${listingId}/analyse`, {
    method: 'POST',
  });
}

export async function listListingChecks(inspectionId: string): Promise<ListingCheckResult[]> {
  return apiRequest<ListingCheckResult[]>(`/api/inspections/${inspectionId}/listing`);
}