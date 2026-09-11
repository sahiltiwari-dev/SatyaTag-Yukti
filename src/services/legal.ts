/**
 * SatyaTag Legal Rule Library Service — read-only access to the curated legal
 * database (Legal Metrology Act 2009 & Packaged Commodities Rules 2011).
 */
import { apiRequest } from './api';

export interface LegalSource {
  id: string;
  title: string;
  source_organization: string | null;
  source_url: string | null;
}

export interface LegalDocument {
  id: string;
  title: string;
  reference: string | null;
  document_type: string;
  status: string;
  effective_date: string | null;
  source_url: string | null;
}

export interface LegalVersion {
  id: string;
  version: string;
  title: string;
  description: string | null;
  content: string | null;
  effective_date: string | null;
  source_url: string | null;
  status: string;
  change_note: string | null;
}

export interface LegalRule {
  id: string;
  document_id: string;
  rule_number: string | null;
  title: string;
  description: string | null;
  category: string | null;
  subcategory: string | null;
  check_type: string;
  severity: string;
  status: string;
  versions?: LegalVersion[] | null;
  document?: LegalDocument | null;
  amendments?: { id: string; title: string; reference: string | null; effective_date: string | null; status: string }[] | null;
}

export interface LegalRulesResponse {
  items: LegalRule[];
  total: number;
  limit: number;
  offset: number;
}

export async function listRules(params?: {
  search?: string;
  category?: string;
  status?: string;
  severity?: string;
  limit?: number;
}): Promise<LegalRulesResponse> {
  const qs = new URLSearchParams();
  if (params?.search) qs.set('search', params.search);
  if (params?.category) qs.set('category', params.category);
  if (params?.status) qs.set('status', params.status);
  if (params?.severity) qs.set('severity', params.severity);
  if (params?.limit) qs.set('limit', String(params.limit));
  const q = qs.toString();
  return apiRequest<LegalRulesResponse>(`/api/legal/rules${q ? `?${q}` : ''}`);
}

export async function getRule(ruleId: string): Promise<LegalRule> {
  return apiRequest<LegalRule>(`/api/legal/rules/${ruleId}`);
}

export async function listDocuments(): Promise<LegalDocument[]> {
  const res = await apiRequest<{ items: LegalDocument[] }>('/api/legal/documents?limit=100');
  return res.items;
}

export async function listSources(): Promise<LegalSource[]> {
  return apiRequest<LegalSource[]>('/api/legal/sources');
}

export async function listCategories(): Promise<string[]> {
  return apiRequest<string[]>('/api/legal/categories');
}

export async function seedLegalDatabase(): Promise<{ message: string }> {
  return apiRequest<{ message: string }>('/api/legal/seed', { method: 'POST' });
}