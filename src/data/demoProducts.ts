export interface DemoProduct {
  id: string;
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
  color: string;
}

export const heroProduct: DemoProduct = {
  id: 'PROD-DEMO-001',
  name: "Lay's Classic Salted Potato Chips",
  brand: "Lay's",
  manufacturer: 'Frito-Lay India Pvt. Ltd., Plot No. 1, Sector 15, IMT Manesar, Gurugram, Haryana – 122052',
  category: 'Packaged Food',
  subcategory: 'Savoury Snacks',
  barcode: '8901234567890',
  netQuantity: '52 g',
  mrp: '₹20.00',
  dateOfManufacture: 'FEB 2026',
  bestBefore: 'SEP 2026',
  countryOfOrigin: 'India',
  commonName: 'Potato Chips',
  consumerCare: 'Frito-Lay India Consumer Care, 1800-103-1030, care@fritolay.co.in',
  unitSalePrice: '₹0.38 / g',
  color: '#F7C948',
};

export const recentInspections = [
  {
    id: 'INSP-DEMO-2025-03-12-0017',
    product: "Lay's Classic Salted Potato Chips 52g",
    category: 'Packaged Food',
    date: '12 Mar 2025, 11:24 AM',
    status: 'Manual Review' as const,
    image: '🍟',
  },
  {
    id: 'INSP-DEMO-2025-03-11-0012',
    product: 'Maggi 2-Minute Noodles 70g',
    category: 'Food Products',
    date: '11 Mar 2025, 01:15 PM',
    status: 'Compliant' as const,
    image: '🍜',
  },
  {
    id: 'INSP-DEMO-2025-03-10-0008',
    product: 'Coca-Cola 500ml',
    category: 'Beverages',
    date: '10 Mar 2025, 10:17 AM',
    status: 'Non-Compliant' as const,
    image: '🥤',
  },
  {
    id: 'INSP-DEMO-2025-03-09-0005',
    product: 'Dove Soap 75g',
    category: 'Toiletries',
    date: '09 Mar 2025, 04:32 PM',
    status: 'Under Review' as const,
    image: '🧴',
  },
];
