/* ============================================
   SatyaTag — Type Definitions
   ============================================ */

// --- User / Officer ---
export interface Officer {
  id: string;
  name: string;
  displayName: string;
  role: string;
  department: string;
  jurisdiction: string;
  email: string;
  status: 'Active' | 'Inactive';
  avatarInitials: string;
  employeeId?: string;
}

// --- Authentication ---
export type UserRole = 'officer' | 'supervisor' | 'admin';

export interface UserAccount {
  id: string;
  email: string;
  /** Never stored client-side — kept only for type compat with legacy demo code. */
  passwordHash?: string;
  fullName: string;
  role: UserRole;
  department: string;
  jurisdiction: string;
  employeeId: string;
  emailVerified: boolean;
  accountStatus: 'active' | 'disabled' | 'pending_verification';
  createdAt: string;
  updatedAt: string;
  lastLogin: string;
}

export interface PendingVerification {
  accountId: string;
  email: string;
  otpHash: string;
  createdAt: string;
  expiresAt: string;
  attempts: number;
  maxAttempts: number;
}

export interface PasswordResetToken {
  accountId: string;
  tokenHash: string;
  createdAt: string;
  expiresAt: string;
  used: boolean;
}

export interface AuditEvent {
  id: string;
  accountId: string;
  action: string;
  entity: string;
  status: string;
  timestamp: string;
  ip?: string;
}

// --- Evidence ---
export type SurfaceName = 'Front' | 'Back' | 'Side 1' | 'Side 2' | 'Other';

export interface EvidenceAsset {
  id: string;
  surface: SurfaceName;
  capturedAt: string;
  qualityStatus: 'Good' | 'Acceptable' | 'Poor';
  qualityScore: number;
  thumbnailColor: string;
  label: string;
  /** Data URL / object URL of the actual uploaded photograph */
  imageUrl: string;
  /** Original file name of the uploaded photograph */
  fileName?: string;
  /** Whether this surface still uses a placeholder (no real upload) */
  isPlaceholder?: boolean;
}

// --- OCR ---
export interface OCRResult {
  id: string;
  evidenceId: string;
  text: string;
  confidence: number;
  field: string;
}

// --- Extracted Field ---
export interface ExtractedField {
  id: string;
  label: string;
  value: string;
  source: string;
  evidenceId: string;
  ocrConfidence: number;
  extractionConfidence: number;
  boundingBox: { x: number; y: number; w: number; h: number };
}

// --- Classification ---
export interface Classification {
  category: string;
  subcategory: string;
  confidence: number;
  signals: string[];
  candidates: { label: string; confidence: number }[];
}

// --- Applicability ---
export interface Applicability {
  productType: string;
  isFood: boolean;
  isRetail: boolean;
  isImported: boolean;
  isSpecialCategory: boolean;
  quantityCondition: string;
  machineCheckableCount: number;
  officerReviewCount: number;
}

// --- Rule ---
export interface Rule {
  id: string;
  ruleId: string;
  title: string;
  description: string;
  category: string;
  subcategory: string;
  checkType: 'PRESENCE' | 'CONSISTENCY' | 'FORMAT' | 'VISIBILITY' | 'MEASUREMENT' | 'SUFFICIENCY';
  severity: 'MAJOR' | 'MINOR' | 'INFO';
  status: 'CURRENT' | 'SCHEDULED' | 'SUPERSEDED' | 'DEMO_RULE';
  version: string;
  effectiveFrom: string;
  effectiveTo: string | null;
  sourceAuthority: string;
  sourceReference: string;
  machineCheckable: boolean;
  applicability: string;
}

// --- Compliance Check ---
export type CheckStatus = 'PASS' | 'REVIEW' | 'VIOLATION' | 'NOT_APPLICABLE';

export interface ComplianceCheck {
  id: string;
  ruleId: string;
  ruleTitle: string;
  status: CheckStatus;
  severity: 'MAJOR' | 'MINOR' | 'INFO';
  description: string;
  evidence: string[];
  confidence: number;
  isMachineCheckable: boolean;
}

// --- Finding ---
export interface Finding {
  id: string;
  type: 'VIOLATION' | 'REVIEW' | 'INFO';
  title: string;
  severity: 'MAJOR' | 'MINOR' | 'INFO';
  status: 'Potential Violation' | 'Under Review' | 'Informational';
  description: string;
  ruleId: string;
  ruleTitle: string;
  ruleVersion: string;
  evidenceFront: string;
  evidenceBack: string;
  frontValue: string;
  backValue: string;
  difference: string;
  ocrConfidence: number;
  officerDecision: 'Confirmed' | 'Needs Review' | 'Not Established' | 'Pending';
  officerNotes: string;
}

// --- Inspection ---
export type InspectionStatus = 'Draft' | 'In Progress' | 'Under Review' | 'Manual Review' | 'Compliant' | 'Non-Compliant' | 'Completed';

export type InspectionMode = 'Physical Package' | 'Product Listing';
export type InspectionType = 'Routine' | 'Complaint' | 'Follow-up';

export type InspectionStage =
  | 'IDLE'
  | 'SETUP'
  | 'SCANNING'
  | 'CAPTURED'
  | 'QUALITY_CHECK'
  | 'ANALYSING'
  | 'EXTRACTED'
  | 'CLASSIFIED'
  | 'RULES_LOADED'
  | 'COMPLIANCE_EVALUATED'
  | 'RESULT'
  | 'FINDING_REVIEW'
  | 'OFFICER_REVIEW'
  | 'FINALIZED'
  | 'REPORT';

export interface Inspection {
  id: string;
  inspectionId: string;
  officer: Officer;
  type: InspectionType;
  mode: InspectionMode;
  location: string;
  createdAt: string;
  stage: InspectionStage;
  status: InspectionStatus;
  product: {
    name: string;
    brand: string;
    manufacturer: string;
    category: string;
    subcategory: string;
    barcode: string;
    netQuantity: string;
    mrp: string;
    dateOfManufacture: string;
    bestBefore: string;
    countryOfOrigin: string;
    commonName: string;
    consumerCare: string;
    unitSalePrice: string;
  };
  evidence: EvidenceAsset[];
  ocrResults: OCRResult[];
  extractedFields: ExtractedField[];
  classification: Classification;
  applicability: Applicability;
  complianceChecks: ComplianceCheck[];
  findings: Finding[];
  officerDecision: 'Pending' | 'COMPLIANT' | 'MANUAL REVIEW' | 'NON-COMPLIANT';
  finalNotes: string;
  /** Timestamp when the officer finalised the decision */
  decisionDate: string;
  analyticsScore: number;
  reportGenerated: boolean;
  /** Structured compliance fingerprint trace */
  fingerprint: string[];
}

// --- Audit Log ---
export interface AuditLogEntry {
  time: string;
  action: string;
  entity: string;
  status: string;
}

// --- Repository Entry ---
export interface RepositoryEntry {
  inspectionId: string;
  productName: string;
  productImage: string;
  category: string;
  date: string;
  location: string;
  status: InspectionStatus;
  score: number;
}

// --- Analytics Data ---
export interface AnalyticsData {
  totalInspections: number;
  complianceRate: number;
  manualReviews: number;
  potentialViolations: number;
  trendData: { date: string; count: number }[];
  statusDistribution: { label: string; value: number; color: string }[];
  categoryDistribution: { label: string; value: number }[];
  frequentFindings: { label: string; count: number }[];
  locationActivity: { location: string; count: number }[];
}
