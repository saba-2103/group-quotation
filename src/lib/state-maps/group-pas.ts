// Domain registration for Group PAS V1 state & reason maps.
//
// Imported once at app boot (from src/components/providers.tsx) and once per
// Jest worker (from src/setupTests.ts) so the framework state-map registry
// (src/components/widgets/state/state-map.ts) sees the GP entity vocabularies
// before StateBadge / ReasonBanner / column cell renderers ask for them.
//
// This is the framework↔domain seam #57 introduced: state-map.ts is generic
// (EntityKind = string, empty registry), and each domain ships a
// state-map.<domain>.ts module that self-registers its data at module load.
//
// Variant convention:
//   success      — terminal positive (FINALIZED, ACTIVE, ADDED, APPROVED)
//   info         — in-progress / mid-flight
//   warning      — awaiting input / approval
//   destructive  — terminal rejection / cancellation
//   secondary    — pre-flight (DRAFT, CREATED)
//   grey         — archived / withdrawn / expired

import {
  registerReasonGroupResolver,
  registerReasonMap,
  registerStateMap,
  type ReasonMeta,
  type StateMeta,
} from '@/components/widgets/state/state-map';
import type {
  CensusSubmissionStatus,
  PolicyMemberState,
  ProposalState,
} from '@/types/group-pas/issuance';
import type {
  MemberPendingReason,
  MemberState,
  MemberVoidReason,
  PolicyPendingReason,
  PolicyState,
} from '@/types/group-pas/policy-admin';
import type { MemberQuoteStatus, QuoteStatus } from '@/types/group-pas/quotation';

// ── State maps ────────────────────────────────────────────────────────────

const MEMBER_QUOTE_STATES: Record<MemberQuoteStatus, StateMeta> = {
  DRAFT: { label: 'Draft', variant: 'secondary' },
  SUBMITTED: { label: 'Submitted', variant: 'info' },
  FINALIZED: { label: 'Finalized', variant: 'success' },
};

const QUOTE_STATES: Record<QuoteStatus, StateMeta> = {
  DRAFT: { label: 'Draft', variant: 'secondary' },
  SUBMITTED: { label: 'Submitted', variant: 'info' },
  SENT_TO_CLIENT: { label: 'Sent to client', variant: 'info' },
  ACCEPTED: { label: 'Accepted', variant: 'teal' },
  REJECTED: { label: 'Rejected', variant: 'destructive' },
  WITHDRAWN: { label: 'Withdrawn', variant: 'grey' },
  EXPIRED: { label: 'Expired', variant: 'grey' },
  FINALIZED: { label: 'Finalized', variant: 'success' },
};

const PROPOSAL_STATES: Record<ProposalState, StateMeta> = {
  DRAFT: { label: 'Draft', variant: 'secondary' },
  SUBMITTED: { label: 'Submitted', variant: 'info' },
  FINALIZED: { label: 'Finalized', variant: 'teal' },
  POLICY_CREATED: { label: 'Policy created', variant: 'success' },
  CANCELLED: { label: 'Cancelled', variant: 'destructive' },
};

const POLICY_MEMBER_STATES: Record<PolicyMemberState, StateMeta> = {
  CREATED: { label: 'Created', variant: 'secondary' },
  PRICED: { label: 'Priced', variant: 'info' },
  MAF_PENDING: { label: 'MAF pending', variant: 'warning' },
  MAF_CONFIRMED: { label: 'MAF confirmed', variant: 'teal' },
  CLASSIFYING: { label: 'Classifying', variant: 'info' },
  APPROVED: { label: 'Approved', variant: 'teal' },
  REPAIR_PENDING: { label: 'Repair pending', variant: 'warning' },
  REFERRED_TO_UW: { label: 'Referred to UW', variant: 'warning' },
  REJECTED: { label: 'Rejected', variant: 'destructive' },
  SENT_FOR_ISSUANCE: { label: 'Sent for issuance', variant: 'info' },
  ADDED: { label: 'Added to policy', variant: 'success' },
  ARCHIVED: { label: 'Archived', variant: 'grey' },
};

const POLICY_STATES: Record<PolicyState, StateMeta> = {
  CREATED: { label: 'Created', variant: 'secondary' },
  PENDING: { label: 'Pending', variant: 'warning' },
  ACTIVE: { label: 'Active', variant: 'success' },
  CANCELLED: { label: 'Cancelled', variant: 'destructive' },
};

const MEMBER_STATES: Record<MemberState, StateMeta> = {
  PENDING: { label: 'Pending', variant: 'warning' },
  ACTIVE: { label: 'Active', variant: 'success' },
  VOID: { label: 'Void', variant: 'destructive' },
  CANCELLED: { label: 'Cancelled', variant: 'destructive' },
};

const CENSUS_SUBMISSION_STATES: Record<CensusSubmissionStatus, StateMeta> = {
  INITIATED: { label: 'Initiated', variant: 'secondary' },
  INGESTED: { label: 'Ingested', variant: 'info' },
  SUBMITTED: { label: 'Submitted', variant: 'info' },
  COMPLETED: { label: 'Completed', variant: 'success' },
  FAILED: { label: 'Failed', variant: 'destructive' },
};

// ── Reason maps ───────────────────────────────────────────────────────────

const POLICY_PENDING_REASON: Record<PolicyPendingReason, ReasonMeta> = {
  AWAITING_MIN_MEMBERS: {
    label: 'Awaiting minimum members for activation',
    variant: 'warning',
  },
  AWAITING_COMPLIANCE: {
    label: 'Awaiting compliance review',
    variant: 'warning',
  },
};

const MEMBER_PENDING_REASON: Record<MemberPendingReason, ReasonMeta> = {
  PENDING_FLOAT_RESERVATION: {
    label: 'Awaiting float reservation',
    variant: 'warning',
  },
  PENDING_APPROVAL: {
    label: 'Awaiting approval',
    variant: 'warning',
  },
  PENDING_POLICY_ACTIVATION: {
    label: 'Awaiting policy activation',
    variant: 'warning',
  },
};

const MEMBER_VOID_REASON: Record<MemberVoidReason, ReasonMeta> = {
  FLOAT_UNAVAILABLE: { label: 'Float unavailable', variant: 'destructive' },
  APPROVAL_REJECTED: { label: 'Approval rejected', variant: 'destructive' },
  POLICY_CANCELLED: { label: 'Policy cancelled', variant: 'destructive' },
  WITHDRAWN_BY_PROPOSER: {
    label: 'Withdrawn by proposer',
    variant: 'destructive',
  },
};

// ── Register at module load (side effect) ─────────────────────────────────

registerStateMap('quote', QUOTE_STATES);
registerStateMap('memberQuote', MEMBER_QUOTE_STATES);
registerStateMap('proposal', PROPOSAL_STATES);
registerStateMap('policyMember', POLICY_MEMBER_STATES);
registerStateMap('policy', POLICY_STATES);
registerStateMap('member', MEMBER_STATES);
registerStateMap('censusSubmission', CENSUS_SUBMISSION_STATES);

registerReasonMap('policyPending', POLICY_PENDING_REASON);
registerReasonMap('memberPending', MEMBER_PENDING_REASON);
registerReasonMap('memberVoid', MEMBER_VOID_REASON);
// memberCancellation is free-text — backend passes the cancellation reason
// verbatim, no enum to map.
registerReasonMap('memberCancellation', {}, { freeText: true });

registerReasonGroupResolver((entity, state, hasFreeText) => {
  if (entity === 'policy' && state === 'PENDING') return 'policyPending';
  if (entity === 'member' && state === 'PENDING') return 'memberPending';
  if (entity === 'member' && state === 'VOID') return 'memberVoid';
  if (entity === 'member' && state === 'CANCELLED' && hasFreeText) {
    return 'memberCancellation';
  }
  return undefined;
});
