// Typed API client for the Group PAS – Group Quotation module.
// All fetch calls go through this file. No direct fetch() in components.

import type {
  RfqBase,
  RfqBundle,
  Plan,
  Document,
  HandoffTask,
  RfqStatus,
  Subsidiary,
  Member,
  CensusSummary,
  ClaimsExperience,
  HeadcountData,
} from '@/lib/types';

const BASE = '/api';

async function request<T>(
  path: string,
  init: RequestInit = {}
): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    headers: { 'Content-Type': 'application/json', ...init.headers },
    ...init,
  });
  if (!res.ok) {
    const text = await res.text().catch(() => res.statusText);
    throw new Error(`API ${init.method ?? 'GET'} ${path} → ${res.status}: ${text}`);
  }
  if (res.status === 204) return undefined as unknown as T;
  return res.json() as Promise<T>;
}

// ─── RFQ ──────────────────────────────────────────────────────────────────────

export function getRfqs(): Promise<RfqBase[]> {
  return request('/rfqs');
}

export function createRfq(
  payload: Omit<Partial<RfqBase>, 'rfqId' | 'createdAt' | 'updatedAt'>
): Promise<{ rfqId: string }> {
  return request('/rfqs', { method: 'POST', body: JSON.stringify(payload) });
}

export function getRfqBundle(rfqId: string): Promise<RfqBundle> {
  return request(`/rfqs/${rfqId}/bundle`);
}

export function updateRfq(
  rfqId: string,
  patch: Partial<RfqBase>
): Promise<RfqBase> {
  return request(`/rfqs/${rfqId}`, { method: 'PUT', body: JSON.stringify(patch) });
}

export function deleteRfq(rfqId: string): Promise<void> {
  return request(`/rfqs/${rfqId}`, { method: 'DELETE' });
}

export function issueRfq(
  rfqId: string,
  payload: { masterPolicyNumber: string; issuedAt: string }
): Promise<RfqBase> {
  return request(`/rfqs/${rfqId}/issue`, { method: 'POST', body: JSON.stringify(payload) });
}

export function advanceRfqStatus(
  rfqId: string,
  stage: RfqStatus
): Promise<RfqBase> {
  return request(`/rfqs/${rfqId}/advance`, {
    method: 'POST',
    body: JSON.stringify({ stage }),
  });
}

export function dispatchPas(rfqId: string): Promise<{ success: boolean }> {
  return request(`/rfqs/${rfqId}/dispatch`, { method: 'POST' });
}

// ─── Documents ────────────────────────────────────────────────────────────────

export function addDocument(
  rfqId: string,
  payload: Omit<Document, 'documentId' | 'rfqId' | 'uploadedAt'>
): Promise<Document> {
  return request(`/rfqs/${rfqId}/documents`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function deleteDocument(rfqId: string, documentId: string): Promise<void> {
  return request(`/rfqs/${rfqId}/documents/${documentId}`, { method: 'DELETE' });
}

// ─── Plans ────────────────────────────────────────────────────────────────────

export function createPlan(
  rfqId: string,
  payload: Omit<Partial<Plan>, 'planId' | 'rfqId'>
): Promise<Plan> {
  return request(`/rfqs/${rfqId}/plans`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function updatePlan(
  rfqId: string,
  planId: string,
  patch: Partial<Plan>
): Promise<Plan> {
  return request(`/rfqs/${rfqId}/plans/${planId}`, {
    method: 'PUT',
    body: JSON.stringify(patch),
  });
}

export function deletePlan(rfqId: string, planId: string): Promise<void> {
  return request(`/rfqs/${rfqId}/plans/${planId}`, { method: 'DELETE' });
}

// ─── Handoffs ─────────────────────────────────────────────────────────────────

export function getHandoffs(): Promise<HandoffTask[]> {
  return request('/handoffs');
}

export function upsertHandoff(task: HandoffTask): Promise<HandoffTask> {
  return request('/handoffs', { method: 'POST', body: JSON.stringify(task) });
}

export function deleteHandoff(taskId: string): Promise<void> {
  return request(`/handoffs/${taskId}`, { method: 'DELETE' });
}

// ─── Subsidiaries ─────────────────────────────────────────────────────────────

export function createSubsidiary(
  rfqId: string,
  payload: Omit<Subsidiary, 'subsidiaryId' | 'rfqId'>
): Promise<Subsidiary> {
  return request(`/rfqs/${rfqId}/subsidiaries`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function updateSubsidiary(
  rfqId: string,
  subsidiaryId: string,
  patch: Partial<Omit<Subsidiary, 'subsidiaryId' | 'rfqId'>>
): Promise<Subsidiary> {
  return request(`/rfqs/${rfqId}/subsidiaries/${subsidiaryId}`, {
    method: 'PUT',
    body: JSON.stringify(patch),
  });
}

export function deleteSubsidiary(rfqId: string, subsidiaryId: string): Promise<void> {
  return request(`/rfqs/${rfqId}/subsidiaries/${subsidiaryId}`, { method: 'DELETE' });
}

// ─── Members ──────────────────────────────────────────────────────────────────

export function createMember(
  rfqId: string,
  payload: Omit<Partial<Member>, 'memberNumber' | 'rfqId' | 'coverages'>
): Promise<Member> {
  return request(`/rfqs/${rfqId}/members`, { method: 'POST', body: JSON.stringify(payload) });
}

export function updateMember(
  rfqId: string,
  memberNumber: string,
  patch: Partial<Omit<Member, 'memberNumber' | 'rfqId'>>
): Promise<Member> {
  return request(`/rfqs/${rfqId}/members/${memberNumber}`, {
    method: 'PUT',
    body: JSON.stringify(patch),
  });
}

export function bulkImportMembers(
  rfqId: string,
  memberList: Omit<Partial<Member>, 'memberNumber' | 'rfqId' | 'coverages'>[]
): Promise<{ imported: number }> {
  return request(`/rfqs/${rfqId}/members/bulk`, {
    method: 'POST',
    body: JSON.stringify({ members: memberList }),
  });
}

export function updateCensusSummary(
  rfqId: string,
  patch: Partial<CensusSummary>
): Promise<CensusSummary> {
  return request(`/rfqs/${rfqId}/census-summary`, { method: 'PUT', body: JSON.stringify(patch) });
}

export function updateClaimsExperience(
  rfqId: string,
  patch: Partial<ClaimsExperience>
): Promise<ClaimsExperience> {
  return request(`/rfqs/${rfqId}/claims-experience`, { method: 'PUT', body: JSON.stringify(patch) });
}

export function updateHeadcount(
  rfqId: string,
  data: HeadcountData
): Promise<RfqBase> {
  return updateRfq(rfqId, { headcountData: data });
}

// ─── Pricing ─────────────────────────────────────────────────────────────────

export async function runPricingMacro(rfqId: string): Promise<Blob> {
  const res = await fetch(`${BASE}/rfqs/${rfqId}/pricing-macro`, {
    method: 'POST',
  });
  if (!res.ok) {
    const text = await res.text().catch(() => res.statusText);
    throw new Error(`API POST /rfqs/${rfqId}/pricing-macro → ${res.status}: ${text}`);
  }
  return res.blob();
}
