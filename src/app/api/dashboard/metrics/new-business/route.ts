import { NextResponse } from 'next/server';

import { store } from '@/lib/api-mock/group-pas/store';

// "Quotes Finalized" — count of quotes that closed and handed off to Issuance.
// Each one corresponds to a Proposal in flight or further. URL preserved
// from the legacy "new-business" handler.
export async function GET() {
  const value = store.quotes.filter((q) => q.status === 'FINALIZED').length;
  return NextResponse.json({ value });
}
