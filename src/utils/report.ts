import { jsPDF } from 'jspdf';
import { Inspection, Officer } from '../types';
import { toJpegDataUrl } from './images';

// Colour palette (matches the SATYATAG design system)
const NAVY: [number, number, number] = [13, 21, 36];
const NAVY_LIGHT: [number, number, number] = [39, 63, 108];
const GOVBLUE: [number, number, number] = [37, 99, 235];
const COMPLIANT: [number, number, number] = [22, 163, 74];
const WARNING: [number, number, number] = [217, 119, 6];
const VIOLATION: [number, number, number] = [220, 38, 38];
const SLATE: [number, number, number] = [100, 116, 139];
const SLATE_LIGHT: [number, number, number] = [226, 232, 240];
const SLATE_BG: [number, number, number] = [241, 245, 249];
const TEXT: [number, number, number] = [15, 23, 42];
const WHITE: [number, number, number] = [255, 255, 255];

const A4_W = 210;
const A4_H = 297;
const M = 15;
const CW = A4_W - M * 2;

const decisionColor = (d: string): [number, number, number] =>
  d === 'COMPLIANT' ? COMPLIANT : d === 'NON-COMPLIANT' ? VIOLATION : WARNING;

const decisionText = (d: string): string =>
  d === 'COMPLIANT' ? 'COMPLIANT' : d === 'NON-COMPLIANT' ? 'NON-COMPLIANT' : 'MANUAL REVIEW';

const PAGE_BODY_END = A4_H - 22;

const ensureSpace = (doc: jsPDF, y: number, needed: number): number => {
  if (y + needed > PAGE_BODY_END) {
    drawFooter(doc, doc.getNumberOfPages());
    doc.addPage();
    drawHeader(doc);
    return 46;
  }
  return y;
};

/**
 * Generates a professional official-style Inspection Report PDF.
 * The entire document is rendered from the CURRENT inspection state —
 * including the officer's final decision — and embeds the ACTUAL uploaded
 * package photographs as captured evidence.
 */
export const generateInspectionPdf = async (inspection: Inspection, officer: Officer): Promise<void> => {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  drawHeader(doc);

  let y = 46;

  // Pre-convert all evidence photos to JPEG so they can be embedded in the PDF.
  const jpegImages: Record<string, string> = {};
  for (const ev of inspection.evidence) {
    if (ev.imageUrl && !ev.isPlaceholder) {
      jpegImages[ev.id] = await toJpegDataUrl(ev.imageUrl);
    } else {
      jpegImages[ev.id] = '';
    }
  }

  // --- Title ---
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(15);
  doc.setTextColor(NAVY[0], NAVY[1], NAVY[2]);
  doc.text('Inspection Report', M, y);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(SLATE[0], SLATE[1], SLATE[2]);
  const runAt = new Date().toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  doc.text(`Generated: ${runAt}`, M, y + 4.5);
  y += 9;

  // --- Officer decision banner (single source of truth) ---
  const decision = inspection.officerDecision === 'Pending' ? 'MANUAL REVIEW' : inspection.officerDecision;
  y = drawDecisionBanner(doc, y, decision);
  y += 1.5;

  // --- Inspection Information ---
  y = ensureSpace(doc, y, 46);
  y = sectionTitle(doc, y, 'Inspection Information');
  y = fieldRow(doc, y, 'Inspection ID', inspection.inspectionId);
  y = fieldRow(doc, y, 'Officer', `${officer.name} (${officer.id})`);
  y = fieldRow(doc, y, 'Date / Time', inspection.createdAt);
  y = fieldRow(doc, y, 'Location', inspection.location);
  y = fieldRow(doc, y, 'Inspection Type', inspection.type);
  y = fieldRow(doc, y, 'Inspection Mode', inspection.mode);
  y += 3;

  // --- Product Information ---
  y = ensureSpace(doc, y, 40);
  y = sectionTitle(doc, y, 'Product Information');
  const product = inspection.product;
  y = fieldRow(doc, y, 'Product Name', product.name);
  y = fieldRow(doc, y, 'Brand', product.brand);
  y = fieldRow(doc, y, 'Category', `${product.category} · ${product.subcategory}`);
  y = fieldRow(doc, y, 'Net Quantity', product.netQuantity);
  y = fieldRow(doc, y, 'MRP', product.mrp, true);
  y = fieldRow(doc, y, 'Manufacturer', product.manufacturer.split(',')[0]);
  y = fieldRow(doc, y, 'Date of Manufacture', product.dateOfManufacture);
  y = fieldRow(doc, y, 'Best Before', product.bestBefore);
  y = fieldRow(doc, y, 'Country of Origin', product.countryOfOrigin);
  y = fieldRow(doc, y, 'Consumer Care', product.consumerCare);
  y += 3;

  // --- Captured Evidence (actual uploaded photographs) ---
  const surfaceDisplay: Record<string, string> = { Front: 'Front', Back: 'Back', 'Side 1': 'Left Side', 'Side 2': 'Right Side', Other: 'Other' };
  const surfaceOrder = ['Front', 'Back', 'Side 1', 'Side 2', 'Other'];
  const evidenceItems = surfaceOrder
    .map((s) => inspection.evidence.find((e) => e.surface === s))
    .filter((e): e is NonNullable<typeof e> => !!e);

  y = ensureSpace(doc, y, 30);
  y = sectionTitle(doc, y, 'Captured Evidence');
  if (evidenceItems.length === 0) {
    y = fieldRow(doc, y, 'Evidence', 'No package photographs captured');
  } else {
    const twoCol = evidenceItems.length > 2;
    const colW = twoCol ? 58 : 84;
    const rowH = twoCol ? 40 : 44;
    let x = M;
    evidenceItems.forEach((ev) => {
      if (twoCol && x + colW > A4_W - M) {
        x = M;
        y += rowH - 2;
        y = ensureSpace(doc, y, rowH + 4);
        doc.setFontSize(6);
      }
      drawEvidencePhoto(doc, y, jpegImages[ev.id] || '', surfaceDisplay[ev.surface] || ev.surface, ev.id);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(6);
      doc.setTextColor(SLATE[0], SLATE[1], SLATE[2]);
      doc.text(`${surfaceDisplay[ev.surface] || ev.surface} — ${ev.fileName || 'captured'}`, twoCol ? x + 6 : M + 4, y + 41);
      x += colW;
    });
    y += rowH;
  }
  y += 3;

  // --- Compliance Summary ---
  y = ensureSpace(doc, y, 30);
  y = sectionTitle(doc, y, 'Compliance Summary');
  const checks = inspection.complianceChecks;
  const passed = checks.filter((c) => c.status === 'PASS').length;
  const reviewChecks = checks.filter((c) => c.status === 'REVIEW').length;
  const violations = checks.filter((c) => c.status === 'VIOLATION').length;
  const demoFindings = inspection.findings.length;

  const summary = [
    ['PASS', String(passed), COMPLIANT],
    ['REVIEW', String(reviewChecks), WARNING],
    ['VIOLATION', String(violations), VIOLATION],
    ['DEMO FINDINGS', String(demoFindings), NAVY],
  ] as const;
  const cellW = (CW - 12) / 4;
  summary.forEach((row, i) => {
    const x = M + i * (cellW + 4);
    doc.setFillColor(SLATE_BG[0], SLATE_BG[1], SLATE_BG[2]);
    doc.setDrawColor(SLATE_LIGHT[0], SLATE_LIGHT[1], SLATE_LIGHT[2]);
    doc.roundedRect(x, y, cellW, 16, 1.5, 1.5, 'FD');
    doc.setTextColor(row[2][0], row[2][1], row[2][2]);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13);
    doc.text(String(row[1]), x + cellW / 2, y + 8, { align: 'center' });
    doc.setFontSize(6.5);
    doc.setTextColor(SLATE[0], SLATE[1], SLATE[2]);
    doc.text(String(row[0]), x + cellW / 2, y + 13.5, { align: 'center' });
  });
  y += 22;
  doc.setFont('helvetica', 'italic');
  doc.setFontSize(7);
  doc.setTextColor(SLATE[0], SLATE[1], SLATE[2]);
  doc.text('Analytics score is informational and does NOT constitute a legal verdict.', M, y);
  y += 5;

  // --- Findings ---
  if (inspection.findings.length > 0) {
    y = ensureSpace(doc, y, 30);
    y = sectionTitle(doc, y, 'Findings');
    for (const fnd of inspection.findings) {
      y = ensureSpace(doc, y, 30);
      const col = fnd.type === 'VIOLATION' ? VIOLATION : WARNING;
      const sevLabel = `${fnd.severity} · ${fnd.status}`;
      doc.setFillColor(col[0], col[1], col[2]);
      doc.roundedRect(M, y, 3, 14, 1, 1, 'F');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      doc.setTextColor(TEXT[0], TEXT[1], TEXT[2]);
      doc.text(fnd.title, M + 6, y + 4.5, { maxWidth: CW - 10 });
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7);
      doc.setTextColor(SLATE[0], SLATE[1], SLATE[2]);
      doc.text(`${fnd.ruleId} · ${sevLabel} · Confidence ${fnd.ocrConfidence}%`, M + 6, y + 9, { maxWidth: CW - 10 });
      doc.setFontSize(6.5);
      doc.text(fnd.description.slice(0, 190), M + 6, y + 12.5, { maxWidth: CW - 10 });
      y += 18;
    }
    y += 2;
  }

  // --- Officer Decision ---
  y = ensureSpace(doc, y, 42);
  y = sectionTitle(doc, y, 'Officer Decision');
  y = drawDecisionBanner(doc, y, decision);
  y = fieldRow(doc, y, 'Officer', `${officer.name} (${officer.id})`);
  y = fieldRow(doc, y, 'Decision Date', inspection.decisionDate || runAt);
  if (inspection.finalNotes) {
    y = ensureSpace(doc, y, 12);
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(7.5);
    doc.setTextColor(TEXT[0], TEXT[1], TEXT[2]);
    const lines = doc.splitTextToSize(`Notes: ${inspection.finalNotes}`, CW - 4) as string[];
    lines.slice(0, 4).forEach((line) => {
      doc.text(line, M, y);
      y += 4;
    });
  }
  y += 2;

  // --- Compliance Fingerprint ---
  y = ensureSpace(doc, y, 24);
  y = sectionTitle(doc, y, 'Compliance Fingerprint');
  y = drawFingerprint(doc, y, inspection.fingerprint.length ? inspection.fingerprint : ['INSPECTION', 'PACKAGE', 'IMAGE', 'OCR', 'FIELD', 'RULE', 'FINDING', 'DECISION']);
  y += 2;

  // --- Provenance ---
  y = ensureSpace(doc, y, 30);
  y = sectionTitle(doc, y, 'Provenance');
  const evidenceIds = inspection.evidence.map((e) => `${e.surface}:${e.id}`).join(', ');
  y = fieldRow(doc, y, 'Analysis Mode', 'SATYATAG Demo Pipeline (deterministic)');
  y = fieldRow(doc, y, 'Evidence References', evidenceIds || 'None captured');
  const ruleRefs = inspection.complianceChecks.map((c) => c.ruleId).filter((v, i, a) => a.indexOf(v) === i).join(', ');
  y = fieldRow(doc, y, 'Rule Versions', `Demo 2026.1 — ${ruleRefs || 'N/A'}`);
  y = fieldRow(doc, y, 'Rule Source Status', 'DEMO DATA · REQUIRES VERIFICATION');

  drawFooter(doc, doc.getNumberOfPages());
  doc.save(`SATYATAG_Inspection_Report_${inspection.inspectionId}.pdf`);
};

function drawHeader(doc: jsPDF) {
  doc.setFillColor(NAVY[0], NAVY[1], NAVY[2]);
  doc.rect(0, 0, A4_W, 34, 'F');
  doc.setFillColor(GOVBLUE[0], GOVBLUE[1], GOVBLUE[2]);
  doc.rect(0, 34, A4_W, 1.6, 'F');
  doc.setTextColor(WHITE[0], WHITE[1], WHITE[2]);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.text('SATYATAG', M, 14);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(196, 210, 235);
  doc.text('AI-Assisted Legal Metrology Compliance', M, 20.5);
  doc.text('Department of Consumer Affairs  ·  Government of India', M, 26);
  doc.setFontSize(7);
  doc.text('DEMO EDITION', 157, 12, { align: 'center' });
  doc.text('NOT AN OFFICIAL DOCUMENT', 157, 18, { align: 'center' });
}

function drawDecisionBanner(doc: jsPDF, y: number, decision: string): number {
  const col = decisionColor(decision);
  const label = decisionText(decision);
  doc.setFillColor(col[0], col[1], col[2]);
  doc.roundedRect(M, y, CW, 12, 2, 2, 'F');
  doc.setTextColor(WHITE[0], WHITE[1], WHITE[2]);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text(label, 157, y + 8, { align: 'center' });
  return y + 17;
}

function sectionTitle(doc: jsPDF, y: number, title: string): number {
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10.5);
  doc.setTextColor(NAVY[0], NAVY[1], NAVY[2]);
  doc.text(title.toUpperCase(), M, y);
  doc.setDrawColor(SLATE_LIGHT[0], SLATE_LIGHT[1], SLATE_LIGHT[2]);
  doc.setLineWidth(0.3);
  doc.line(M, y + 1.5, A4_W - M, y + 1.5);
  return y + 6.5;
}

function fieldRow(doc: jsPDF, y: number, label: string, value: string, strong = false) {
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.3);
  doc.setTextColor(SLATE[0], SLATE[1], SLATE[2]);
  doc.text(label, M, y);
  doc.setFont('helvetica', strong ? 'bold' : 'normal');
  doc.setTextColor(TEXT[0], TEXT[1], TEXT[2]);
  doc.text(String(value), 78, y, { maxWidth: CW - 66 });
  return y + 5.4;
}

function drawEvidencePhoto(doc: jsPDF, y: number, imageUrl: string, surfaceLabel: string, id: string): number {
  const boxH = 36;
  const boxW = 56;
  doc.setDrawColor(SLATE_LIGHT[0], SLATE_LIGHT[1], SLATE_LIGHT[2]);
  doc.setFillColor(SLATE_BG[0], SLATE_BG[1], SLATE_BG[2]);
  doc.setLineWidth(0.4);
  doc.roundedRect(M, y, boxW, boxH, 1.5, 1.5, 'FD');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.setTextColor(NAVY[0], NAVY[1], NAVY[2]);
  doc.text(surfaceLabel.toUpperCase(), M + 3, y + 4.5);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6);
  doc.setTextColor(SLATE[0], SLATE[1], SLATE[2]);
  doc.text(id, M + 3, y + 9);
  if (imageUrl) {
    try {
      doc.addImage(imageUrl, 'JPEG', M + 2, y + 11.5, boxW - 4, boxH - 14);
    } catch {
      doc.setFont('helvetica', 'italic');
      doc.setFontSize(7);
      doc.text('Image unavailable', M + 16, y + 24);
    }
  } else {
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(7);
    doc.text('No image captured', M + 16, y + 24);
  }
  return y + boxH;
}

function drawFingerprint(doc: jsPDF, y: number, chain: string[]): number {
  const boxW = 22;
  chain.forEach((node, i) => {
    const x = M + i * (boxW + 2.5);
    const isLast = i === chain.length - 1;
    doc.setFillColor(isLast ? GOVBLUE[0] : NAVY_LIGHT[0], isLast ? GOVBLUE[1] : NAVY_LIGHT[1], isLast ? GOVBLUE[2] : NAVY_LIGHT[2]);
    doc.roundedRect(x, y, boxW, 9, 1, 1, 'F');
    doc.setTextColor(WHITE[0], WHITE[1], WHITE[2]);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(5);
    doc.text(node, x + boxW / 2, y + 5.5, { align: 'center', maxWidth: boxW - 1 });
    if (i < chain.length - 1) {
      doc.setTextColor(GOVBLUE[0], GOVBLUE[1], GOVBLUE[2]);
      doc.setFontSize(8);
      doc.text('▶', x + boxW + 0.3, y + 6);
    }
  });
  return y + 15;
}

function drawFooter(doc: jsPDF, page: number) {
  doc.setDrawColor(SLATE_LIGHT[0], SLATE_LIGHT[1], SLATE_LIGHT[2]);
  doc.setLineWidth(0.2);
  doc.line(M, A4_H - 16, A4_W - M, A4_H - 16);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.5);
  doc.setTextColor(SLATE[0], SLATE[1], SLATE[2]);
  doc.text('Generated by SATYATAG Demo · Analytics score is informational and does NOT constitute a legal verdict.', M, A4_H - 11);
  doc.text(`Page ${page}`, A4_W - M, A4_H - 11, { align: 'right' });
}