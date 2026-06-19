/**
 * Sales Quote Detail — standalone mock data.
 * Represents a single GTL quote in NEGOTIATION stage with multiple versions
 * in different states, documents, and an audit log.
 */

export type QDVersionStatus =
  | 'DRAFT'
  | 'IN_PROGRESS'
  | 'REFERRED_UW'
  | 'REFERRED_PRICING'
  | 'RATED'
  | 'SUBMITTED'
  | 'SENT_TO_CLIENT'
  | 'ACCEPTED'
  | 'FINALIZED'
  | 'WITHDRAWN';

export interface QDVersion {
  id: string;
  versionNo: number;
  label: string;
  status: QDVersionStatus;
  uwPath: 'AUTO' | 'MANUAL' | 'NOT_EVALUATED';
  pricingPath: 'AUTO' | 'MANUAL' | 'NOT_EVALUATED';
  premiumInclGst?: number;
  referredAt?: string;
  referredBy?: string;
  sentAt?: string;
  acceptedAt?: string;
  finalizedAt?: string;
  withdrawnAt?: string;
  createdAt: string;
  planNames: string[];
  daysInCurrentState: number;
  note?: string;
}

export interface QDDocument {
  id: string;
  filename: string;
  type: 'QUOTE_SLIP' | 'MEMBER_CENSUS' | 'BROKER_CORRESPONDENCE' | 'RATE_CARD' | 'OTHER';
  uploadedBy: string;
  uploadedAt: string;
  sizeKb: number;
}

export type AuditEventType = 'STATUS_CHANGE' | 'DOCUMENT' | 'VERSION' | 'UW_PRICING' | 'NOTE';

export interface QDAuditEvent {
  id: string;
  eventType: AuditEventType;
  description: string;
  by: string;
  at: string;
  isNew?: boolean; // within last 24h
}

export interface SalesQuoteDetail {
  rfqId: string;
  quoteNo: string;
  status: 'DRAFT' | 'ACTIVE' | 'FINALIZED' | 'WITHDRAWN' | 'EXPIRED';
  scheme: 'GTL' | 'GCL' | 'GH';
  businessType: 'NEW' | 'RENEWAL' | 'TAKEOVER';
  employerName: string;
  industry: string;
  brokerName?: string;
  channel: string;
  effectiveDate: string;
  currency: 'INR';
  groupSize: number;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  expiresAt: string;
  activeVersionId: string;
  versions: QDVersion[];
  documents: QDDocument[];
  auditLog: QDAuditEvent[];
  // Quote Info fields
  sumAssuredBasis: string;
  coverPattern: string;
  livesCovered: string;
  participationType: string;
  uwMethod: string;
  quoteSegment: string;
}

export const SALES_QUOTE_DETAIL: SalesQuoteDetail = {
  rfqId: 'rfq-s001',
  quoteNo: 'GTL-2026-00201',
  status: 'ACTIVE',
  scheme: 'GTL',
  businessType: 'RENEWAL',
  employerName: 'Tata Motors Ltd',
  industry: 'Automotive',
  brokerName: 'Aon India',
  channel: 'Broker',
  effectiveDate: '2026-08-01',
  currency: 'INR',
  groupSize: 3200,
  createdBy: 'Arjun Sharma',
  createdAt: '2026-05-20T09:00:00Z',
  updatedAt: '2026-06-16T10:30:00Z',
  expiresAt: '2026-07-15T23:59:59Z',
  activeVersionId: 'v3-s001',
  versions: [
    {
      id: 'v3-s001',
      versionNo: 3,
      label: 'Broker Submission — Final',
      status: 'ACCEPTED',
      uwPath: 'AUTO',
      pricingPath: 'AUTO',
      premiumInclGst: 4218000,
      acceptedAt: '2026-06-16T10:30:00Z',
      createdAt: '2026-06-10T09:00:00Z',
      planNames: ['Grade A — Senior Staff', 'Grade B — Mid Level', 'Grade C — Staff'],
      daysInCurrentState: 2,
      note: 'Final submission incorporating broker feedback on Grade C loading.',
    },
    {
      id: 'v2-s001',
      versionNo: 2,
      label: 'Revised Submission',
      status: 'SENT_TO_CLIENT',
      uwPath: 'AUTO',
      pricingPath: 'MANUAL',
      premiumInclGst: 4450000,
      sentAt: '2026-06-08T11:00:00Z',
      createdAt: '2026-06-03T09:00:00Z',
      planNames: ['Grade A — Senior Staff', 'Grade B — Mid Level'],
      daysInCurrentState: 10,
      note: 'Revised after broker requested Grade C plan inclusion.',
    },
    {
      id: 'v1-s001',
      versionNo: 1,
      label: 'Initial Submission',
      status: 'WITHDRAWN',
      uwPath: 'MANUAL',
      pricingPath: 'MANUAL',
      premiumInclGst: 4780000,
      withdrawnAt: '2026-06-03T09:00:00Z',
      createdAt: '2026-05-20T09:00:00Z',
      planNames: ['Grade A — Senior Staff'],
      daysInCurrentState: 0,
      note: 'Superseded by v2.',
    },
  ],
  documents: [
    {
      id: 'doc-001',
      filename: 'GTL-2026-00201_QuoteSlip_v3.pdf',
      type: 'QUOTE_SLIP',
      uploadedBy: 'Arjun Sharma',
      uploadedAt: '2026-06-10T10:00:00Z',
      sizeKb: 248,
    },
    {
      id: 'doc-002',
      filename: 'TataMotors_Census_June2026.xlsx',
      type: 'MEMBER_CENSUS',
      uploadedBy: 'Arjun Sharma',
      uploadedAt: '2026-05-22T14:30:00Z',
      sizeKb: 1840,
    },
    {
      id: 'doc-003',
      filename: 'AonIndia_BrokerCorrespondence_v2.pdf',
      type: 'BROKER_CORRESPONDENCE',
      uploadedBy: 'Priya Nair',
      uploadedAt: '2026-06-05T09:15:00Z',
      sizeKb: 185,
    },
    {
      id: 'doc-004',
      filename: 'RateCard_GTL_LargeScheme_2026.pdf',
      type: 'RATE_CARD',
      uploadedBy: 'Actuarial System',
      uploadedAt: '2026-06-10T08:50:00Z',
      sizeKb: 412,
    },
  ],
  auditLog: [
    {
      id: 'evt-001',
      eventType: 'STATUS_CHANGE',
      description: 'v3 status changed to Accepted by Tata Motors Ltd',
      by: 'Client Portal',
      at: '2026-06-16T10:30:00Z',
      isNew: true,
    },
    {
      id: 'evt-002',
      eventType: 'STATUS_CHANGE',
      description: 'v3 sent to client — quote slip dispatched via broker',
      by: 'Arjun Sharma',
      at: '2026-06-15T14:00:00Z',
      isNew: true,
    },
    {
      id: 'evt-003',
      eventType: 'VERSION',
      description: 'v3 created — "Broker Submission — Final"',
      by: 'Arjun Sharma',
      at: '2026-06-10T09:00:00Z',
      isNew: false,
    },
    {
      id: 'evt-004',
      eventType: 'DOCUMENT',
      description: 'Quote slip for v3 uploaded (GTL-2026-00201_QuoteSlip_v3.pdf)',
      by: 'Arjun Sharma',
      at: '2026-06-10T10:00:00Z',
      isNew: false,
    },
    {
      id: 'evt-005',
      eventType: 'UW_PRICING',
      description: 'v3 auto-priced at ₹42,18,000 incl. GST (model factor 0.92)',
      by: 'Pricing Engine',
      at: '2026-06-10T09:45:00Z',
      isNew: false,
    },
    {
      id: 'evt-006',
      eventType: 'NOTE',
      description: 'Broker requested Grade C loading review — escalated to actuary',
      by: 'Arjun Sharma',
      at: '2026-06-06T11:30:00Z',
      isNew: false,
    },
    {
      id: 'evt-007',
      eventType: 'DOCUMENT',
      description: 'Broker correspondence uploaded (AonIndia_BrokerCorrespondence_v2.pdf)',
      by: 'Priya Nair',
      at: '2026-06-05T09:15:00Z',
      isNew: false,
    },
    {
      id: 'evt-008',
      eventType: 'STATUS_CHANGE',
      description: 'v2 sent to client',
      by: 'Arjun Sharma',
      at: '2026-06-08T11:00:00Z',
      isNew: false,
    },
    {
      id: 'evt-009',
      eventType: 'VERSION',
      description: 'v2 created — "Revised Submission"',
      by: 'Arjun Sharma',
      at: '2026-06-03T09:00:00Z',
      isNew: false,
    },
    {
      id: 'evt-010',
      eventType: 'STATUS_CHANGE',
      description: 'v1 withdrawn — superseded by v2',
      by: 'Arjun Sharma',
      at: '2026-06-03T09:00:00Z',
      isNew: false,
    },
    {
      id: 'evt-011',
      eventType: 'VERSION',
      description: 'v1 created — "Initial Submission"',
      by: 'Arjun Sharma',
      at: '2026-05-20T09:00:00Z',
      isNew: false,
    },
    {
      id: 'evt-012',
      eventType: 'DOCUMENT',
      description: 'Member census uploaded (TataMotors_Census_June2026.xlsx — 3,200 lives)',
      by: 'Arjun Sharma',
      at: '2026-05-22T14:30:00Z',
      isNew: false,
    },
  ],
  // Quote Info fields
  sumAssuredBasis: 'Grade Slab',
  coverPattern: 'Level Cover',
  livesCovered: 'Member Only',
  participationType: 'Compulsory',
  uwMethod: 'Simplified Underwriting',
  quoteSegment: 'Large',
};
