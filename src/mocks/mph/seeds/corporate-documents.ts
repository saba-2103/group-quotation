import { CorporateDocument } from '../types';

export const corporateDocuments: CorporateDocument[] = [
  // Entity / Constitution documents
  { id: 'corp-001', organizationId: 'org-001', name: 'Certificate of Incorporation', category: 'Entity', type: 'incorporation-certificate', status: 'Active', expiryDate: null, uploadedAt: '2024-04-01T00:00:00Z', uploadedBy: 'usr-001', fileSize: 195000, mimeType: 'application/pdf' },
  { id: 'corp-002', organizationId: 'org-001', name: 'Memorandum of Association', category: 'Entity', type: 'moa', status: 'Active', expiryDate: null, uploadedAt: '2024-04-01T00:00:00Z', uploadedBy: 'usr-001', fileSize: 840000, mimeType: 'application/pdf' },
  { id: 'corp-003', organizationId: 'org-001', name: 'Articles of Association', category: 'Entity', type: 'aoa', status: 'Active', expiryDate: null, uploadedAt: '2024-04-01T00:00:00Z', uploadedBy: 'usr-001', fileSize: 620000, mimeType: 'application/pdf' },
  { id: 'corp-004', organizationId: 'org-001', name: 'Board Resolution — Group Insurance', category: 'Entity', type: 'board-resolution', status: 'Active', expiryDate: null, uploadedAt: '2024-03-15T10:00:00Z', uploadedBy: 'usr-001', fileSize: 185000, mimeType: 'application/pdf' },

  // KYC documents
  { id: 'corp-005', organizationId: 'org-001', name: 'PAN Card', category: 'KYC', type: 'pan', status: 'Active', expiryDate: null, uploadedAt: '2024-04-01T00:00:00Z', uploadedBy: 'usr-001', fileSize: 75000, mimeType: 'image/jpeg' },
  { id: 'corp-006', organizationId: 'org-001', name: 'GST Registration Certificate', category: 'KYC', type: 'gst', status: 'Active', expiryDate: null, uploadedAt: '2024-04-01T00:00:00Z', uploadedBy: 'usr-001', fileSize: 110000, mimeType: 'application/pdf' },
  { id: 'corp-007', organizationId: 'org-001', name: 'Address Proof — Registered Office', category: 'KYC', type: 'address-proof', status: 'Active', expiryDate: null, uploadedAt: '2024-04-01T00:00:00Z', uploadedBy: 'usr-001', fileSize: 145000, mimeType: 'application/pdf' },

  // Authorized Signatory documents
  { id: 'corp-008', organizationId: 'org-001', name: 'Authorized Signatory Declaration', category: 'Signatory', type: 'signatory-declaration', status: 'Active', expiryDate: '2027-03-31', uploadedAt: '2024-04-01T00:00:00Z', uploadedBy: 'usr-001', fileSize: 95000, mimeType: 'application/pdf' },
  { id: 'corp-009', organizationId: 'org-001', name: 'Signatory KYC — Alice Sharma', category: 'Signatory', type: 'signatory-kyc', status: 'Active', expiryDate: null, uploadedAt: '2024-04-01T00:00:00Z', uploadedBy: 'usr-001', fileSize: 80000, mimeType: 'image/jpeg' },

  // Financial documents
  { id: 'corp-010', organizationId: 'org-001', name: 'Audited Financial Statement 2023-24', category: 'Financial', type: 'financials', status: 'Active', expiryDate: null, uploadedAt: '2024-09-30T00:00:00Z', uploadedBy: 'usr-001', fileSize: 2800000, mimeType: 'application/pdf' },
  { id: 'corp-011', organizationId: 'org-001', name: 'Audited Financial Statement 2022-23', category: 'Financial', type: 'financials', status: 'Archived', expiryDate: null, uploadedAt: '2023-09-30T00:00:00Z', uploadedBy: 'usr-001', fileSize: 2600000, mimeType: 'application/pdf' },

  // Gratuity Trust specific
  { id: 'corp-012', organizationId: 'org-001', name: 'Gratuity Trust Deed', category: 'Trust', type: 'trust-deed', status: 'Active', expiryDate: null, uploadedAt: '2020-04-01T00:00:00Z', uploadedBy: 'usr-001', fileSize: 2400000, mimeType: 'application/pdf' },
  { id: 'corp-013', organizationId: 'org-001', name: 'IT Approval — Gratuity Trust', category: 'Trust', type: 'tax-approval', status: 'Active', expiryDate: '2027-03-31', uploadedAt: '2020-07-01T00:00:00Z', uploadedBy: 'usr-001', fileSize: 195000, mimeType: 'application/pdf' },
  { id: 'corp-014', organizationId: 'org-001', name: 'Trustee Appointment Letter 2024', category: 'Trust', type: 'trustee-resolution', status: 'Active', expiryDate: '2027-03-31', uploadedAt: '2024-04-01T00:00:00Z', uploadedBy: 'usr-001', fileSize: 175000, mimeType: 'application/pdf' },
  { id: 'corp-015', organizationId: 'org-001', name: 'Trust PAN Card', category: 'Trust', type: 'pan', status: 'Active', expiryDate: null, uploadedAt: '2020-04-01T00:00:00Z', uploadedBy: 'usr-001', fileSize: 72000, mimeType: 'image/jpeg' },

  // Compliance / Regulatory
  { id: 'corp-016', organizationId: 'org-001', name: 'IRDAI Registration (Policyholder)', category: 'Compliance', type: 'irdai-registration', status: 'Active', expiryDate: null, uploadedAt: '2024-04-01T00:00:00Z', uploadedBy: 'usr-001', fileSize: 155000, mimeType: 'application/pdf' },
  { id: 'corp-017', organizationId: 'org-001', name: 'EPF Registration', category: 'Compliance', type: 'epf-registration', status: 'Active', expiryDate: null, uploadedAt: '2024-04-01T00:00:00Z', uploadedBy: 'usr-001', fileSize: 130000, mimeType: 'application/pdf' },
  { id: 'corp-018', organizationId: 'org-001', name: 'ESIC Registration', category: 'Compliance', type: 'esic-registration', status: 'Active', expiryDate: null, uploadedAt: '2024-04-01T00:00:00Z', uploadedBy: 'usr-001', fileSize: 125000, mimeType: 'application/pdf' },

  // Contracts
  { id: 'corp-019', organizationId: 'org-001', name: 'Master Proposal Form — GTL', category: 'Contract', type: 'proposal-form', status: 'Active', expiryDate: null, uploadedAt: '2024-03-25T10:00:00Z', uploadedBy: 'usr-001', fileSize: 650000, mimeType: 'application/pdf' },
  { id: 'corp-020', organizationId: 'org-001', name: 'Service Agreement — Anaira Insurance', category: 'Contract', type: 'service-agreement', status: 'Active', expiryDate: '2027-03-31', uploadedAt: '2024-04-01T00:00:00Z', uploadedBy: 'usr-001', fileSize: 890000, mimeType: 'application/pdf' },
];
