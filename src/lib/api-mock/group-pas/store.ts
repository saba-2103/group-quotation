// In-memory mock store for the Group PAS modules.
// Cloned from fixtures on first access; survives Next.js hot reloads via globalThis
// so a dev session keeps state across edits.

import {
  CENSUS_ROWS,
  CENSUS_SUBMISSIONS,
  CLIENTS,
  MEMBERS,
  POLICIES,
  POLICY_MEMBERS,
  PROPOSALS,
  QUOTES,
} from '@/mocks/group-pas';
import type {
  CensusSubmission,
  CensusSubmissionRow,
  PolicyMember,
  Proposal,
} from '@/types/group-pas/issuance';
import type {
  Client,
  Member,
  Policy,
} from '@/types/group-pas/policy-admin';
import type { MockQuote } from '@/mocks/group-pas/quotation/quotes';

// `awaitingApproval` is a UI-only overlay flag (see context/ARCH_TRANSITION.md
// → "Maker-checker UI overlay"). Carried on Proposal mocks the same way the
// MockQuote type carries it on Quote.
export type MockProposal = Proposal & { awaitingApproval?: boolean };

interface GroupPasStore {
  quotes: MockQuote[];
  proposals: MockProposal[];
  policyMembers: PolicyMember[];
  censusSubmissions: CensusSubmission[];
  censusRows: CensusSubmissionRow[];
  clients: Client[];
  policies: Policy[];
  members: Member[];
}

declare global {
  // eslint-disable-next-line no-var
  var __groupPasStore: GroupPasStore | undefined;
}

export const store: GroupPasStore =
  globalThis.__groupPasStore ??
  (globalThis.__groupPasStore = {
    quotes: structuredClone(QUOTES),
    proposals: structuredClone(PROPOSALS),
    policyMembers: structuredClone(POLICY_MEMBERS),
    censusSubmissions: structuredClone(CENSUS_SUBMISSIONS),
    censusRows: structuredClone(CENSUS_ROWS),
    clients: structuredClone(CLIENTS),
    policies: structuredClone(POLICIES),
    members: structuredClone(MEMBERS),
  });

// Schedules a state transition after a short delay. Aligned with
// STANDARD_POLL_SCHEDULE's 2s initial cadence so polling consumers see the
// transition on the second or third poll.
export function scheduleTransition(fn: () => void, delayMs = 4000): void {
  setTimeout(fn, delayMs);
}

// Generates a unique identifier in the same shape as the static fixtures.
export function nextId(prefix: string): string {
  const ts = Date.now().toString(36).toUpperCase();
  return `${prefix}-${ts}`;
}

// Resets every collection back to its seed list — used by the
// /api/_mock/reset route so the demo can replay from a clean state without
// restarting the dev server.
export function resetMockStore(): void {
  store.quotes = structuredClone(QUOTES);
  store.proposals = structuredClone(PROPOSALS);
  store.policyMembers = structuredClone(POLICY_MEMBERS);
  store.censusSubmissions = structuredClone(CENSUS_SUBMISSIONS);
  store.censusRows = structuredClone(CENSUS_ROWS);
  store.clients = structuredClone(CLIENTS);
  store.policies = structuredClone(POLICIES);
  store.members = structuredClone(MEMBERS);
}
