/**
 * Sales Dashboard — standalone mock data.
 * All dates are expressed as ISO strings relative to the demo "today" of 2026-06-18.
 * This file is self-contained and does not depend on the rfq store or types/index.
 */

export type SalesPipelineStatus =
  | 'DRAFT'
  | 'IN_PROGRESS'
  | 'REFERRED_UW'
  | 'REFERRED_PRICING'
  | 'RATED'
  | 'SUBMITTED'
  | 'SENT_TO_CLIENT'
  | 'ACCEPTED'
  | 'FINALIZED'
  | 'WITHDRAWN'
  | 'EXPIRED';

export type SchemeChip = 'GTL' | 'GCL' | 'GH';

export interface SalesPipelineQuote {
  rfqId: string;
  employerName: string;
  scheme: SchemeChip;
  quoteNo: string;
  activeVersionLabel: string;
  pipelineStatus: SalesPipelineStatus;
  premiumInclGst?: number;    // latest priced premium
  sentAt?: string;            // ISO — when SENT_TO_CLIENT
  referredAt?: string;        // ISO — when referred to UW or pricing
  submittedAt?: string;       // ISO — when SUBMITTED to insurer
  acceptedAt?: string;        // ISO — when ACCEPTED by client
  expiresAt: string;          // ISO — quote expiry
  createdAt: string;          // ISO
  finalizedAt?: string;       // ISO — when FINALIZED/ISSUED
  finalPremium?: number;      // for FINALIZED records
  ownerId: string;
}

// ── Current user ──────────────────────────────────────────────────────────────
export const CURRENT_USER = { userId: 'usr-101', name: 'Arjun Sharma' };

// ── Pipeline quotes (all owned by usr-101 = Arjun Sharma) ────────────────────
export const SALES_PIPELINE_QUOTES: SalesPipelineQuote[] = [
  // 1. ACCEPTED — highest priority
  {
    rfqId: 'rfq-s001',
    employerName: 'Tata Motors Ltd',
    scheme: 'GTL',
    quoteNo: 'GTL-2026-00201',
    activeVersionLabel: 'V3',
    pipelineStatus: 'ACCEPTED',
    premiumInclGst: 4218000,
    acceptedAt: '2026-06-16T10:30:00Z',
    expiresAt: '2026-07-15T23:59:59Z',
    createdAt: '2026-05-20T09:00:00Z',
    ownerId: 'usr-101',
  },
  // 2. SENT_TO_CLIENT >5 days — follow up
  {
    rfqId: 'rfq-s002',
    employerName: 'Infosys Ltd',
    scheme: 'GTL',
    quoteNo: 'GTL-2026-00187',
    activeVersionLabel: 'V2',
    pipelineStatus: 'SENT_TO_CLIENT',
    premiumInclGst: 7854000,
    sentAt: '2026-06-12T14:00:00Z',
    expiresAt: '2026-07-10T23:59:59Z',
    createdAt: '2026-05-10T09:00:00Z',
    ownerId: 'usr-101',
  },
  // 3. RATED — ready to submit
  {
    rfqId: 'rfq-s003',
    employerName: 'Wipro Ltd',
    scheme: 'GCL',
    quoteNo: 'GCL-2026-00098',
    activeVersionLabel: 'V1',
    pipelineStatus: 'RATED',
    premiumInclGst: 1836000,
    expiresAt: '2026-07-05T23:59:59Z',
    createdAt: '2026-06-01T09:00:00Z',
    ownerId: 'usr-101',
  },
  // 4. REFERRED_UW >3 days — referral overdue
  {
    rfqId: 'rfq-s004',
    employerName: 'Reliance Industries',
    scheme: 'GTL',
    quoteNo: 'GTL-2026-00175',
    activeVersionLabel: 'V2',
    pipelineStatus: 'REFERRED_UW',
    referredAt: '2026-06-14T09:00:00Z',
    expiresAt: '2026-07-20T23:59:59Z',
    createdAt: '2026-05-25T09:00:00Z',
    ownerId: 'usr-101',
  },
  // 5. REFERRED_PRICING >3 days — referral overdue
  {
    rfqId: 'rfq-s005',
    employerName: 'HDFC Bank Ltd',
    scheme: 'GH',
    quoteNo: 'GH-2026-00055',
    activeVersionLabel: 'V1',
    pipelineStatus: 'REFERRED_PRICING',
    referredAt: '2026-06-13T11:00:00Z',
    expiresAt: '2026-07-18T23:59:59Z',
    createdAt: '2026-06-02T09:00:00Z',
    ownerId: 'usr-101',
  },
  // 6. SUBMITTED — send to client
  {
    rfqId: 'rfq-s006',
    employerName: 'Mahindra & Mahindra',
    scheme: 'GTL',
    quoteNo: 'GTL-2026-00163',
    activeVersionLabel: 'V2',
    pipelineStatus: 'SUBMITTED',
    premiumInclGst: 3127000,
    submittedAt: '2026-06-17T15:00:00Z',
    expiresAt: '2026-07-25T23:59:59Z',
    createdAt: '2026-05-28T09:00:00Z',
    ownerId: 'usr-101',
  },
  // 7. Expiring in 3 days — non-terminal
  {
    rfqId: 'rfq-s007',
    employerName: 'Zomato Ltd',
    scheme: 'GTL',
    quoteNo: 'GTL-2026-00192',
    activeVersionLabel: 'V1',
    pipelineStatus: 'IN_PROGRESS',
    expiresAt: '2026-06-21T23:59:59Z',
    createdAt: '2026-06-05T09:00:00Z',
    ownerId: 'usr-101',
  },
  // ── Active / not-in-action-list ──────────────────────────────────────────
  {
    rfqId: 'rfq-s008',
    employerName: 'HCL Technologies',
    scheme: 'GTL',
    quoteNo: 'GTL-2026-00144',
    activeVersionLabel: 'V1',
    pipelineStatus: 'SENT_TO_CLIENT',
    premiumInclGst: 2915000,
    sentAt: '2026-06-17T09:00:00Z', // only 1 day ago — no follow-up yet
    expiresAt: '2026-08-01T23:59:59Z',
    createdAt: '2026-05-18T09:00:00Z',
    ownerId: 'usr-101',
  },
  {
    rfqId: 'rfq-s009',
    employerName: 'Adani Ports',
    scheme: 'GCL',
    quoteNo: 'GCL-2026-00071',
    activeVersionLabel: 'V1',
    pipelineStatus: 'DRAFT',
    expiresAt: '2026-08-15T23:59:59Z',
    createdAt: '2026-06-14T09:00:00Z',
    ownerId: 'usr-101',
  },
  {
    rfqId: 'rfq-s010',
    employerName: 'Bharti Airtel',
    scheme: 'GTL',
    quoteNo: 'GTL-2026-00133',
    activeVersionLabel: 'V2',
    pipelineStatus: 'IN_PROGRESS',
    expiresAt: '2026-07-28T23:59:59Z',
    createdAt: '2026-05-30T09:00:00Z',
    ownerId: 'usr-101',
  },
  {
    rfqId: 'rfq-s011',
    employerName: 'Sun Pharma',
    scheme: 'GH',
    quoteNo: 'GH-2026-00041',
    activeVersionLabel: 'V1',
    pipelineStatus: 'REFERRED_UW',
    referredAt: '2026-06-17T09:00:00Z', // only 1 day — not overdue yet
    expiresAt: '2026-07-22T23:59:59Z',
    createdAt: '2026-06-08T09:00:00Z',
    ownerId: 'usr-101',
  },
  // ── Expiring soon (7–14 days) ────────────────────────────────────────────
  {
    rfqId: 'rfq-s012',
    employerName: 'Larsen & Toubro',
    scheme: 'GTL',
    quoteNo: 'GTL-2026-00118',
    activeVersionLabel: 'V3',
    pipelineStatus: 'IN_PROGRESS',
    premiumInclGst: 5640000,
    expiresAt: '2026-06-25T23:59:59Z', // 7 days
    createdAt: '2026-05-12T09:00:00Z',
    ownerId: 'usr-101',
  },
  {
    rfqId: 'rfq-s013',
    employerName: 'Titan Company',
    scheme: 'GTL',
    quoteNo: 'GTL-2026-00099',
    activeVersionLabel: 'V2',
    pipelineStatus: 'SENT_TO_CLIENT',
    premiumInclGst: 1298000,
    sentAt: '2026-06-16T09:00:00Z', // 2 days ago
    expiresAt: '2026-06-28T23:59:59Z', // 10 days
    createdAt: '2026-05-08T09:00:00Z',
    ownerId: 'usr-101',
  },
  // ── FINALIZED (recent wins) ───────────────────────────────────────────────
  {
    rfqId: 'rfq-s020',
    employerName: 'Bajaj Finance Ltd',
    scheme: 'GTL',
    quoteNo: 'GTL-2026-00081',
    activeVersionLabel: 'V2',
    pipelineStatus: 'FINALIZED',
    finalizedAt: '2026-06-13T10:00:00Z',
    finalPremium: 3870000,
    expiresAt: '2026-09-01T23:59:59Z',
    createdAt: '2026-04-20T09:00:00Z',
    ownerId: 'usr-101',
  },
  {
    rfqId: 'rfq-s021',
    employerName: 'Asian Paints Ltd',
    scheme: 'GCL',
    quoteNo: 'GCL-2026-00038',
    activeVersionLabel: 'V1',
    pipelineStatus: 'FINALIZED',
    finalizedAt: '2026-06-08T11:00:00Z',
    finalPremium: 1245000,
    expiresAt: '2026-09-01T23:59:59Z',
    createdAt: '2026-04-15T09:00:00Z',
    ownerId: 'usr-101',
  },
  {
    rfqId: 'rfq-s022',
    employerName: 'ITC Ltd',
    scheme: 'GTL',
    quoteNo: 'GTL-2026-00066',
    activeVersionLabel: 'V3',
    pipelineStatus: 'FINALIZED',
    finalizedAt: '2026-05-29T14:00:00Z',
    finalPremium: 6180000,
    expiresAt: '2026-09-01T23:59:59Z',
    createdAt: '2026-04-01T09:00:00Z',
    ownerId: 'usr-101',
  },
  // ── WITHDRAWN / EXPIRED (for bind rate calc) ─────────────────────────────
  {
    rfqId: 'rfq-s030',
    employerName: 'Nykaa Ltd',
    scheme: 'GTL',
    quoteNo: 'GTL-2026-00077',
    activeVersionLabel: 'V1',
    pipelineStatus: 'WITHDRAWN',
    expiresAt: '2026-06-10T23:59:59Z',
    createdAt: '2026-04-25T09:00:00Z',
    ownerId: 'usr-101',
  },
  {
    rfqId: 'rfq-s031',
    employerName: 'Paytm (One97)',
    scheme: 'GCL',
    quoteNo: 'GCL-2026-00029',
    activeVersionLabel: 'V1',
    pipelineStatus: 'EXPIRED',
    expiresAt: '2026-06-05T23:59:59Z',
    createdAt: '2026-04-10T09:00:00Z',
    ownerId: 'usr-101',
  },
  // ── Last month comparison data (for trend arrows) ─────────────────────────
  // These would normally come from a separate query; here we just encode the deltas
];

// ── Last-month metrics (for trend comparison) ─────────────────────────────────
export const LAST_MONTH_METRICS = {
  quotesCreated: 6,
  bindRate: 50,      // %
  avgCycleTimeDays: 28,
  pipelineValue: 18200000, // ₹
};
