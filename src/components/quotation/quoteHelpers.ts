/**
 * Shared display helpers for the Quotation module.
 */

import type {
  BusinessType,
  CoverageBasis,
  IntakeChannel,
  PremiumType,
  QuoteStatus,
  QuoteVersionStatus,
  SchemeType,
} from '@/types/group-pas/quotation-v2';

// ── QuoteStatus ──────────────────────────────────────────────────────────────

export const QUOTE_STATUS_LABEL: Record<QuoteStatus, string> = {
  DRAFT: 'Draft',
  ACTIVE: 'Active',
  FINALIZED: 'Finalized',
  WITHDRAWN: 'Withdrawn',
  EXPIRED: 'Expired',
};

export type BadgeVariant =
  | 'grey'
  | 'info'
  | 'success'
  | 'warning'
  | 'destructive'
  | 'secondary'
  | 'amber'
  | 'teal';

export const QUOTE_STATUS_VARIANT: Record<QuoteStatus, BadgeVariant> = {
  DRAFT: 'grey',
  ACTIVE: 'info',
  FINALIZED: 'success',
  WITHDRAWN: 'amber',
  EXPIRED: 'destructive',
};

// ── QuoteVersionStatus ────────────────────────────────────────────────────────

export const VERSION_STATUS_LABEL: Record<QuoteVersionStatus, string> = {
  DRAFT: 'Draft',
  REFERRED_MANUAL_UW: 'Referred — UW',
  EVALUATED: 'Evaluated',
  REFERRED_MANUAL_PRICING: 'Referred — Pricing',
  RATED: 'Rated',
  SUBMITTED: 'Submitted',
  SENT_TO_CLIENT: 'Sent to Client',
  ACCEPTED: 'Accepted',
  FINALIZED: 'Finalized',
  SUPERSEDED: 'Superseded',
  REJECTED: 'Rejected',
  WITHDRAWN: 'Withdrawn',
  EXPIRED: 'Expired',
};

export const VERSION_STATUS_VARIANT: Record<QuoteVersionStatus, BadgeVariant> = {
  DRAFT: 'grey',
  REFERRED_MANUAL_UW: 'amber',
  EVALUATED: 'teal',
  REFERRED_MANUAL_PRICING: 'amber',
  RATED: 'info',
  SUBMITTED: 'info',
  SENT_TO_CLIENT: 'info',
  ACCEPTED: 'success',
  FINALIZED: 'teal',
  SUPERSEDED: 'secondary',
  REJECTED: 'destructive',
  WITHDRAWN: 'amber',
  EXPIRED: 'destructive',
};

// ── SchemeType ────────────────────────────────────────────────────────────────

export const SCHEME_TYPE_LABEL: Record<SchemeType, string> = {
  GTL: 'GTL',
  GCL: 'GCL',
  GH: 'GH',
};

// ── BusinessType ──────────────────────────────────────────────────────────────

export const BUSINESS_TYPE_LABEL: Record<BusinessType, string> = {
  NEW_BUSINESS: 'New Business',
  RENEWAL: 'Renewal',
  ENDORSEMENT_REQUOTE: 'Endorsement Re-quote',
};

// ── IntakeChannel ─────────────────────────────────────────────────────────────

export const INTAKE_CHANNEL_LABEL: Record<IntakeChannel, string> = {
  SALES_CLICK: 'Sales (Portal)',
  PORTAL_UPLOAD: 'Portal Upload',
  API: 'API',
  INBOUND_MAILBOX: 'Inbound Mailbox',
  OFFLINE_PHYSICAL: 'Offline / Physical',
};
// ── CoverageBasis ─────────────────────────────────────────────────────

export const COVERAGE_BASIS_LABEL: Record<CoverageBasis, string> = {
  EMPLOYEE_ONLY: 'Employee Only',
  EMPLOYEE_SPOUSE: 'Employee + Spouse',
  EMPLOYEE_SPOUSE_CHILDREN: 'Employee + Spouse + Children',
  EMPLOYEE_SPOUSE_CHILDREN_PARENTS: 'Employee + Family (incl. Parents)',
  OTHER: 'Other',
};

// ── PremiumType ────────────────────────────────────────────────────────

export const PREMIUM_TYPE_LABEL: Record<PremiumType, string> = {
  ANNUAL: 'Annual',
  SINGLE: 'Single Premium',
};
// ── Currency / Money ──────────────────────────────────────────────────────────

export function formatMoney(amount: number, currency: string): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  }).format(amount);
}

// ── Date formatting ───────────────────────────────────────────────────────────

export function formatDate(isoDate: string): string {
  return new Date(isoDate).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

export function formatDateTime(isoDateTime: string): string {
  return new Date(isoDateTime).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}
