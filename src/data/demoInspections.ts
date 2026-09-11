import { Inspection, ComplianceCheck, Finding } from '../types';
import { demoOfficer } from './demoOfficer';
import { heroProduct } from './demoProducts';
import { demoEvidence, demoOCRResults, demoExtractedFields } from './demoEvidence';
import { demoRules } from './demoRules';

// Deterministic compliance checks for Lay's demo product (MIXED result)
export const buildDemoComplianceChecks = (): ComplianceCheck[] => {
  return [
    {
      id: 'CHK-001', ruleId: 'LM-PC-001', ruleTitle: 'Manufacturer / Packer / Importer Declaration',
      status: 'PASS', severity: 'MAJOR', description: 'Manufacturer name and address detected on Back surface.',
      evidence: ['EVD-DEMO-002'], confidence: 89, isMachineCheckable: true,
    },
    {
      id: 'CHK-002', ruleId: 'LM-PC-002', ruleTitle: 'Country of Origin',
      status: 'PASS', severity: 'MAJOR', description: 'Country of Origin "India" declared on Front surface.',
      evidence: ['EVD-DEMO-001'], confidence: 97, isMachineCheckable: true,
    },
    {
      id: 'CHK-003', ruleId: 'LM-PC-003', ruleTitle: 'Common / Generic Name of Commodity',
      status: 'PASS', severity: 'MAJOR', description: 'Generic name "Potato Chips" declared on Front surface.',
      evidence: ['EVD-DEMO-001'], confidence: 96, isMachineCheckable: true,
    },
    {
      id: 'CHK-004', ruleId: 'LM-PC-004', ruleTitle: 'Net Quantity Declaration',
      status: 'PASS', severity: 'MAJOR', description: 'Net quantity "52 g" declared on Front surface.',
      evidence: ['EVD-DEMO-001'], confidence: 99, isMachineCheckable: true,
    },
    {
      id: 'CHK-005', ruleId: 'LM-PC-005', ruleTitle: 'MRP / Retail Sale Price Declaration',
      status: 'VIOLATION', severity: 'MAJOR', description: 'MRP declaration conflict detected: Front shows ₹20.00, Back shows ₹25.00. DEMO SCENARIO.',
      evidence: ['EVD-DEMO-001', 'EVD-DEMO-002'], confidence: 98, isMachineCheckable: true,
    },
    {
      id: 'CHK-006', ruleId: 'LM-PC-006', ruleTitle: 'Manufacturing / Packing Date',
      status: 'PASS', severity: 'MAJOR', description: 'Manufacturing date "FEB 2026" detected on Side 2 surface.',
      evidence: ['EVD-DEMO-004'], confidence: 94, isMachineCheckable: true,
    },
    {
      id: 'CHK-007', ruleId: 'LM-PC-007', ruleTitle: 'Best Before / Use-By Date',
      status: 'REVIEW', severity: 'MAJOR', description: 'Best-before date "SEP 2026" detected but confidence is moderate; officer verification recommended.',
      evidence: ['EVD-DEMO-002'], confidence: 93, isMachineCheckable: true,
    },
    {
      id: 'CHK-008', ruleId: 'LM-PC-008', ruleTitle: 'Consumer Care Information',
      status: 'REVIEW', severity: 'MINOR', description: 'Customer care contact detected, but partial overlap on back surface lowers confidence.',
      evidence: ['EVD-DEMO-002'], confidence: 91, isMachineCheckable: true,
    },
  ];
};

export const buildDemoFindings = (): Finding[] => {
  return [
    {
      id: 'FND-001',
      type: 'VIOLATION',
      title: 'MRP declaration inconsistency',
      severity: 'MAJOR',
      status: 'Potential Violation',
      description: 'Two package surfaces contain inconsistent MRP declarations in the demo evidence. Front surface declares MRP ₹20.00 while Back surface declares MRP ₹25.00.',
      ruleId: 'LM-PC-005',
      ruleTitle: 'MRP / Retail Sale Price Declaration',
      ruleVersion: 'Demo 2026.1',
      evidenceFront: 'EVD-DEMO-001',
      evidenceBack: 'EVD-DEMO-002',
      frontValue: '₹20.00',
      backValue: '₹25.00',
      difference: '₹5.00',
      ocrConfidence: 98,
      officerDecision: 'Pending',
      officerNotes: '',
    },
    {
      id: 'FND-002',
      type: 'REVIEW',
      title: 'Best-before date evidence confidence',
      severity: 'MINOR',
      status: 'Under Review',
      description: 'Best-before date detected with moderate OCR confidence. Recommend officer verification of the physical package.',
      ruleId: 'LM-PC-007',
      ruleTitle: 'Best Before / Use-By Date',
      ruleVersion: 'Demo 2026.1',
      evidenceFront: 'EVD-DEMO-002',
      evidenceBack: '',
      frontValue: 'SEP 2026',
      backValue: '—',
      difference: '—',
      ocrConfidence: 93,
      officerDecision: 'Pending',
      officerNotes: '',
    },
    {
      id: 'FND-003',
      type: 'REVIEW',
      title: 'Consumer care declaration legibility',
      severity: 'MINOR',
      status: 'Under Review',
      description: 'Consumer care contact partially obscured on the overlap area of the back surface. Officer should confirm readability.',
      ruleId: 'LM-PC-008',
      ruleTitle: 'Consumer Care Information',
      ruleVersion: 'Demo 2026.1',
      evidenceFront: 'EVD-DEMO-002',
      evidenceBack: '',
      frontValue: '1800-103-1030',
      backValue: '—',
      difference: '—',
      ocrConfidence: 91,
      officerDecision: 'Pending',
      officerNotes: '',
    },
  ];
};


// Central factory to build the full demo inspection — SAME data throughout
export const buildDemoInspection = (): Inspection => {
  return {
    id: 'INSP-DEMO-2025-03-12-0017',
    inspectionId: 'INSP-DEMO-2025-03-12-0017',
    officer: demoOfficer,
    type: 'Routine',
    mode: 'Physical Package',
    location: 'Connaught Place, New Delhi',
    createdAt: '12 Mar 2025, 09:41 AM',
    stage: 'SETUP',
    status: 'In Progress',
    product: {
      name: heroProduct.name,
      brand: heroProduct.brand,
      manufacturer: heroProduct.manufacturer,
      category: heroProduct.category,
      subcategory: heroProduct.subcategory,
      barcode: heroProduct.barcode,
      netQuantity: heroProduct.netQuantity,
      mrp: heroProduct.mrp,
      dateOfManufacture: heroProduct.dateOfManufacture,
      bestBefore: heroProduct.bestBefore,
      countryOfOrigin: heroProduct.countryOfOrigin,
      commonName: heroProduct.commonName,
      consumerCare: heroProduct.consumerCare,
      unitSalePrice: heroProduct.unitSalePrice,
    },
    evidence: demoEvidence,
    ocrResults: demoOCRResults,
    extractedFields: demoExtractedFields,
    classification: {
      category: 'Packaged Food',
      subcategory: 'Savoury Snacks → Potato Chips',
      confidence: 96,
      signals: ['OCR text', 'Product image', 'Barcode', 'Extracted product information'],
      candidates: [
        { label: 'Savoury Snacks', confidence: 96 },
        { label: 'Processed Food', confidence: 3 },
        { label: 'Other', confidence: 1 },
      ],
    },
    applicability: {
      productType: 'Pre-packaged commodity',
      isFood: true,
      isRetail: true,
      isImported: false,
      isSpecialCategory: false,
      quantityCondition: 'Standard demo pathway',
      machineCheckableCount: 8,
      officerReviewCount: 2,
    },
    complianceChecks: buildDemoComplianceChecks(),
    findings: buildDemoFindings(),
    officerDecision: 'Pending',
    finalNotes: '',
    decisionDate: '',
    analyticsScore: 82,
    reportGenerated: false,
    fingerprint: [
      'INSPECTION',
      'PACKAGE',
      'ORIGINAL IMAGE',
      'OCR',
      'EXTRACTED FIELD',
      'RULE',
      'FINDING',
      'OFFICER DECISION',
    ],
  };
};

// Simple analytics fixtures (demo data — NOT production)
export const demoAnalyticsData = {
  totalInspections: 24,
  complianceRate: 67,
  manualReviews: 5,
  potentialViolations: 3,
  trendData: [
    { date: 'Jan', count: 14 }, { date: 'Feb', count: 19 }, { date: 'Mar', count: 24 },
    { date: 'Apr', count: 22 }, { date: 'May', count: 27 }, { date: 'Jun', count: 31 },
    { date: 'Jul', count: 26 },
  ],
  statusDistribution: [
    { label: 'Compliant', value: 16, color: '#22c55e' },
    { label: 'Under Review', value: 5, color: '#f59e0b' },
    { label: 'Non-Compliant', value: 3, color: '#ef4444' },
  ],
  categoryDistribution: [
    { label: 'Packaged Food', value: 10 },
    { label: 'Beverages', value: 6 },
    { label: 'Toiletries', value: 4 },
    { label: 'Household', value: 2 },
    { label: 'Other', value: 2 },
  ],
  frequentFindings: [
    { label: 'MRP discrepancy', count: 8 },
    { label: 'Missing consumer care', count: 6 },
    { label: 'Date not visible', count: 5 },
    { label: 'Net qty missing', count: 3 },
    { label: 'Legibility', count: 2 },
  ],
  locationActivity: [
    { location: 'Connaught Place', count: 8 },
    { location: 'Karol Bagh', count: 5 },
    { location: 'Chandni Chowk', count: 4 },
    { location: 'Lajpat Nagar', count: 3 },
    { location: 'Saket', count: 4 },
  ],
};

