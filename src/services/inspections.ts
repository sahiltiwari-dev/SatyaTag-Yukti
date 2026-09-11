/**
 * SatyaTag Inspection Service
 * Talks to the FastAPI backend via `/api/inspections`. PostgreSQL is the
 * single source of truth for inspection data.
 */
import { EvidenceAsset, ExtractedField, Finding, Inspection, Officer } from '../types';

const API_BASE = '/api/inspections';

export interface CreateInspectionPayload {
  inspection_type?: string;
  mode?: string;
  location?: string;
  status?: string;
  stage?: string;
  product_name?: string;
  product_brand?: string;
  manufacturer?: string;
  category?: string;
  is_demo?: boolean;
}

export interface InspectionListResponse {
  items: unknown[];
  total: number;
  limit: number;
  offset: number;
}

class ApiError extends Error {
  readonly status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
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
    } catch { /* ignore */ }
    throw new ApiError(res.status, detail);
  }
  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

// --- mapping helpers ------------------------------------------------------

function initials(name: string): string {
  return name.split(' ').map((w) => w[0]).join('').toUpperCase().slice(0, 2);
}

function roleLabel(role: string | undefined): string {
  if (role === 'supervisor') return 'Senior Supervisor';
  if (role === 'admin') return 'System Administrator';
  return 'Legal Metrology Officer';
}

function defaultOfficer(owner?: Record<string, unknown>): Officer {
  const name = String(owner?.full_name || 'SATYATAG Officer');
  return {
    id: String(owner?.id || ''), name, displayName: name,
    role: roleLabel(String(owner?.role || '')),
    department: String(owner?.department || 'Department of Consumer Affairs'),
    jurisdiction: String(owner?.jurisdiction || 'Not Specified'),
    email: String(owner?.email || ''), status: 'Active',
    avatarInitials: initials(name),
    employeeId: String(owner?.employee_id || ''),
  };
}

function mapEvidence(data: Record<string, any>): EvidenceAsset[] {
  if (!Array.isArray(data.evidence)) return [];
  return data.evidence.map((e: Record<string, any>, i: number) => ({
    id: String(e.id), surface: e.surface as EvidenceAsset['surface'],
    capturedAt: e.captured_at || data.created_at || new Date().toISOString(),
    qualityStatus: (e.quality_status as EvidenceAsset['qualityStatus']) || 'Acceptable',
    qualityScore: typeof e.quality_score === 'number' ? e.quality_score : 85,
    thumbnailColor: ['#F7C948', '#4CAF50', '#2196F3', '#9C27B0', '#FF7043'][i % 5],
    label: `${e.surface} — package surface`,
    imageUrl: e.id ? `/api/evidence/${e.id}/file` : '',
    fileName: e.original_filename || undefined,
    isPlaceholder: !!e.is_placeholder,
  }));
}

function mapExtractedFields(data: Record<string, any>): ExtractedField[] {
  if (!Array.isArray(data.extracted_fields)) return [];
  return data.extracted_fields.map((f: Record<string, any>) => ({
    id: String(f.id), label: String(f.label || ''), value: String(f.value || ''),
    source: String(f.source || ''), evidenceId: String(f.evidence_id || ''),
    ocrConfidence: typeof f.ocr_confidence === 'number' ? f.ocr_confidence : 0,
    extractionConfidence: typeof f.extraction_confidence === 'number' ? f.extraction_confidence : 0,
    boundingBox: f.bounding_box || { x: 0, y: 0, w: 0, h: 0 },
  }));
}

function mapFindings(data: Record<string, any>): Finding[] {
  if (!Array.isArray(data.findings)) return [];
  return data.findings.map((fi: Record<string, any>) => ({
    id: String(fi.id),
    type: (fi.finding_type === 'VIOLATION' ? 'VIOLATION' : fi.finding_type === 'REVIEW' ? 'REVIEW' : 'INFO') as Finding['type'],
    title: String(fi.title || ''), severity: fi.severity as Finding['severity'],
    status: fi.status as Finding['status'], description: String(fi.description || ''),
    ruleId: String(fi.rule_id || ''), ruleTitle: '', ruleVersion: String(fi.rule_version_id || ''),
    evidenceFront: '', evidenceBack: '', frontValue: '', backValue: '', difference: '',
    ocrConfidence: typeof fi.ocr_confidence === 'number' ? fi.ocr_confidence : 0,
    officerDecision: fi.officer_decision as Finding['officerDecision'],
    officerNotes: String(fi.officer_notes || ''),
  }));
}

export function mapInspectionFromApi(data: Record<string, any>): Inspection {
  return {
    id: String(data.id), inspectionId: String(data.id), officer: defaultOfficer(data.owner),
    type: data.inspection_type as Inspection['type'], mode: data.mode as Inspection['mode'],
    location: String(data.location || ''), createdAt: data.created_at || new Date().toISOString(),
    stage: (data.stage as Inspection['stage']) || 'IDLE',
    status: (data.status as Inspection['status']) || 'Draft',
    product: {
      name: String(data.product_name || ''), brand: String(data.product_brand || ''),
      manufacturer: String(data.manufacturer || ''), category: String(data.category || ''),
      subcategory: String(data.subcategory || ''), barcode: String(data.barcode || ''),
      netQuantity: String(data.net_quantity || ''), mrp: String(data.mrp || ''),
      dateOfManufacture: String(data.date_of_manufacture || ''), bestBefore: String(data.best_before || ''),
      countryOfOrigin: String(data.country_of_origin || ''), commonName: String(data.common_name || ''),
      consumerCare: String(data.consumer_care || ''), unitSalePrice: String(data.unit_sale_price || ''),
    },
    evidence: mapEvidence(data), ocrResults: [], extractedFields: mapExtractedFields(data),
    classification: {
      category: String(data.classification?.category || 'Unclassified'),
      subcategory: String(data.classification?.subcategory || ''),
      confidence: typeof data.classification?.confidence === 'number' ? data.classification.confidence : 0,
      signals: [], candidates: [],
    },
    applicability: {
      productType: String(data.applicability?.product_type || ''),
      isFood: !!data.applicability?.is_food, isRetail: !!data.applicability?.is_retail,
      isImported: !!data.applicability?.is_imported, isSpecialCategory: !!data.applicability?.is_special_category,
      quantityCondition: '',
      machineCheckableCount: data.applicability?.machine_checkable_count || 0,
      officerReviewCount: data.applicability?.officer_review_count || 0,
    },
    complianceChecks: Array.isArray(data.compliance_checks)
      ? data.compliance_checks.map((c: Record<string, any>) => ({
          id: String(c.id), ruleId: String(c.rule_id),
          ruleTitle: '',
          status: (c.outcome === 'PASS' || c.outcome === 'REVIEW' || c.outcome === 'VIOLATION' || c.outcome === 'NOT_APPLICABLE') ? c.outcome : 'REVIEW',
          severity: c.severity === 'CRITICAL' || c.severity === 'HIGH' ? 'MAJOR' : c.severity === 'LOW' ? 'INFO' : 'MINOR',
          description: c.message || '',
          evidence: [] as string[],
          confidence: 0,
          isMachineCheckable: true,
        }))
      : [],
    findings: mapFindings(data),
    officerDecision: data.officer_decision as Inspection['officerDecision'],
    finalNotes: String(data.final_notes || ''),
    decisionDate: data.decision_date || data.created_at || '',
    analyticsScore: typeof data.analytics_score === 'number' ? data.analytics_score : 0,
    reportGenerated: !!data.report_generated, fingerprint: [],
  };
}

// --- API calls ------------------------------------------------------------

export async function listInspections(): Promise<Inspection[]> {
  const data = await apiRequest<InspectionListResponse>('');
  return data.items.map((i) => mapInspectionFromApi(i as Record<string, any>));
}

export async function getInspection(id: string): Promise<Inspection> {
  const data = await apiRequest<Record<string, any>>(`/${id}`);
  return mapInspectionFromApi(data);
}

export async function createInspection(payload: CreateInspectionPayload): Promise<Inspection> {
  const data = await apiRequest<Record<string, any>>('', {
    method: 'POST', body: JSON.stringify(payload),
  });
  return mapInspectionFromApi(data);
}

export async function updateInspection(id: string, patch: Record<string, any>): Promise<Inspection> {
  const data = await apiRequest<Record<string, any>>(`/${id}`, {
    method: 'PATCH', body: JSON.stringify(patch),
  });
  return mapInspectionFromApi(data);
}

export async function setOfficerDecision(id: string, decision: string, notes: string): Promise<Inspection> {
  const data = await apiRequest<Record<string, any>>(`/${id}/decision`, {
    method: 'POST', body: JSON.stringify({ decision, notes }),
  });
  return mapInspectionFromApi(data);
}

// --- Evidence upload / delete ------------------------------------------------

/** Raw upload response from the evidence endpoint. */
export interface EvidenceUploadResponse {
  id: string;
  inspection_id: string;
  inspection_number: string;
  surface: string;
  original_filename: string;
  mime_type: string;
  file_size: number;
  sha256: string;
  url: string;
  captured_at: string;
  quality_status: string;
  quality_score: number;
}

/**
 * Upload an evidence image file to the backend.
 * The backend stores the file on disk and metadata in PostgreSQL.
 * Uploading to the same surface replaces any previous evidence for that surface.
 */
export async function uploadEvidence(
  inspectionId: string,
  file: File,
  surface: string,
): Promise<EvidenceUploadResponse> {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('surface', surface);

  const res = await fetch(`/api/inspections/${inspectionId}/evidence`, {
    method: 'POST',
    credentials: 'include',
    body: formData, // browser sets Content-Type: multipart/form-data automatically
  });
  if (!res.ok) {
    let detail = `Upload failed (${res.status})`;
    try {
      const body = await res.json();
      if (body?.detail) {
        if (typeof body.detail === 'string') detail = body.detail;
        else if (Array.isArray(body.detail)) detail = body.detail.map((d: { msg?: string }) => d.msg).join('; ');
        else detail = JSON.stringify(body.detail);
      }
    } catch { /* ignore */ }
    throw new ApiError(res.status, detail);
  }
  return (await res.json()) as EvidenceUploadResponse;
}

/**
 * Delete an evidence asset from the backend (both DB metadata and disk file).
 */
export async function deleteEvidence(evidenceId: string): Promise<void> {
  const res = await fetch(`/api/evidence/${evidenceId}`, {
    method: 'DELETE',
    credentials: 'include',
  });
  if (!res.ok && res.status !== 204) {
    let detail = `Delete failed (${res.status})`;
    try {
      const body = await res.json();
      if (body?.detail) {
        if (typeof body.detail === 'string') detail = body.detail;
        else detail = JSON.stringify(body.detail);
      }
    } catch { /* ignore */ }
    throw new ApiError(res.status, detail);
  }
}