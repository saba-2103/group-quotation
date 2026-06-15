// Permission capability-check functions for the Group PAS – Group Quotation module.
// All checks are pure functions — no React hooks, safe to call anywhere.
// Each returns boolean; guards composed from these live in lib/withRouteGuard.tsx.

import type { UserRole, SalesLevel } from '@/types/group-pas/roles';

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** True for every role that is employed by the insurer (not an external party). */
export function isInternalRole(role: UserRole): boolean {
  return ['SALES', 'UNDERWRITER', 'ACTUARY', 'ACTUARIAL', 'OPS', 'ADMIN'].includes(role);
}

/** True for internal roles that are also "sales-facing" (sees deal pipeline). */
export function isSalesOrAbove(role: UserRole): boolean {
  return ['SALES', 'ADMIN', 'OPS', 'UNDERWRITER', 'ACTUARY', 'ACTUARIAL'].includes(role);
}

// ─── RFQ lifecycle ────────────────────────────────────────────────────────────

/** Create a new RFQ: SALES (any level) or ADMIN. */
export function canCreateRfq(role: UserRole, _level?: SalesLevel): boolean {
  return role === 'SALES' || role === 'ADMIN';
}

/** Hard-delete an RFQ: ADMIN only. */
export function canDeleteRfq(role: UserRole): boolean {
  return role === 'ADMIN';
}

/** Dispatch the RFQ packet to the PAS back-end: SALES L1+. */
export function canDispatch(role: UserRole, level?: SalesLevel): boolean {
  return role === 'SALES' && (level ?? 0) >= 1;
}

// ─── Version control ──────────────────────────────────────────────────────────

/** Freeze/lock a quote version: SALES L2+. */
export function canFreezeVersion(role: UserRole, level?: SalesLevel): boolean {
  return role === 'SALES' && (level ?? 0) >= 2;
}

// ─── Negotiation ──────────────────────────────────────────────────────────────

/** Accept a negotiation round and publish quote (quote-publish right): SALES L2+. */
export function canAcceptNegotiation(role: UserRole, level?: SalesLevel): boolean {
  return role === 'SALES' && (level ?? 0) >= 2;
}

// ─── Escalations ──────────────────────────────────────────────────────────────

/** Request an override / escalation: SALES (any level). Decision is supervisor's. */
export function canRequestOverride(role: UserRole): boolean {
  return role === 'SALES';
}

/** Approve or reject an escalation (supervisor/head authority): SALES L4+. */
export function canDecideEscalation(role: UserRole, level?: SalesLevel): boolean {
  return role === 'SALES' && (level ?? 0) >= 4;
}

// ─── Policy operations ────────────────────────────────────────────────────────

/** Bind / issue the policy: OPS only. */
export function canBind(role: UserRole): boolean {
  return role === 'OPS';
}

/** Apply a re-PAS patch (mid-term correction): OPS only. */
export function canRePasPatch(role: UserRole): boolean {
  return role === 'OPS';
}

/** Author / publish a plan template: ADMIN only. */
export function canAuthorTemplate(role: UserRole): boolean {
  return role === 'ADMIN';
}

/**
 * Edit policy flags directly: SALES L2+ or when the user holds an
 * approved escalation (passed in as `hasApprovedEscalation`).
 */
export function canEditPolicyFlags(
  role: UserRole,
  level?: SalesLevel,
  hasApprovedEscalation = false,
): boolean {
  return (role === 'SALES' && (level ?? 0) >= 2) || hasApprovedEscalation;
}

// ─── Pricing & clauses ────────────────────────────────────────────────────────

/** Publish a pricing run result: ACTUARIAL (or legacy ACTUARY). */
export function canPublishPricing(role: UserRole): boolean {
  return role === 'ACTUARIAL' || role === 'ACTUARY';
}

/** Add a clause carve-out to a plan: ACTUARIAL (or legacy ACTUARY). */
export function canAddClauseCarveout(role: UserRole): boolean {
  return role === 'ACTUARIAL' || role === 'ACTUARY';
}

// ─── Navigation visibility ────────────────────────────────────────────────────

/** Sales Cockpit is restricted to the Head of Sales and ADMIN. */
export function canViewSalesCockpit(role: UserRole, level?: SalesLevel): boolean {
  return role === 'ADMIN' || (role === 'SALES' && (level ?? 0) >= 5);
}
