/**
 * SatyaTag Analysis & Compliance Engine Service
 * `POST /api/inspections/{id}/analyse` runs the deterministic demo analysis
 * pipeline; `GET .../analysis` reads the persisted results.
 */
import { apiRequest } from './api';

export interface AnalysisSummary {
  pass: number;
  review: number;
  violation: number;
  not_applicable: number;
}

export interface AnalysisCheck {
  id: string;
  rule_id: string;
  rule_number: string | null;
  title: string;
  version: string;
  outcome: 'PASS' | 'REVIEW' | 'VIOLATION' | 'NOT_APPLICABLE';
  severity: string;
  message: string;
}

export interface AnalysisFinding {
  id: string;
  rule_id: string;
  title: string;
  severity: string;
  type: string;
  status: string;
  description: string;
}

export interface AnalysisRunResult {
  inspection_id: string;
  inspection_number: string;
  status: string;
  stage: string;
  analytics_score: number;
  demo: boolean;
  classification: { category: string; subcategory: string; confidence: number };
  summary: AnalysisSummary;
  compliance_rate: number;
  checks: {
    rule_id: string;
    rule_version: string;
    title: string;
    category: string | null;
    outcome: string;
    severity: string;
    message: string;
  }[];
}

export interface AnalysisDetail {
  inspection_id: string;
  demo: boolean;
  note: string;
  extracted: { label: string; value: string; mode: string }[];
  classification: { category: string | null; confidence: number | null };
  checks: AnalysisCheck[];
  findings: AnalysisFinding[];
}

export async function runAnalysis(inspectionId: string): Promise<AnalysisRunResult> {
  return apiRequest<AnalysisRunResult>(`/api/inspections/${inspectionId}/analyse`, {
    method: 'POST',
  });
}

export async function getAnalysis(inspectionId: string): Promise<AnalysisDetail> {
  return apiRequest<AnalysisDetail>(`/api/inspections/${inspectionId}/analysis`);
}

export async function setFindingDecision(
  inspectionId: string,
  findingId: string,
  decision: string,
  notes: string,
): Promise<{ id: string; officer_decision: string; status: string; officer_notes: string }> {
  return apiRequest(`/api/inspections/${inspectionId}/findings/${findingId}/decision`, {
    method: 'POST',
    body: JSON.stringify({ decision, notes }),
  });
}