import { NextResponse } from 'next/server';

import { store } from '@/lib/api-mock/group-pas/store';

// "Pending quotes" — every quote not yet finalized or terminal-rejected.
// Reads from the in-memory mock store. Renamed in semantics from the legacy
// "pending-quotations" URL but URL preserved to avoid schema churn.
const PENDING_STATES = new Set(['DRAFT', 'SUBMITTED', 'SENT_TO_CLIENT', 'ACCEPTED']);

export async function GET() {
  const value = store.quotes.filter((q) => PENDING_STATES.has(q.status)).length;
  return NextResponse.json({ value });
}
