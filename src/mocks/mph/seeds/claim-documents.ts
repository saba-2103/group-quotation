import { ClaimDocument } from '../types';

export const claimDocuments: ClaimDocument[] = [
  // clm-001 (Paid death claim)
  { id: 'cdoc-001', claimId: 'clm-001', name: 'Death Certificate', type: 'death-certificate', status: 'Accepted', uploadedAt: '2026-01-10T10:30:00Z', uploadedBy: 'usr-002', fileSize: 245000, mimeType: 'application/pdf' },
  { id: 'cdoc-002', claimId: 'clm-001', name: 'Claimant KYC - Aadhaar', type: 'kyc', status: 'Accepted', uploadedAt: '2026-01-10T10:35:00Z', uploadedBy: 'usr-002', fileSize: 180000, mimeType: 'image/jpeg' },
  { id: 'cdoc-003', claimId: 'clm-001', name: 'Bank Account Details', type: 'bank-proof', status: 'Accepted', uploadedAt: '2026-01-10T10:40:00Z', uploadedBy: 'usr-002', fileSize: 120000, mimeType: 'application/pdf' },
  { id: 'cdoc-004', claimId: 'clm-001', name: 'Nominee Declaration Form', type: 'declaration', status: 'Accepted', uploadedAt: '2026-01-10T10:45:00Z', uploadedBy: 'usr-002', fileSize: 95000, mimeType: 'application/pdf' },

  // clm-002 (Under Assessment accident claim)
  { id: 'cdoc-005', claimId: 'clm-002', name: 'Death Certificate', type: 'death-certificate', status: 'Accepted', uploadedAt: '2026-02-28T10:30:00Z', uploadedBy: 'usr-002', fileSize: 230000, mimeType: 'application/pdf' },
  { id: 'cdoc-006', claimId: 'clm-002', name: 'FIR / Police Report', type: 'police-report', status: 'Under Review', uploadedAt: '2026-02-28T10:40:00Z', uploadedBy: 'usr-002', fileSize: 310000, mimeType: 'application/pdf' },
  { id: 'cdoc-007', claimId: 'clm-002', name: 'Post Mortem Report', type: 'post-mortem', status: 'Under Review', uploadedAt: '2026-02-28T10:50:00Z', uploadedBy: 'usr-002', fileSize: 420000, mimeType: 'application/pdf' },

  // clm-003 (Approved TPD)
  { id: 'cdoc-008', claimId: 'clm-003', name: 'Medical Certificate', type: 'medical-certificate', status: 'Accepted', uploadedAt: '2025-09-01T10:30:00Z', uploadedBy: 'usr-002', fileSize: 350000, mimeType: 'application/pdf' },
  { id: 'cdoc-009', claimId: 'clm-003', name: 'Disability Certificate', type: 'disability-certificate', status: 'Accepted', uploadedAt: '2025-09-01T10:40:00Z', uploadedBy: 'usr-002', fileSize: 280000, mimeType: 'application/pdf' },
  { id: 'cdoc-010', claimId: 'clm-003', name: 'Hospital Records', type: 'hospital-records', status: 'Accepted', uploadedAt: '2025-09-01T10:50:00Z', uploadedBy: 'usr-002', fileSize: 1200000, mimeType: 'application/pdf' },

  // clm-004 (Paid critical illness)
  { id: 'cdoc-011', claimId: 'clm-004', name: 'Oncologist Report', type: 'medical-certificate', status: 'Accepted', uploadedAt: '2024-03-25T10:30:00Z', uploadedBy: 'usr-002', fileSize: 520000, mimeType: 'application/pdf' },
  { id: 'cdoc-012', claimId: 'clm-004', name: 'Biopsy Report', type: 'lab-report', status: 'Accepted', uploadedAt: '2024-03-25T10:40:00Z', uploadedBy: 'usr-002', fileSize: 680000, mimeType: 'application/pdf' },
  { id: 'cdoc-013', claimId: 'clm-004', name: 'Claimant PAN Card', type: 'kyc', status: 'Accepted', uploadedAt: '2024-03-25T10:45:00Z', uploadedBy: 'usr-002', fileSize: 95000, mimeType: 'image/jpeg' },

  // clm-005 (Documents Pending)
  { id: 'cdoc-014', claimId: 'clm-005', name: 'Preliminary Death Certificate', type: 'death-certificate', status: 'Accepted', uploadedAt: '2026-04-05T10:30:00Z', uploadedBy: 'usr-002', fileSize: 200000, mimeType: 'application/pdf' },

  // clm-007 (Rejected - suicide)
  { id: 'cdoc-015', claimId: 'clm-007', name: 'Death Certificate', type: 'death-certificate', status: 'Accepted', uploadedAt: '2025-05-20T10:30:00Z', uploadedBy: 'usr-002', fileSize: 230000, mimeType: 'application/pdf' },
  { id: 'cdoc-016', claimId: 'clm-007', name: 'Post Mortem Report', type: 'post-mortem', status: 'Accepted', uploadedAt: '2025-05-20T10:40:00Z', uploadedBy: 'usr-002', fileSize: 400000, mimeType: 'application/pdf' },

  // clm-008 (Paid)
  { id: 'cdoc-017', claimId: 'clm-008', name: 'Death Certificate', type: 'death-certificate', status: 'Accepted', uploadedAt: '2024-09-15T10:30:00Z', uploadedBy: 'usr-002', fileSize: 240000, mimeType: 'application/pdf' },
  { id: 'cdoc-018', claimId: 'clm-008', name: 'Medical Records', type: 'hospital-records', status: 'Accepted', uploadedAt: '2024-09-15T10:40:00Z', uploadedBy: 'usr-002', fileSize: 980000, mimeType: 'application/pdf' },
  { id: 'cdoc-019', claimId: 'clm-008', name: 'Nominee Bank Proof', type: 'bank-proof', status: 'Accepted', uploadedAt: '2024-09-15T10:50:00Z', uploadedBy: 'usr-002', fileSize: 110000, mimeType: 'application/pdf' },

  // clm-010 (GCL paid)
  { id: 'cdoc-020', claimId: 'clm-010', name: 'Death Certificate', type: 'death-certificate', status: 'Accepted', uploadedAt: '2025-08-01T10:30:00Z', uploadedBy: 'usr-002', fileSize: 225000, mimeType: 'application/pdf' },
  { id: 'cdoc-021', claimId: 'clm-010', name: 'Loan Account Statement', type: 'loan-statement', status: 'Accepted', uploadedAt: '2025-08-01T10:40:00Z', uploadedBy: 'usr-002', fileSize: 190000, mimeType: 'application/pdf' },

  // clm-012 (Savings retirement gratuity paid)
  { id: 'cdoc-022', claimId: 'clm-012', name: 'Retirement Order', type: 'hr-letter', status: 'Accepted', uploadedAt: '2026-01-05T10:30:00Z', uploadedBy: 'usr-002', fileSize: 150000, mimeType: 'application/pdf' },
  { id: 'cdoc-023', claimId: 'clm-012', name: 'Gratuity Calculation Sheet', type: 'declaration', status: 'Accepted', uploadedAt: '2026-01-05T10:35:00Z', uploadedBy: 'usr-002', fileSize: 85000, mimeType: 'application/pdf' },
  { id: 'cdoc-024', claimId: 'clm-012', name: 'Bank Account Details', type: 'bank-proof', status: 'Accepted', uploadedAt: '2026-01-05T10:40:00Z', uploadedBy: 'usr-002', fileSize: 110000, mimeType: 'application/pdf' },

  // clm-015 (Documents Pending accident)
  { id: 'cdoc-025', claimId: 'clm-015', name: 'Preliminary Death Certificate', type: 'death-certificate', status: 'Pending', uploadedAt: '2026-04-18T10:30:00Z', uploadedBy: 'usr-002', fileSize: 210000, mimeType: 'application/pdf' },

  // clm-017 (GCL approved)
  { id: 'cdoc-026', claimId: 'clm-017', name: 'Death Certificate', type: 'death-certificate', status: 'Accepted', uploadedAt: '2025-12-01T10:30:00Z', uploadedBy: 'usr-002', fileSize: 235000, mimeType: 'application/pdf' },
  { id: 'cdoc-027', claimId: 'clm-017', name: 'FIR', type: 'police-report', status: 'Accepted', uploadedAt: '2025-12-01T10:40:00Z', uploadedBy: 'usr-002', fileSize: 290000, mimeType: 'application/pdf' },
  { id: 'cdoc-028', claimId: 'clm-017', name: 'Loan Statement', type: 'loan-statement', status: 'Accepted', uploadedAt: '2025-12-01T10:50:00Z', uploadedBy: 'usr-002', fileSize: 175000, mimeType: 'application/pdf' },

  // clm-019 (Paid critical illness)
  { id: 'cdoc-029', claimId: 'clm-019', name: 'Neurologist Report', type: 'medical-certificate', status: 'Accepted', uploadedAt: '2025-04-01T10:30:00Z', uploadedBy: 'usr-002', fileSize: 480000, mimeType: 'application/pdf' },
  { id: 'cdoc-030', claimId: 'clm-019', name: 'MRI Scan Report', type: 'lab-report', status: 'Accepted', uploadedAt: '2025-04-01T10:40:00Z', uploadedBy: 'usr-002', fileSize: 2100000, mimeType: 'application/pdf' },
];
