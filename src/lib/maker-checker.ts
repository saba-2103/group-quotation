// UI-only "send for approval" overlay helper.
// Wraps mock-route persistence of `awaitingApproval` on Quote/Proposal records
// so the demo can show Maker → Checker hand-off without a backend approval
// model. Restored 2026-05-11 because real auth (Keycloak / Cerbos) is not yet
// shipping and the role-switcher + overlay is the only path to demo the
// segregation-of-duties story in CORE_MEMORY scope-locks. When the backend
// adopts the PAM approval pattern (RequestQuoteApprovalCommand + central
// Approval module), delete this module and the underlying /awaiting-approval
// routes — the action becomes a real api-mutation against the backend.

import { api } from '@/lib/api/client';

export type ApprovableEntity = 'quote' | 'proposal';

const BASE_BY_ENTITY: Record<ApprovableEntity, string> = {
  quote: '/api/quotation/quotes',
  proposal: '/api/issuance/proposals',
};

export function sendForApproval(
  entity: ApprovableEntity,
  id: string,
): Promise<void> {
  return api.post<void>(`${BASE_BY_ENTITY[entity]}/${id}/awaiting-approval`);
}

export function clearApproval(
  entity: ApprovableEntity,
  id: string,
): Promise<void> {
  return api.del<void>(`${BASE_BY_ENTITY[entity]}/${id}/awaiting-approval`);
}
