import { NextResponse } from 'next/server';

import { store } from '@/lib/api-mock/group-pas/store';

// "Active Policies" — count of master policies in ACTIVE state. URL kept
// as the legacy "pending-alterations" path to avoid schema churn; the
// label was repurposed for V1 (Alterations module isn't in scope).
export async function GET() {
  const value = store.policies.filter((p) => p.state === 'ACTIVE').length;
  return NextResponse.json({ value });
}
