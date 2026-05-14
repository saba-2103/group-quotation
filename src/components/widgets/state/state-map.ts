// Canonical label + colour-variant map for every entity state and reason
// across the Group PAS V1 modules. Single source of truth so list cells,
// detail headers, ActionBar tooltips, and ReasonBanner all share copy.
//
// Variant convention:
//   success      — terminal positive (FINALIZED, ACTIVE, ADDED, APPROVED)
//   info         — in-progress / mid-flight
//   warning      — awaiting input / approval
//   destructive  — terminal rejection / cancellation
//   secondary    — pre-flight (DRAFT, CREATED)
//   grey         — archived / withdrawn / expired

import type { BadgeProps } from '@/components/ui/badge';
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
import type { QuoteStatus } from '@/types/group-pas/quotation';

export type Variant = NonNullable<BadgeProps['variant']>;

export type EntityKind =
  | 'quote'
  | 'proposal'
  | 'policyMember'
  | 'policy'
  | 'member'
  | 'censusSubmission';

export interface StateMeta {
  label: string;
  variant: Variant;
}

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

const STATE_MAPS: Record<EntityKind, Record<string, StateMeta>> = {
  quote: QUOTE_STATES,
  proposal: PROPOSAL_STATES,
  policyMember: POLICY_MEMBER_STATES,
  policy: POLICY_STATES,
  member: MEMBER_STATES,
  censusSubmission: CENSUS_SUBMISSION_STATES,
};

const FALLBACK: StateMeta = { label: 'Unknown', variant: 'outline' };

export function getStateMeta(entity: EntityKind, state: string): StateMeta {
  return STATE_MAPS[entity]?.[state] ?? { ...FALLBACK, label: state || FALLBACK.label };
}

// ── Reasons ──

export interface ReasonMeta {
  label: string;
  variant: Variant;
}

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

export type ReasonGroup =
  | 'policyPending'
  | 'memberPending'
  | 'memberVoid'
  | 'memberCancellation';

const REASON_MAPS: Record<
  Exclude<ReasonGroup, 'memberCancellation'>,
  Record<string, ReasonMeta>
> = {
  policyPending: POLICY_PENDING_REASON,
  memberPending: MEMBER_PENDING_REASON,
  memberVoid: MEMBER_VOID_REASON,
};

export function getReasonMeta(
  group: ReasonGroup,
  value: string,
): ReasonMeta {
  if (group === 'memberCancellation') {
    // Free-text — caller passes the raw string through as the label.
    return { label: value, variant: 'destructive' };
  }
  return (
    REASON_MAPS[group]?.[value] ?? {
      label: value || 'Unknown reason',
      variant: 'outline',
    }
  );
}

// Convenience: which reason group applies for a given entity + state?
// Used by ReasonBanner to pick the right map without the schema saying it.
export function reasonGroupFor(
  entity: EntityKind,
  state: string,
  hasCancellationReason: boolean,
): ReasonGroup | undefined {
  if (entity === 'policy' && state === 'PENDING') return 'policyPending';
  if (entity === 'member' && state === 'PENDING') return 'memberPending';
  if (entity === 'member' && state === 'VOID') return 'memberVoid';
  if (entity === 'member' && state === 'CANCELLED' && hasCancellationReason)
    return 'memberCancellation';
  return undefined;
}
