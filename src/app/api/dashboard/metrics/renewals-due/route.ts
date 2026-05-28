import { NextResponse } from 'next/server';

import { store } from '@/lib/api-mock/group-pas/store';

// "Members in Flight" — PolicyMembers in non-terminal lifecycle states
// (anywhere between CREATED and SENT_FOR_ISSUANCE). Excludes ADDED (in PAM),
// REJECTED, ARCHIVED, VOID. URL kept as legacy "renewals-due"; label
// repurposed for V1 (Renewals module isn't in scope).
const TERMINAL_STATES = new Set(['ADDED', 'REJECTED', 'ARCHIVED', 'VOID']);

export async function GET() {
  const value = store.policyMembers.filter((m) => !TERMINAL_STATES.has(m.state)).length;
  return NextResponse.json({ value });
}
