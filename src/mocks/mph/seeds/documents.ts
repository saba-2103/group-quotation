import { Document } from '../types';

export const documents: Document[] = [
  // Policy documents — pol-gtl-001
  { id: 'doc-001', policyId: 'pol-gtl-001', organizationId: 'org-001', category: 'Policy', name: 'Master Policy Certificate 2025-26', type: 'policy-certificate', status: 'Active', uploadedAt: '2025-04-01T00:00:00Z', uploadedBy: 'usr-008', fileSize: 380000, mimeType: 'application/pdf', version: 1 },
  { id: 'doc-002', policyId: 'pol-gtl-001', organizationId: 'org-001', category: 'Policy', name: 'Schedule of Benefits', type: 'benefits-schedule', status: 'Active', uploadedAt: '2025-04-01T00:00:00Z', uploadedBy: 'usr-008', fileSize: 220000, mimeType: 'application/pdf', version: 1 },
  { id: 'doc-003', policyId: 'pol-gtl-001', organizationId: 'org-001', category: 'Policy', name: 'Policy Wording Document', type: 'policy-wording', status: 'Active', uploadedAt: '2025-04-01T00:00:00Z', uploadedBy: 'usr-008', fileSize: 1200000, mimeType: 'application/pdf', version: 2 },
  { id: 'doc-004', policyId: 'pol-gtl-001', organizationId: 'org-001', category: 'Policy', name: 'Member Certificate Template', type: 'member-certificate', status: 'Active', uploadedAt: '2025-04-01T00:00:00Z', uploadedBy: 'usr-008', fileSize: 145000, mimeType: 'application/pdf', version: 1 },
  { id: 'doc-005', policyId: 'pol-gtl-001', organizationId: 'org-001', category: 'Renewal', name: 'Renewal Notice 2025-26', type: 'renewal-notice', status: 'Active', uploadedAt: '2025-03-10T10:00:00Z', uploadedBy: 'usr-008', fileSize: 195000, mimeType: 'application/pdf', version: 1 },
  { id: 'doc-006', policyId: 'pol-gtl-001', organizationId: 'org-001', category: 'Renewal', name: 'Signed Acceptance Letter', type: 'acceptance-letter', status: 'Active', uploadedAt: '2025-03-20T11:00:00Z', uploadedBy: 'usr-001', fileSize: 85000, mimeType: 'application/pdf', version: 1 },
  { id: 'doc-007', policyId: 'pol-gtl-001', organizationId: 'org-001', category: 'Endorsement', name: 'Endorsement Schedule 2024-25', type: 'endorsement-schedule', status: 'Active', uploadedAt: '2025-03-10T10:00:00Z', uploadedBy: 'usr-008', fileSize: 310000, mimeType: 'application/pdf', version: 1 },
  { id: 'doc-008', policyId: 'pol-gtl-001', organizationId: 'org-001', category: 'Census', name: 'Member Census Upload 2025-26', type: 'census', status: 'Active', uploadedAt: '2025-02-15T14:00:00Z', uploadedBy: 'usr-002', fileSize: 95000, mimeType: 'text/csv', version: 1 },
  { id: 'doc-009', policyId: 'pol-gtl-001', organizationId: 'org-001', category: 'KYC', name: 'Organization PAN', type: 'org-kyc', status: 'Active', uploadedAt: '2024-04-01T00:00:00Z', uploadedBy: 'usr-001', fileSize: 75000, mimeType: 'image/jpeg', version: 1 },
  { id: 'doc-010', policyId: 'pol-gtl-001', organizationId: 'org-001', category: 'KYC', name: 'Organization GST Certificate', type: 'org-kyc', status: 'Active', uploadedAt: '2024-04-01T00:00:00Z', uploadedBy: 'usr-001', fileSize: 110000, mimeType: 'application/pdf', version: 1 },

  // Policy documents — pol-gcl-002
  { id: 'doc-011', policyId: 'pol-gcl-002', organizationId: 'org-001', category: 'Policy', name: 'Master Policy Certificate GCL 2024-25', type: 'policy-certificate', status: 'Active', uploadedAt: '2024-06-01T00:00:00Z', uploadedBy: 'usr-008', fileSize: 290000, mimeType: 'application/pdf', version: 1 },
  { id: 'doc-012', policyId: 'pol-gcl-002', organizationId: 'org-001', category: 'Policy', name: 'Loan Cover Schedule', type: 'benefits-schedule', status: 'Active', uploadedAt: '2024-06-01T00:00:00Z', uploadedBy: 'usr-008', fileSize: 185000, mimeType: 'application/pdf', version: 1 },
  { id: 'doc-013', policyId: 'pol-gcl-002', organizationId: 'org-001', category: 'Billing', name: 'Premium Register Q1 2025', type: 'premium-register', status: 'Active', uploadedAt: '2025-04-15T10:00:00Z', uploadedBy: 'usr-008', fileSize: 145000, mimeType: 'application/pdf', version: 1 },
  { id: 'doc-014', policyId: 'pol-gcl-002', organizationId: 'org-001', category: 'Census', name: 'Borrower Census Dec 2024', type: 'census', status: 'Active', uploadedAt: '2024-12-31T23:59:00Z', uploadedBy: 'usr-002', fileSize: 62000, mimeType: 'text/csv', version: 1 },

  // Policy documents — pol-sav-003
  { id: 'doc-015', policyId: 'pol-sav-003', organizationId: 'org-001', category: 'Policy', name: 'Gratuity Trust Deed', type: 'trust-deed', status: 'Active', uploadedAt: '2020-04-01T00:00:00Z', uploadedBy: 'usr-008', fileSize: 2400000, mimeType: 'application/pdf', version: 1 },
  { id: 'doc-016', policyId: 'pol-sav-003', organizationId: 'org-001', category: 'Policy', name: 'Master Policy Certificate SAV 2024-25', type: 'policy-certificate', status: 'Active', uploadedAt: '2024-04-01T00:00:00Z', uploadedBy: 'usr-008', fileSize: 350000, mimeType: 'application/pdf', version: 1 },
  { id: 'doc-017', policyId: 'pol-sav-003', organizationId: 'org-001', category: 'Renewal', name: 'Renewal Quote 2025-26', type: 'renewal-notice', status: 'Active', uploadedAt: '2025-03-25T10:00:00Z', uploadedBy: 'usr-008', fileSize: 240000, mimeType: 'application/pdf', version: 1 },
  { id: 'doc-018', policyId: 'pol-sav-003', organizationId: 'org-001', category: 'Renewal', name: 'Actuarial Valuation 2025', type: 'actuarial-report', status: 'Active', uploadedAt: '2025-03-25T10:00:00Z', uploadedBy: 'usr-008', fileSize: 890000, mimeType: 'application/pdf', version: 1 },
  { id: 'doc-019', policyId: 'pol-sav-003', organizationId: 'org-001', category: 'Census', name: 'Gratuity Fund Census Mar 2025', type: 'census', status: 'Active', uploadedAt: '2025-03-15T23:59:00Z', uploadedBy: 'usr-002', fileSize: 78000, mimeType: 'text/csv', version: 1 },
  { id: 'doc-020', policyId: 'pol-sav-003', organizationId: 'org-001', category: 'Compliance', name: 'IT Approval for Gratuity Fund', type: 'tax-approval', status: 'Active', uploadedAt: '2020-07-01T00:00:00Z', uploadedBy: 'usr-001', fileSize: 195000, mimeType: 'application/pdf', version: 1 },

  // Member-specific documents
  { id: 'doc-021', policyId: 'pol-gtl-001', organizationId: 'org-001', memberId: 'mbr-001', category: 'Member', name: 'Member Certificate - Rajesh Kumar', type: 'member-certificate', status: 'Active', uploadedAt: '2024-04-01T00:00:00Z', uploadedBy: 'usr-008', fileSize: 145000, mimeType: 'application/pdf', version: 1 },
  { id: 'doc-022', policyId: 'pol-gtl-001', organizationId: 'org-001', memberId: 'mbr-005', category: 'Member', name: 'Member Certificate - Vikram Singh', type: 'member-certificate', status: 'Active', uploadedAt: '2024-04-01T00:00:00Z', uploadedBy: 'usr-008', fileSize: 145000, mimeType: 'application/pdf', version: 1 },
  { id: 'doc-023', policyId: 'pol-gtl-001', organizationId: 'org-001', memberId: 'mbr-025', category: 'Member', name: 'Enrollment Form - Nikhil Chopra', type: 'enrollment-form', status: 'Pending Review', uploadedAt: '2026-04-25T14:00:00Z', uploadedBy: 'usr-002', fileSize: 185000, mimeType: 'application/pdf', version: 1 },

  // Claim documents (cross-references)
  { id: 'doc-024', policyId: 'pol-gtl-001', organizationId: 'org-001', memberId: 'mbr-027', claimId: 'clm-001', category: 'Claim', name: 'Claim Settlement Letter - mbr-027', type: 'settlement-letter', status: 'Active', uploadedAt: '2026-02-01T00:00:00Z', uploadedBy: 'usr-008', fileSize: 145000, mimeType: 'application/pdf', version: 1 },
  { id: 'doc-025', policyId: 'pol-gtl-001', organizationId: 'org-001', memberId: 'mbr-021', claimId: 'clm-008', category: 'Claim', name: 'Claim Settlement Letter - mbr-021', type: 'settlement-letter', status: 'Active', uploadedAt: '2024-10-15T00:00:00Z', uploadedBy: 'usr-008', fileSize: 145000, mimeType: 'application/pdf', version: 1 },

  // MIS / Reports
  { id: 'doc-026', policyId: 'pol-gtl-001', organizationId: 'org-001', category: 'MIS', name: 'Monthly MIS Report Mar 2026', type: 'mis-report', status: 'Active', uploadedAt: '2026-04-05T10:00:00Z', uploadedBy: 'usr-008', fileSize: 540000, mimeType: 'application/pdf', version: 1 },
  { id: 'doc-027', policyId: 'pol-gcl-002', organizationId: 'org-001', category: 'MIS', name: 'Monthly MIS Report Mar 2026', type: 'mis-report', status: 'Active', uploadedAt: '2026-04-05T10:00:00Z', uploadedBy: 'usr-008', fileSize: 380000, mimeType: 'application/pdf', version: 1 },
  { id: 'doc-028', policyId: 'pol-sav-003', organizationId: 'org-001', category: 'MIS', name: 'Annual Fund Statement 2024-25', type: 'fund-statement', status: 'Active', uploadedAt: '2025-05-15T10:00:00Z', uploadedBy: 'usr-008', fileSize: 720000, mimeType: 'application/pdf', version: 1 },

  // Compliance
  { id: 'doc-029', policyId: 'pol-gtl-001', organizationId: 'org-001', category: 'Compliance', name: 'IRDAI Annual Return 2024-25', type: 'regulatory-filing', status: 'Active', uploadedAt: '2025-09-30T23:59:00Z', uploadedBy: 'usr-008', fileSize: 890000, mimeType: 'application/pdf', version: 1 },
  { id: 'doc-030', policyId: 'pol-sav-003', organizationId: 'org-001', category: 'Compliance', name: 'Trustee Resolution 2025', type: 'trustee-resolution', status: 'Active', uploadedAt: '2025-04-30T00:00:00Z', uploadedBy: 'usr-001', fileSize: 210000, mimeType: 'application/pdf', version: 1 },
];
