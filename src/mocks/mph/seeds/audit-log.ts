import { AuditEntry } from '../types';

export const auditLog: AuditEntry[] = [
  // Org + policy setup
  { id: 'aud-001', organizationId: 'org-001', userId: 'usr-001', action: 'CREATE', entity: 'Organization', entityId: 'org-001', description: 'Organization onboarded: Acme Technologies Ltd', timestamp: '2024-03-28T09:00:00Z' },
  { id: 'aud-002', organizationId: 'org-001', userId: 'usr-008', action: 'CREATE', entity: 'Policy', entityId: 'pol-gtl-001', description: 'Policy issued: GTLG/2024/001/00001', timestamp: '2024-04-01T00:00:00Z' },
  { id: 'aud-003', organizationId: 'org-001', userId: 'usr-008', action: 'CREATE', entity: 'Policy', entityId: 'pol-gcl-002', description: 'Policy issued: GCLG/2024/001/00002', timestamp: '2024-06-01T00:00:00Z' },
  { id: 'aud-004', organizationId: 'org-001', userId: 'usr-008', action: 'CREATE', entity: 'Policy', entityId: 'pol-sav-003', description: 'Policy issued: GSAVG/2024/001/00003', timestamp: '2020-04-01T00:00:00Z' },

  // User management
  { id: 'aud-005', organizationId: 'org-001', userId: 'usr-001', action: 'CREATE', entity: 'User', entityId: 'usr-002', description: 'User created: Bob Mehta (Maker role)', timestamp: '2024-04-01T09:00:00Z' },
  { id: 'aud-006', organizationId: 'org-001', userId: 'usr-001', action: 'CREATE', entity: 'User', entityId: 'usr-003', description: 'User created: Carol Nair (Maker role)', timestamp: '2024-04-01T09:05:00Z' },
  { id: 'aud-007', organizationId: 'org-001', userId: 'usr-001', action: 'CREATE', entity: 'User', entityId: 'usr-004', description: 'User created: Dave Kulkarni (Approver role)', timestamp: '2024-04-01T09:10:00Z' },
  { id: 'aud-008', organizationId: 'org-001', userId: 'usr-001', action: 'CREATE', entity: 'User', entityId: 'usr-005', description: 'User created: Eve Patel (Approver role)', timestamp: '2024-04-01T09:15:00Z' },
  { id: 'aud-009', organizationId: 'org-001', userId: 'usr-001', action: 'CREATE', entity: 'User', entityId: 'usr-006', description: 'User created: Frank D\'Souza (Viewer role)', timestamp: '2024-04-01T09:20:00Z' },

  // Member enrollment
  { id: 'aud-010', organizationId: 'org-001', userId: 'usr-002', action: 'CREATE', entity: 'Member', entityId: 'mbr-001', description: 'Member enrolled: Rajesh Kumar (EMP001, Plan A)', timestamp: '2024-04-15T10:00:00Z' },
  { id: 'aud-011', organizationId: 'org-001', userId: 'usr-002', action: 'CREATE', entity: 'Member', entityId: 'mbr-002', description: 'Member enrolled: Priya Sharma (EMP002, Plan B)', timestamp: '2024-04-15T10:01:00Z' },
  { id: 'aud-012', organizationId: 'org-001', userId: 'usr-002', action: 'CREATE', entity: 'Member', entityId: 'mbr-005', description: 'Member enrolled: Vikram Singh (EMP005, Plan A)', timestamp: '2024-04-15T10:05:00Z' },
  { id: 'aud-013', organizationId: 'org-001', userId: 'usr-004', action: 'APPROVE', entity: 'Endorsement', entityId: 'end-001', description: 'Endorsement approved: END-2024-001 (member addition — Mohan Pillai)', timestamp: '2023-03-27T14:30:00Z' },
  { id: 'aud-014', organizationId: 'org-001', userId: 'usr-008', action: 'APPLY', entity: 'Endorsement', entityId: 'end-001', description: 'Endorsement applied: END-2024-001. Member mbr-011 status → Active', timestamp: '2023-04-01T00:00:00Z' },

  // Endorsement actions
  { id: 'aud-015', organizationId: 'org-001', userId: 'usr-002', action: 'CREATE', entity: 'Endorsement', entityId: 'end-002', description: 'Endorsement submitted: END-2026-002 (exit — Tanya Agarwal, LWD 2026-05-15)', timestamp: '2026-04-28T09:00:00Z' },
  { id: 'aud-016', organizationId: 'org-001', userId: 'usr-003', action: 'CREATE', entity: 'Endorsement', entityId: 'end-008', description: 'Endorsement submitted: END-2026-008 (DOB correction — Pooja Gupta)', timestamp: '2026-04-20T10:00:00Z' },
  { id: 'aud-017', organizationId: 'org-001', userId: 'usr-008', action: 'QUERY', entity: 'Endorsement', entityId: 'end-008', description: 'Query raised on END-2026-008: Supporting document required for DOB change', timestamp: '2026-04-22T15:00:00Z' },
  { id: 'aud-018', organizationId: 'org-001', userId: 'usr-004', action: 'REJECT', entity: 'Endorsement', entityId: 'end-009', description: 'Endorsement rejected: END-2025-009 (grade change — Rajesh Kumar). Reason: Missing HR confirmation', timestamp: '2025-06-17T14:00:00Z' },
  { id: 'aud-019', organizationId: 'org-001', userId: 'usr-002', action: 'CREATE', entity: 'Endorsement', entityId: 'end-006', description: 'Endorsement submitted: END-2026-006 (member addition — Nikhil Chopra, Plan C)', timestamp: '2026-04-25T14:00:00Z' },
  { id: 'aud-020', organizationId: 'org-001', userId: 'usr-002', action: 'CREATE', entity: 'Endorsement', entityId: 'end-014', description: 'Endorsement submitted: END-2026-014 (salary revision — Deepak Joshi)', timestamp: '2026-04-27T11:00:00Z' },
  { id: 'aud-021', organizationId: 'org-001', userId: 'usr-003', action: 'CREATE', entity: 'Endorsement', entityId: 'end-015', description: 'Endorsement submitted: END-2026-015 (nominee update — Anil Verma)', timestamp: '2026-04-29T14:00:00Z' },
  { id: 'aud-022', organizationId: 'org-001', userId: 'usr-004', action: 'APPROVE', entity: 'Endorsement', entityId: 'end-004', description: 'Endorsement approved: END-2025-004 (coverage change — Vivek Kapoor → Plan A)', timestamp: '2025-02-03T14:00:00Z' },
  { id: 'aud-023', organizationId: 'org-001', userId: 'usr-008', action: 'APPLY', entity: 'Endorsement', entityId: 'end-007', description: 'Endorsement applied: END-2025-007. Member mbr-027 status → Exited (Retirement 2025-12-31)', timestamp: '2026-01-01T00:00:00Z' },
  { id: 'aud-024', organizationId: 'org-001', userId: 'usr-008', action: 'APPLY', entity: 'Endorsement', entityId: 'end-011', description: 'Endorsement applied: END-2026-011. Member mbr-041 status → Exited (Loan Closed)', timestamp: '2026-02-01T00:00:00Z' },

  // Claims
  { id: 'aud-025', organizationId: 'org-001', userId: 'usr-002', action: 'CREATE', entity: 'Claim', entityId: 'clm-001', description: 'Claim filed: CLM-GTL-2026-001 (Death — Ramesh Bose, SA ₹1.4 Cr)', timestamp: '2026-01-10T10:00:00Z' },
  { id: 'aud-026', organizationId: 'org-001', userId: 'usr-008', action: 'UPDATE', entity: 'Claim', entityId: 'clm-001', description: 'Claim status → Paid. ₹1,40,00,000 disbursed to Rekha Joshi', timestamp: '2026-02-01T00:00:00Z' },
  { id: 'aud-027', organizationId: 'org-001', userId: 'usr-002', action: 'CREATE', entity: 'Claim', entityId: 'clm-006', description: 'Claim filed: CLM-GTL-2026-006 (Accidental Death — Rajesh Kumar, SA ₹2.5 Cr)', timestamp: '2026-04-28T10:00:00Z' },
  { id: 'aud-028', organizationId: 'org-001', userId: 'usr-008', action: 'REJECT', entity: 'Claim', entityId: 'clm-007', description: 'Claim rejected: CLM-GTL-2025-007 (Sanjay Bhatt). Reason: Suicide exclusion applies', timestamp: '2025-06-10T11:00:00Z' },
  { id: 'aud-029', organizationId: 'org-001', userId: 'usr-008', action: 'UPDATE', entity: 'Claim', entityId: 'clm-012', description: 'Claim status → Paid. ₹65,00,000 gratuity disbursed to Pratap Singh', timestamp: '2026-01-31T00:00:00Z' },
  { id: 'aud-030', organizationId: 'org-001', userId: 'usr-002', action: 'CREATE', entity: 'Claim', entityId: 'clm-018', description: 'Claim drafted: CLM-GTL-2026-018 (TPD — Priya Sharma)', timestamp: '2026-04-28T14:00:00Z' },

  // Billing
  { id: 'aud-031', organizationId: 'org-001', userId: 'usr-002', action: 'PAYMENT', entity: 'BillingStatement', entityId: 'bill-001', description: 'Premium paid: ₹36,50,000 for STMT-GTL-2024-001 (TXN-2024-04-001)', timestamp: '2024-04-22T00:00:00Z' },
  { id: 'aud-032', organizationId: 'org-001', userId: 'usr-002', action: 'PAYMENT', entity: 'BillingStatement', entityId: 'bill-002', description: 'Premium paid: ₹39,00,000 for STMT-GTL-2025-001 (TXN-2025-04-001)', timestamp: '2025-04-18T00:00:00Z' },
  { id: 'aud-033', organizationId: 'org-001', userId: 'usr-001', action: 'ESCALATE', entity: 'BillingStatement', entityId: 'bill-012', description: 'Premium overdue escalated: STMT-SAV-2025-001 (₹75,00,000). Policy status → Renewing.', timestamp: '2025-06-01T08:00:00Z' },

  // Renewal
  { id: 'aud-034', organizationId: 'org-001', userId: 'usr-008', action: 'UPDATE', entity: 'Renewal', entityId: 'ren-001', description: 'Renewal census locked for pol-gtl-001 (520 lives)', timestamp: '2025-02-28T23:59:59Z' },
  { id: 'aud-035', organizationId: 'org-001', userId: 'usr-008', action: 'UPDATE', entity: 'Renewal', entityId: 'ren-001', description: 'Renewal quote issued: ₹39,00,000 (+6.85%)', timestamp: '2025-03-10T10:00:00Z' },
  { id: 'aud-036', organizationId: 'org-001', userId: 'usr-002', action: 'APPROVE', entity: 'Renewal', entityId: 'ren-001', description: 'Renewal quote accepted by Acme Tech for 2025-26', timestamp: '2025-03-20T11:00:00Z' },
  { id: 'aud-037', organizationId: 'org-001', userId: 'usr-008', action: 'UPDATE', entity: 'Renewal', entityId: 'ren-001', description: 'Policy renewed: pol-gtl-001 for 2025-26. Policy Certificate issued.', timestamp: '2025-04-01T00:00:00Z' },
  { id: 'aud-038', organizationId: 'org-001', userId: 'usr-008', action: 'UPDATE', entity: 'Renewal', entityId: 'ren-003', description: 'Renewal quote received: ₹79,00,000 (+5.33%) for pol-sav-003. Expires 2025-04-10.', timestamp: '2025-03-25T10:00:00Z' },

  // Documents
  { id: 'aud-039', organizationId: 'org-001', userId: 'usr-008', action: 'UPLOAD', entity: 'Document', entityId: 'doc-001', description: 'Document uploaded: Master Policy Certificate 2025-26 (GTL)', timestamp: '2025-04-01T00:00:00Z' },
  { id: 'aud-040', organizationId: 'org-001', userId: 'usr-002', action: 'UPLOAD', entity: 'Document', entityId: 'doc-008', description: 'Census file uploaded: 520 members for GTL renewal 2025-26', timestamp: '2025-02-15T14:00:00Z' },
  { id: 'aud-041', organizationId: 'org-001', userId: 'usr-001', action: 'UPLOAD', entity: 'CorporateDocument', entityId: 'corp-001', description: 'Corporate document uploaded: Certificate of Incorporation', timestamp: '2024-04-01T00:00:00Z' },
  { id: 'aud-042', organizationId: 'org-001', userId: 'usr-001', action: 'UPLOAD', entity: 'CorporateDocument', entityId: 'corp-012', description: 'Corporate document uploaded: Gratuity Trust Deed', timestamp: '2020-04-01T00:00:00Z' },

  // Login events
  { id: 'aud-043', organizationId: 'org-001', userId: 'usr-001', action: 'LOGIN', entity: 'User', entityId: 'usr-001', description: 'User login: Alice Sharma (super-admin)', timestamp: '2026-04-29T09:15:00Z' },
  { id: 'aud-044', organizationId: 'org-001', userId: 'usr-002', action: 'LOGIN', entity: 'User', entityId: 'usr-002', description: 'User login: Bob Mehta (maker)', timestamp: '2026-04-29T10:30:00Z' },
  { id: 'aud-045', organizationId: 'org-001', userId: 'usr-004', action: 'LOGIN', entity: 'User', entityId: 'usr-004', description: 'User login: Dave Kulkarni (approver)', timestamp: '2026-04-29T11:00:00Z' },
  { id: 'aud-046', organizationId: 'org-001', userId: 'usr-008', action: 'LOGIN', entity: 'User', entityId: 'usr-008', description: 'User login: Henry Thomas (insurer-ops)', timestamp: '2026-04-29T08:45:00Z' },

  // Setup journey
  { id: 'aud-047', organizationId: 'org-001', userId: 'usr-002', action: 'CREATE', entity: 'SetupCase', entityId: 'setup-001', description: 'Setup case opened: SETUP-2024-001 (GTL policy onboarding)', timestamp: '2024-02-10T10:00:00Z' },
  { id: 'aud-048', organizationId: 'org-001', userId: 'usr-008', action: 'UPDATE', entity: 'SetupCase', entityId: 'setup-001', description: 'Setup case completed: SETUP-2024-001. Policy issued and members enrolled.', timestamp: '2024-04-15T10:00:00Z' },
  { id: 'aud-049', organizationId: 'org-001', userId: 'usr-002', action: 'CREATE', entity: 'SetupCase', entityId: 'setup-002', description: 'Setup case opened: SETUP-2026-002 (SAV policy renewal setup)', timestamp: '2026-02-20T10:00:00Z' },

  // Bank profiles
  { id: 'aud-050', organizationId: 'org-001', userId: 'usr-001', action: 'CREATE', entity: 'BankProfile', entityId: 'bank-001', description: 'Bank profile created: HDFC Bank (premium account for GTL/GCL)', timestamp: '2024-03-28T10:00:00Z' },
  { id: 'aud-051', organizationId: 'org-001', userId: 'usr-008', action: 'UPDATE', entity: 'BankProfile', entityId: 'bank-001', description: 'Bank profile verified: bank-001 (HDFC BKC)', timestamp: '2024-04-01T00:00:00Z' },

  // Wallet
  { id: 'aud-052', organizationId: 'org-001', userId: 'usr-008', action: 'CREDIT', entity: 'Wallet', entityId: 'wallet-001', description: 'CD account credited: ₹5,00,000 initial deposit (pol-gtl-001)', timestamp: '2024-04-01T00:00:00Z' },
  { id: 'aud-053', organizationId: 'org-001', userId: 'usr-008', action: 'DEBIT', entity: 'Wallet', entityId: 'wallet-003', description: 'Fund debited: ₹65,00,000 gratuity claim payout (clm-012)', timestamp: '2026-01-31T00:00:00Z' },

  // Service requests
  { id: 'aud-054', organizationId: 'org-001', userId: 'usr-001', action: 'CREATE', entity: 'ServiceRequest', entityId: 'sr-001', description: 'Service request raised: SR-2026-001 (policy copy request)', timestamp: '2026-04-05T10:00:00Z' },
  { id: 'aud-055', organizationId: 'org-001', userId: 'usr-008', action: 'RESOLVE', entity: 'ServiceRequest', entityId: 'sr-001', description: 'Service request resolved: SR-2026-001. Document uploaded.', timestamp: '2026-04-07T14:00:00Z' },

  // Member-level actions
  { id: 'aud-056', organizationId: 'org-001', userId: 'usr-002', action: 'CREATE', entity: 'Member', entityId: 'mbr-025', description: 'Member record created (Pending Approval): Nikhil Chopra (EMP025, Plan C)', timestamp: '2026-04-25T14:00:00Z' },
  { id: 'aud-057', organizationId: 'org-001', userId: 'usr-002', action: 'CREATE', entity: 'Member', entityId: 'mbr-026', description: 'Exit initiated for Tanya Agarwal (EMP026). LWD: 2026-05-15. Status → Pending Exit', timestamp: '2026-04-28T09:00:00Z' },
  { id: 'aud-058', organizationId: 'org-001', userId: 'usr-004', action: 'APPROVE', entity: 'Endorsement', entityId: 'end-005', description: 'Endorsement approved: END-2024-005 (nominee update — Suresh Rao)', timestamp: '2024-06-12T10:00:00Z' },
  { id: 'aud-059', organizationId: 'org-001', userId: 'usr-002', action: 'UPLOAD', entity: 'ClaimDocument', entityId: 'cdoc-001', description: 'Claim document uploaded: Death Certificate for CLM-GTL-2026-001', timestamp: '2026-01-10T10:30:00Z' },
  { id: 'aud-060', organizationId: 'org-001', userId: 'usr-008', action: 'UPDATE', entity: 'Claim', entityId: 'clm-003', description: 'TPD claim CLM-GTL-2025-003 approved. ₹2,00,00,000 approved for Vikram Singh', timestamp: '2025-10-01T11:00:00Z' },

  // Password / auth
  { id: 'aud-061', organizationId: 'org-001', userId: 'usr-003', action: 'LOGIN', entity: 'User', entityId: 'usr-003', description: 'User login: Carol Nair (maker)', timestamp: '2026-04-28T16:00:00Z' },
  { id: 'aud-062', organizationId: 'org-001', userId: 'usr-006', action: 'LOGIN', entity: 'User', entityId: 'usr-006', description: 'User login: Frank D\'Souza (viewer)', timestamp: '2026-04-25T09:00:00Z' },
  { id: 'aud-063', organizationId: 'org-001', userId: 'usr-005', action: 'LOGIN', entity: 'User', entityId: 'usr-005', description: 'User login: Eve Patel (approver)', timestamp: '2026-04-27T14:20:00Z' },

  // Nominee updates
  { id: 'aud-064', organizationId: 'org-001', userId: 'usr-002', action: 'CREATE', entity: 'Nominee', entityId: 'nom-001', description: 'Nominee created: Sunita Kumar (100%) for mbr-001', timestamp: '2024-04-15T10:30:00Z' },
  { id: 'aud-065', organizationId: 'org-001', userId: 'usr-002', action: 'CREATE', entity: 'Nominee', entityId: 'nom-009', description: 'Nominee updated: Seetha Rao (100%) for mbr-007 via END-2024-005', timestamp: '2024-06-12T10:30:00Z' },

  // GCL member actions
  { id: 'aud-066', organizationId: 'org-001', userId: 'usr-002', action: 'CREATE', entity: 'Member', entityId: 'mbr-031', description: 'Borrower enrolled: Shyam Sundar (BRW001, Home Loan)', timestamp: '2024-01-15T10:00:00Z' },
  { id: 'aud-067', organizationId: 'org-001', userId: 'usr-004', action: 'APPROVE', entity: 'Endorsement', entityId: 'end-010', description: 'Endorsement approved: END-2024-010 (GCL member addition — Vijay Murthy)', timestamp: '2024-05-28T11:00:00Z' },
  { id: 'aud-068', organizationId: 'org-001', userId: 'usr-008', action: 'APPLY', entity: 'Endorsement', entityId: 'end-011', description: 'Endorsement applied: END-2026-011. Member mbr-041 (Sunil Ghosh) → Exited (Loan Closed)', timestamp: '2026-02-01T00:00:00Z' },

  // Savings-specific
  { id: 'aud-069', organizationId: 'org-001', userId: 'usr-001', action: 'UPLOAD', entity: 'CorporateDocument', entityId: 'corp-013', description: 'Corporate document uploaded: IT Approval for Gratuity Trust (valid to 2027-03-31)', timestamp: '2020-07-01T00:00:00Z' },
  { id: 'aud-070', organizationId: 'org-001', userId: 'usr-008', action: 'UPDATE', entity: 'Renewal', entityId: 'ren-003', description: 'Actuarial valuation report uploaded for pol-sav-003 renewal', timestamp: '2025-03-25T10:05:00Z' },

  // MIS and reports
  { id: 'aud-071', organizationId: 'org-001', userId: 'usr-008', action: 'UPLOAD', entity: 'Document', entityId: 'doc-026', description: 'MIS report uploaded: Monthly MIS Mar 2026 (GTL)', timestamp: '2026-04-05T10:00:00Z' },
  { id: 'aud-072', organizationId: 'org-001', userId: 'usr-008', action: 'UPLOAD', entity: 'Document', entityId: 'doc-028', description: 'Fund statement uploaded: Annual Fund Statement 2024-25 (SAV)', timestamp: '2025-05-15T10:00:00Z' },

  // Bulk upload
  { id: 'aud-073', organizationId: 'org-001', userId: 'usr-002', action: 'BULK_UPLOAD', entity: 'Member', entityId: null, description: 'Bulk census upload: 520 members processed for GTL 2025-26 renewal', timestamp: '2025-02-15T14:30:00Z' },
  { id: 'aud-074', organizationId: 'org-001', userId: 'usr-002', action: 'BULK_UPLOAD', entity: 'Member', entityId: null, description: 'Bulk census upload: 215 borrowers processed for GCL Dec 2024 census', timestamp: '2024-12-31T23:59:00Z' },

  // Premium payments
  { id: 'aud-075', organizationId: 'org-001', userId: 'usr-002', action: 'PAYMENT', entity: 'BillingStatement', entityId: 'bill-005', description: 'Monthly premium paid: ₹1,07,500 for GCL Jun 2024 (TXN-2024-06-002)', timestamp: '2024-06-12T00:00:00Z' },
  { id: 'aud-076', organizationId: 'org-001', userId: 'usr-002', action: 'PAYMENT', entity: 'BillingStatement', entityId: 'bill-009', description: 'Monthly premium paid: ₹1,07,500 for GCL Mar 2026 (TXN-2026-03-001)', timestamp: '2026-03-10T00:00:00Z' },
  { id: 'aud-077', organizationId: 'org-001', userId: 'usr-002', action: 'PAYMENT', entity: 'BillingStatement', entityId: 'bill-011', description: 'Annual premium paid: ₹75,00,000 for SAV 2024-25 (TXN-2024-04-003)', timestamp: '2024-04-25T00:00:00Z' },

  // Claim document uploads
  { id: 'aud-078', organizationId: 'org-001', userId: 'usr-002', action: 'UPLOAD', entity: 'ClaimDocument', entityId: 'cdoc-011', description: 'Claim document uploaded: Oncologist Report for clm-004 (Lakshmi Iyer)', timestamp: '2024-03-25T10:30:00Z' },
  { id: 'aud-079', organizationId: 'org-001', userId: 'usr-002', action: 'UPLOAD', entity: 'ClaimDocument', entityId: 'cdoc-029', description: 'Claim document uploaded: Neurologist Report for clm-019 (Pallavi Jain)', timestamp: '2025-04-01T10:30:00Z' },

  // Access changes
  { id: 'aud-080', organizationId: 'org-001', userId: 'usr-001', action: 'UPDATE', entity: 'User', entityId: 'usr-005', description: 'User policy scope updated: Eve Patel — added pol-sav-003', timestamp: '2024-06-01T10:00:00Z' },
  { id: 'aud-081', organizationId: 'org-001', userId: 'usr-001', action: 'CREATE', entity: 'User', entityId: 'usr-007', description: 'User created: Grace Iyer (member portal access)', timestamp: '2024-04-01T09:25:00Z' },
  { id: 'aud-082', organizationId: 'org-001', userId: 'usr-001', action: 'CREATE', entity: 'User', entityId: 'usr-008', description: 'Insurer ops user onboarded: Henry Thomas (InsuranceCo)', timestamp: '2024-04-01T08:00:00Z' },

  // Coverage change
  { id: 'aud-083', organizationId: 'org-001', userId: 'usr-002', action: 'CREATE', entity: 'Endorsement', entityId: 'end-004', description: 'Coverage change submitted: END-2025-004 (Vivek Kapoor promoted to Plan A)', timestamp: '2025-02-01T10:00:00Z' },
  { id: 'aud-084', organizationId: 'org-001', userId: 'usr-008', action: 'APPLY', entity: 'Endorsement', entityId: 'end-004', description: 'Coverage change applied: Vivek Kapoor (EMP019) → Plan A effective 2025-02-01', timestamp: '2025-02-05T00:00:00Z' },

  // Service request actions
  { id: 'aud-085', organizationId: 'org-001', userId: 'usr-001', action: 'CREATE', entity: 'ServiceRequest', entityId: 'sr-002', description: 'Service request: SR-2025-002 (Annual fund statement — SAV FY 2024-25)', timestamp: '2025-05-10T10:00:00Z' },
  { id: 'aud-086', organizationId: 'org-001', userId: 'usr-008', action: 'RESOLVE', entity: 'ServiceRequest', entityId: 'sr-002', description: 'SR-2025-002 resolved. Annual fund statement uploaded (doc-028)', timestamp: '2025-05-15T14:00:00Z' },
  { id: 'aud-087', organizationId: 'org-001', userId: 'usr-002', action: 'CREATE', entity: 'ServiceRequest', entityId: 'sr-003', description: 'Service request: SR-2026-003 (member certificate — Nikhil Chopra)', timestamp: '2026-04-25T15:00:00Z' },
  { id: 'aud-088', organizationId: 'org-001', userId: 'usr-001', action: 'CREATE', entity: 'ServiceRequest', entityId: 'sr-005', description: 'Service request: SR-2026-005 (claim status — CLM-GTL-2026-006)', timestamp: '2026-04-29T11:00:00Z' },

  // Wallet top-up
  { id: 'aud-089', organizationId: 'org-001', userId: 'usr-001', action: 'CREDIT', entity: 'Wallet', entityId: 'wallet-001', description: 'CD account top-up: ₹50,000 credited to pol-gtl-001', timestamp: '2024-10-15T00:00:00Z' },
  { id: 'aud-090', organizationId: 'org-001', userId: 'usr-008', action: 'CREATE', entity: 'BankGuarantee', entityId: 'bg-001', description: 'Bank guarantee registered: BG-HDFC-2024-001 (₹10,00,000, HDFC, valid to 2027-03-31)', timestamp: '2024-04-01T00:00:00Z' },

  // Trust / compliance
  { id: 'aud-091', organizationId: 'org-001', userId: 'usr-001', action: 'UPLOAD', entity: 'CorporateDocument', entityId: 'corp-014', description: 'Trustee appointment letter uploaded for SAV Trust (2024–2027)', timestamp: '2024-04-01T00:00:00Z' },
  { id: 'aud-092', organizationId: 'org-001', userId: 'usr-001', action: 'UPLOAD', entity: 'CorporateDocument', entityId: 'corp-019', description: 'Master proposal form uploaded: GTL policy', timestamp: '2024-03-25T10:00:00Z' },
  { id: 'aud-093', organizationId: 'org-001', userId: 'usr-001', action: 'UPLOAD', entity: 'CorporateDocument', entityId: 'corp-020', description: 'Service agreement uploaded: Anaira Insurance (valid to 2027-03-31)', timestamp: '2024-04-01T00:00:00Z' },

  // Additional claim events
  { id: 'aud-094', organizationId: 'org-001', userId: 'usr-002', action: 'CREATE', entity: 'Claim', entityId: 'clm-009', description: 'Claim filed: CLM-GTL-2026-009 (TPD — Sunita Patel, SA ₹1.75 Cr)', timestamp: '2026-04-01T10:00:00Z' },
  { id: 'aud-095', organizationId: 'org-001', userId: 'usr-002', action: 'CREATE', entity: 'Claim', entityId: 'clm-013', description: 'Claim filed: CLM-SAV-2026-013 (Death — Gopal Das, SA ₹42L)', timestamp: '2026-04-20T10:00:00Z' },
  { id: 'aud-096', organizationId: 'org-001', userId: 'usr-008', action: 'UPDATE', entity: 'Claim', entityId: 'clm-017', description: 'GCL claim CLM-GCL-2025-017 approved. ₹16,00,000 approved for Sarita Dutta', timestamp: '2025-12-20T11:00:00Z' },

  // Member corrections
  { id: 'aud-097', organizationId: 'org-001', userId: 'usr-003', action: 'CREATE', entity: 'Endorsement', entityId: 'end-003', description: 'Correction submitted: END-2025-003 (mobile update — Vikram Singh)', timestamp: '2025-01-10T11:00:00Z' },
  { id: 'aud-098', organizationId: 'org-001', userId: 'usr-004', action: 'APPROVE', entity: 'Endorsement', entityId: 'end-003', description: 'Correction approved: END-2025-003 (mobile update — Vikram Singh)', timestamp: '2025-01-12T09:00:00Z' },

  // Recent logins
  { id: 'aud-099', organizationId: 'org-001', userId: 'usr-001', action: 'LOGIN', entity: 'User', entityId: 'usr-001', description: 'User login: Alice Sharma', timestamp: '2026-04-30T09:00:00Z' },
  { id: 'aud-100', organizationId: 'org-001', userId: 'usr-002', action: 'LOGIN', entity: 'User', entityId: 'usr-002', description: 'User login: Bob Mehta', timestamp: '2026-04-30T09:30:00Z' },
];
