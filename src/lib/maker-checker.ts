// UI-only "send for approval" overlay helper for the V1 demo.
// Wraps mock-route persistence of `awaitingApproval` on Quote/Proposal records.
// Per CORE_MEMORY scope-locks, the backend has no maker-checker model in V1
// — once Keycloak + backend-enforced approval lands, delete this module and
// the underlying /awaiting-approval routes.

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
