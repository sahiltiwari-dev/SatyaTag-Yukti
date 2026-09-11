import { EvidenceAsset, OCRResult, ExtractedField } from '../types';
import { heroProduct } from './demoProducts';

export const demoEvidence: EvidenceAsset[] = [
  {
    id: 'EVD-DEMO-001',
    surface: 'Front',
    capturedAt: '2025-03-12T09:42:15',
    qualityStatus: 'Good',
    qualityScore: 94,
    thumbnailColor: '#F7C948',
    label: 'Front — Lay\'s packet',
    imageUrl: '',
    fileName: 'lays_front.jpg',
    isPlaceholder: true,
  },
  {
    id: 'EVD-DEMO-002',
    surface: 'Back',
    capturedAt: '2025-03-12T09:42:28',
    qualityStatus: 'Good',
    qualityScore: 91,
    thumbnailColor: '#4CAF50',
    label: 'Back — nutritional / declarations',
    imageUrl: '',
    fileName: 'lays_back.jpg',
    isPlaceholder: true,
  },
  {
    id: 'EVD-DEMO-003',
    surface: 'Side 1',
    capturedAt: '2025-03-12T09:42:35',
    qualityStatus: 'Good',
    qualityScore: 89,
    thumbnailColor: '#FF9800',
    label: 'Side 1 — barcode area',
    imageUrl: '',
    fileName: 'lays_side1.jpg',
    isPlaceholder: true,
  },
  {
    id: 'EVD-DEMO-004',
    surface: 'Side 2',
    capturedAt: '2025-03-12T09:42:41',
    qualityStatus: 'Acceptable',
    qualityScore: 82,
    thumbnailColor: '#2196F3',
    label: 'Side 2 — manufacturing info',
    imageUrl: '',
    fileName: 'lays_side2.jpg',
    isPlaceholder: true,
  },
];

export const demoOCRResults: OCRResult[] = [
  { id: 'OCR-001', evidenceId: 'EVD-DEMO-001', text: "Lay's Classic Salted Potato Chips", confidence: 98, field: 'Product Name' },
  { id: 'OCR-002', evidenceId: 'EVD-DEMO-001', text: 'Net Quantity: 52 g', confidence: 99, field: 'Net Quantity' },
  { id: 'OCR-003', evidenceId: 'EVD-DEMO-001', text: 'MRP ₹20.00 (Incl. of all taxes)', confidence: 98, field: 'MRP' },
  { id: 'OCR-004', evidenceId: 'EVD-DEMO-001', text: 'Country of Origin: India', confidence: 97, field: 'Country of Origin' },
  { id: 'OCR-005', evidenceId: 'EVD-DEMO-002', text: 'MRP ₹25.00 (Incl. of all taxes)', confidence: 97, field: 'MRP (Back)' },
  { id: 'OCR-006', evidenceId: 'EVD-DEMO-002', text: 'Frito-Lay India Pvt. Ltd.', confidence: 89, field: 'Manufacturer' },
  { id: 'OCR-007', evidenceId: 'EVD-DEMO-002', text: 'Best Before: SEP 2026', confidence: 93, field: 'Best Before' },
  { id: 'OCR-008', evidenceId: 'EVD-DEMO-002', text: 'Manufactured: FEB 2026', confidence: 94, field: 'Manufacturing Date' },
  { id: 'OCR-009', evidenceId: 'EVD-DEMO-003', text: '8901234567890', confidence: 96, field: 'Barcode' },
  { id: 'OCR-010', evidenceId: 'EVD-DEMO-002', text: 'Customer Care: 1800-103-1030', confidence: 92, field: 'Consumer Care' },
  { id: 'OCR-011', evidenceId: 'EVD-DEMO-001', text: '₹0.38/g', confidence: 91, field: 'Unit Sale Price' },
  { id: 'OCR-012', evidenceId: 'EVD-DEMO-004', text: 'Plot No. 1, Sector 15, IMT Manesar', confidence: 87, field: 'Manufacturer Address' },
];

export const demoExtractedFields: ExtractedField[] = [
  {
    id: 'EXT-001', label: 'Product Name', value: heroProduct.name, source: 'Front image',
    evidenceId: 'EVD-DEMO-001', ocrConfidence: 98, extractionConfidence: 97,
    boundingBox: { x: 15, y: 12, w: 70, h: 15 },
  },
  {
    id: 'EXT-002', label: 'Brand', value: heroProduct.brand, source: 'Front image',
    evidenceId: 'EVD-DEMO-001', ocrConfidence: 99, extractionConfidence: 98,
    boundingBox: { x: 20, y: 8, w: 60, h: 10 },
  },
  {
    id: 'EXT-003', label: 'Manufacturer', value: heroProduct.manufacturer.split(',')[0], source: 'Back image',
    evidenceId: 'EVD-DEMO-002', ocrConfidence: 89, extractionConfidence: 88,
    boundingBox: { x: 10, y: 65, w: 80, h: 10 },
  },
  {
    id: 'EXT-004', label: 'Net Quantity', value: heroProduct.netQuantity, source: 'Front image',
    evidenceId: 'EVD-DEMO-001', ocrConfidence: 99, extractionConfidence: 98,
    boundingBox: { x: 60, y: 80, w: 25, h: 8 },
  },
  {
    id: 'EXT-005', label: 'MRP', value: '₹20.00', source: 'Front image',
    evidenceId: 'EVD-DEMO-001', ocrConfidence: 98, extractionConfidence: 97,
    boundingBox: { x: 15, y: 80, w: 30, h: 8 },
  },
  {
    id: 'EXT-006', label: 'Date of Manufacture', value: heroProduct.dateOfManufacture, source: 'Side 2 image',
    evidenceId: 'EVD-DEMO-004', ocrConfidence: 94, extractionConfidence: 93,
    boundingBox: { x: 20, y: 30, w: 50, h: 8 },
  },
  {
    id: 'EXT-007', label: 'Best Before', value: heroProduct.bestBefore, source: 'Back image',
    evidenceId: 'EVD-DEMO-002', ocrConfidence: 93, extractionConfidence: 92,
    boundingBox: { x: 20, y: 40, w: 50, h: 8 },
  },
  {
    id: 'EXT-008', label: 'Country of Origin', value: heroProduct.countryOfOrigin, source: 'Front image',
    evidenceId: 'EVD-DEMO-001', ocrConfidence: 97, extractionConfidence: 96,
    boundingBox: { x: 15, y: 90, w: 50, h: 6 },
  },
  {
    id: 'EXT-009', label: 'Common Name', value: heroProduct.commonName, source: 'Front image',
    evidenceId: 'EVD-DEMO-001', ocrConfidence: 96, extractionConfidence: 95,
    boundingBox: { x: 25, y: 30, w: 50, h: 10 },
  },
  {
    id: 'EXT-010', label: 'Consumer Care', value: '1800-103-1030, care@fritolay.co.in', source: 'Back image',
    evidenceId: 'EVD-DEMO-002', ocrConfidence: 92, extractionConfidence: 91,
    boundingBox: { x: 10, y: 80, w: 80, h: 6 },
  },
  {
    id: 'EXT-011', label: 'Unit Sale Price', value: heroProduct.unitSalePrice, source: 'Front image',
    evidenceId: 'EVD-DEMO-001', ocrConfidence: 91, extractionConfidence: 90,
    boundingBox: { x: 55, y: 88, w: 25, h: 6 },
  },
  {
    id: 'EXT-012', label: 'Barcode', value: heroProduct.barcode, source: 'Side 1 image',
    evidenceId: 'EVD-DEMO-003', ocrConfidence: 96, extractionConfidence: 95,
    boundingBox: { x: 10, y: 20, w: 80, h: 40 },
  },
];
