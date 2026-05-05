export type MPHRole = 'super-admin' | 'maker' | 'approver' | 'viewer' | 'member' | 'insurer-ops';

export type ProductLine = 'GTL' | 'GCL' | 'Savings' | 'ULIP' | 'Annuity' | 'Pension';

export type PolicyStatus = 'Active' | 'Renewing' | 'Lapsed' | 'Cancelled';

export type MemberStatus = 'Active' | 'Pending Approval' | 'Pending Exit' | 'Exited' | 'Rejected' | 'Deceased';

export type ClaimStatus =
  | 'Draft'
  | 'Submitted'
  | 'Documents Pending'
  | 'Under Assessment'
  | 'Query Raised'
  | 'Investigation'
  | 'Approved'
  | 'Part Paid'
  | 'Paid'
  | 'Rejected'
  | 'Closed';

export type EndorsementStatus =
  | 'Draft'
  | 'Pending Approval'
  | 'Submitted'
  | 'Under Review'
  | 'Approved'
  | 'Applied'
  | 'Query Raised'
  | 'Rejected'
  | 'Cancelled';

export type RenewalStatus =
  | 'Upcoming'
  | 'Open'
  | 'Census In Progress'
  | 'Census Locked'
  | 'Quote Pending'
  | 'Quote Received'
  | 'Under Approval'
  | 'Accepted'
  | 'Issued'
  | 'Closed';

export type BulkJobStatus =
  | 'Received'
  | 'Parsing'
  | 'Structure Failed'
  | 'Validating'
  | 'Validated'
  | 'Approval Pending'
  | 'Applying'
  | 'Partially Applied'
  | 'Applied'
  | 'Repair Pending'
  | 'Rejected'
  | 'Cancelled';

// ─── Organization ────────────────────────────────────────────────────────────

export interface Organization {
  id: string;
  name: string;
  pan: string;
  gst: string;
  cin: string;
  entityType: 'company' | 'trust' | 'society' | 'partnership';
  address: string;
  city: string;
  state: string;
  pincode: string;
  assignedPolicies: string[];
}

// ─── Policy ──────────────────────────────────────────────────────────────────

export interface Plan {
  id: string;
  name: string;
  coverageType: string;
  sumAssuredBasis: 'Flat' | 'Salary Multiple' | 'Loan Outstanding';
  sumAssured?: number;
  salaryMultiple?: number;
  riders: string[];
  waitingPeriodDays: number;
}

export interface Policy {
  id: string;
  policyNumber: string;
  organizationId: string;
  productLine: ProductLine;
  schemeCode: string;
  schemeName: string;
  status: PolicyStatus;
  commencementDate: string;
  expiryDate: string;
  annualRenewalDate: string;
  premiumMode: 'Annual' | 'Half-Yearly' | 'Quarterly' | 'Monthly';
  billingStatus: 'Current' | 'Overdue' | 'Grace' | 'Upcoming';
  totalLives: number;
  activeLives: number;
  plans: Plan[];
  sumInsured: number;
  annualPremium: number;
}

// ─── Member ──────────────────────────────────────────────────────────────────

export interface Member {
  id: string;
  policyId: string;
  organizationId: string;
  employeeId: string;
  title: 'Mr' | 'Mrs' | 'Ms' | 'Dr';
  firstName: string;
  lastName: string;
  dob: string;
  gender: 'Male' | 'Female' | 'Other';
  mobile: string;
  email: string;
  pan: string;
  aadhaarLast4: string;
  doj: string;
  department: string;
  grade: string;
  location: string;
  memberClass: string;
  status: MemberStatus;
  lwdDate?: string;
  exitReason?: string;
  coverageId: string;
  createdAt: string;
  updatedAt: string;
  requestRef?: string;
  makerId?: string;
  approverId?: string;
}

// ─── Nominee ─────────────────────────────────────────────────────────────────

export interface Nominee {
  id: string;
  memberId: string;
  name: string;
  relationship: string;
  sharePercent: number;
  dob?: string;
  mobile?: string;
  effectiveDate: string;
  proofDocId?: string;
}

// ─── Endorsement ─────────────────────────────────────────────────────────────

export interface Endorsement {
  id: string;
  policyId: string;
  organizationId: string;
  type: 'member-addition' | 'member-exit' | 'member-correction' | 'coverage-change' | 'nominee-update' | 'rider-change';
  status: EndorsementStatus;
  requestRef: string;
  affectedMemberIds: string[];
  changes: Record<string, any>;
  effectiveDate: string;
  makerId: string;
  approverId?: string;
  submittedAt?: string;
  approvedAt?: string;
  appliedAt?: string;
  rejectedAt?: string;
  rejectionReason?: string;
  queryNote?: string;
  createdAt: string;
  updatedAt: string;
}

// ─── Claim ───────────────────────────────────────────────────────────────────

export type ClaimType =
  | 'Death'
  | 'Accidental Death'
  | 'TPD'
  | 'Critical Illness'
  | 'Retirement Gratuity'
  | 'Disability'
  | 'Withdrawal';

export interface Claim {
  id: string;
  policyId: string;
  organizationId: string;
  memberId: string;
  claimNumber: string;
  claimType: ClaimType;
  status: ClaimStatus;
  // Event details
  causeOfDeath?: string;
  dateOfDeath?: string;
  disabilityType?: string;
  dateOfDisability?: string;
  illnessType?: string;
  diagnosisDate?: string;
  dateOfRetirement?: string;
  // Claimant
  claimantName: string;
  claimantRelationship: string;
  claimantMobile: string;
  // Financials
  sumAssured?: number;
  claimAmount?: number;
  approvedAmount?: number;
  paidAmount?: number;
  // Dates
  submittedAt?: string;
  assessedAt?: string;
  approvedAt?: string;
  paidAt?: string;
  rejectedAt?: string;
  rejectionReason?: string;
  pendingDocuments?: string[];
  // Actors
  makerId: string;
  approverId?: string;
  createdAt: string;
  updatedAt: string;
}

// ─── Claim Document ──────────────────────────────────────────────────────────

export interface ClaimDocument {
  id: string;
  claimId: string;
  name: string;
  type: string;
  status: 'Pending' | 'Accepted' | 'Under Review' | 'Rejected';
  uploadedAt?: string;
  uploadedBy?: string;
  fileSize?: number;
  mimeType?: string;
}

// ─── Renewal ─────────────────────────────────────────────────────────────────

export interface RenewalDocument {
  name: string;
  type: string;
  uploadedAt: string;
}

export interface Renewal {
  id: string;
  policyId: string;
  organizationId: string;
  renewalYear: number;
  status: RenewalStatus;
  censusLockedAt?: string;
  censusLives?: number;
  activeLives?: number;
  exitedLives?: number;
  addedLives?: number;
  annualPremium: number | null;
  previousPremium?: number;
  changePercent?: number;
  quoteReceivedAt?: string;
  quoteExpiryDate?: string;
  acceptedAt?: string;
  issuedAt?: string;
  effectiveDate: string;
  expiryDate: string;
  documents: RenewalDocument[];
  makerId?: string;
  approverId?: string;
  createdAt: string;
  updatedAt: string;
}

// ─── Billing ─────────────────────────────────────────────────────────────────

export interface BillingStatement {
  id: string;
  policyId: string;
  organizationId: string;
  statementNumber: string;
  periodFrom: string;
  periodTo: string;
  premiumDue: number;
  premiumPaid: number;
  adjustments: number;
  balance: number;
  status: 'Paid' | 'Overdue' | 'Current' | 'Upcoming' | 'Partial';
  dueDate: string;
  paidDate?: string;
  mode: 'Annual' | 'Half-Yearly' | 'Quarterly' | 'Monthly';
  transactionRef?: string;
  createdAt: string;
  updatedAt: string;
}

// ─── Document ────────────────────────────────────────────────────────────────

export interface Document {
  id: string;
  policyId: string;
  organizationId: string;
  memberId?: string;
  claimId?: string;
  category: string;
  name: string;
  type: string;
  status: 'Active' | 'Archived' | 'Pending Review';
  uploadedAt: string;
  uploadedBy: string;
  fileSize: number;
  mimeType: string;
  version: number;
  expiryDate?: string;
}

// ─── Corporate Document ──────────────────────────────────────────────────────

export interface CorporateDocument {
  id: string;
  organizationId: string;
  name: string;
  category: string;
  type: string;
  status: 'Active' | 'Archived' | 'Expired';
  expiryDate: string | null;
  uploadedAt: string;
  uploadedBy: string;
  fileSize: number;
  mimeType: string;
}

// ─── Bank Profile ─────────────────────────────────────────────────────────────

export interface BankProfileDocument {
  name: string;
  type: string;
  uploadedAt: string;
}

export interface BankProfile {
  id: string;
  organizationId: string;
  policyIds: string[];
  accountName: string;
  accountNumber: string;
  bankName: string;
  branchName: string;
  ifsc: string;
  accountType: 'Current' | 'Savings';
  status: 'Verified' | 'Pending Verification' | 'Rejected';
  isPrimary: boolean;
  verifiedAt?: string;
  verifiedBy?: string;
  documents: BankProfileDocument[];
  createdAt: string;
  updatedAt: string;
}

// ─── Wallet ──────────────────────────────────────────────────────────────────

export interface Wallet {
  id: string;
  policyId: string;
  organizationId: string;
  type: 'CD' | 'Fund';
  balance: number;
  currency: string;
  status: 'Active' | 'Frozen' | 'Closed';
  lastUpdatedAt: string;
  createdAt: string;
}

export interface WalletLedgerEntry {
  id: string;
  walletId: string;
  policyId: string;
  type: 'Credit' | 'Debit';
  amount: number;
  balance: number;
  description: string;
  referenceId: string | null;
  transactionDate: string;
}

export interface BankGuarantee {
  id: string;
  policyId: string;
  organizationId: string;
  bgNumber: string;
  bankName: string;
  amount: number;
  currency: string;
  issuedDate: string;
  expiryDate: string;
  status: 'Active' | 'Expired' | 'Invoked';
  purpose: string;
  documentUrl: string | null;
  createdAt: string;
  updatedAt: string;
}

// ─── Setup Case ───────────────────────────────────────────────────────────────

export interface SetupStep {
  id: string;
  name: string;
  status: 'Pending' | 'In Progress' | 'Completed' | 'Blocked';
  completedAt?: string;
  note?: string;
}

export interface SetupCase {
  id: string;
  organizationId: string;
  caseRef: string;
  productLine: ProductLine;
  status: 'In Progress' | 'Submitted' | 'Completed' | 'Rejected';
  steps: SetupStep[];
  assignedPolicyId?: string;
  makerId?: string;
  approverId?: string;
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
}

// ─── Users ───────────────────────────────────────────────────────────────────

export interface MPHUser {
  id: string;
  organizationId: string;
  email: string;
  name: string;
  role: MPHRole;
  status: 'Active' | 'Invited' | 'Disabled';
  mfaEnabled: boolean;
  policyScope: string[];
  password: string;
  lastLogin?: string;
  invitedAt?: string;
}

// ─── Audit Log ────────────────────────────────────────────────────────────────

export interface AuditEntry {
  id: string;
  organizationId: string;
  userId: string;
  action: string;
  entity: string;
  entityId: string | null;
  description: string;
  timestamp: string;
  policyId?: string;
}

// ─── Task ────────────────────────────────────────────────────────────────────

export interface Task {
  id: string;
  organizationId: string;
  policyId?: string;
  assignedTo?: string;
  type: string;
  entityId: string | null;
  title: string;
  description: string;
  priority: 'Low' | 'Medium' | 'High' | 'Critical';
  status: 'Open' | 'In Progress' | 'Completed' | 'Overdue';
  dueDate: string;
  completedAt?: string;
  createdAt: string;
  updatedAt: string;
}

// ─── Notification ─────────────────────────────────────────────────────────────

export interface Notification {
  id: string;
  organizationId: string;
  userId: string;
  type: string;
  title: string;
  message: string;
  severity: 'Info' | 'Low' | 'Medium' | 'High' | 'Critical';
  entityId: string | null;
  policyId: string | null;
  isRead: boolean;
  createdAt: string;
}

// ─── Service Request ──────────────────────────────────────────────────────────

export interface ServiceRequest {
  id: string;
  organizationId: string;
  policyId?: string;
  requestRef: string;
  type: string;
  status: 'Open' | 'In Progress' | 'Resolved' | 'Closed';
  subject: string;
  description: string;
  priority: 'Low' | 'Medium' | 'High' | 'Critical';
  submittedBy: string;
  resolvedBy?: string;
  submittedAt: string;
  resolvedAt?: string;
  resolutionNote?: string;
  createdAt: string;
  updatedAt: string;
}
