// Typed API client functions for the Plan Wizard and related features.
// Calls the MSW-backed mock endpoints defined in mocks/handlers.ts.

import type {
  ClauseLibraryItem,
  Deviation,
  DeviationApprovalStage,
  FclPattern,
  FclScheduleEntry,
  RateCard,
} from '@/lib/types';

const BASE = '/api';

async function get<T>(path: string, params?: Record<string, string>): Promise<T> {
  const url = new URL(path, window.location.origin);
  if (params) Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
  const res = await fetch(url.toString(), {
    headers: { 'Content-Type': 'application/json' },
  });
  if (!res.ok) {
    const text = await res.text().catch(() => res.statusText);
    throw new Error(`API GET ${path} → ${res.status}: ${text}`);
  }
  return res.json() as Promise<T>;
}

async function post<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => res.statusText);
    throw new Error(`API POST ${path} → ${res.status}: ${text}`);
  }
  return res.json() as Promise<T>;
}

async function put<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => res.statusText);
    throw new Error(`API PUT ${path} → ${res.status}: ${text}`);
  }
  return res.json() as Promise<T>;
}

// ── Clause library ─────────────────────────────────────────────────────────────

/** Returns clause library items, optionally filtered by bucket and/or including riders. */
export function getClauses(
  bucket?: string,
  includeRiders?: boolean,
): Promise<ClauseLibraryItem[]> {
  const params: Record<string, string> = {};
  if (bucket) params['bucket'] = bucket;
  if (includeRiders) params['riders'] = 'true';
  return get<ClauseLibraryItem[]>(`${BASE}/library/clauses`, params);
}

// ── Rate cards ─────────────────────────────────────────────────────────────────

/** Returns rate cards for a given productCode. */
export function getRateCards(productCode: string): Promise<RateCard[]> {
  return get<RateCard[]>(`${BASE}/rate-cards`, { productCode });
}

// ── FCL schedule ───────────────────────────────────────────────────────────────

/** Returns the FCL limit schedule for a pattern, or the full schedule if no pattern given. */
export function getFclSchedule(
  pattern?: FclPattern,
): Promise<FclScheduleEntry | Record<FclPattern, FclScheduleEntry>> {
  const params: Record<string, string> = {};
  if (pattern) params['pattern'] = pattern;
  return get<FclScheduleEntry | Record<FclPattern, FclScheduleEntry>>(
    `${BASE}/fcl-schedule`,
    params,
  );
}

// ── Deviations ─────────────────────────────────────────────────────────────────

/** Returns all deviations registered against an RFQ. */
export function getDeviations(rfqId: string): Promise<Deviation[]> {
  return get<Deviation[]>(`${BASE}/rfqs/${rfqId}/deviations`);
}

/** Creates or updates (upserts) a deviation — matched by deviation.id if present. */
export function upsertDeviation(
  rfqId: string,
  deviation: Omit<Deviation, 'createdAt' | 'updatedAt'>,
): Promise<Deviation> {
  return post<Deviation>(`/rfqs/${rfqId}/deviations`, deviation);
}

/** Advances a deviation's approval stage and appends a history entry. */
export function updateDeviationStage(
  rfqId: string,
  deviationId: string,
  stage: DeviationApprovalStage,
  note: string,
  by?: string,
): Promise<Deviation> {
  return put<Deviation>(`/rfqs/${rfqId}/deviations/${deviationId}`, { stage, note, by });
}
