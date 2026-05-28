// Demo helper: POST /api/dev/reset wipes the in-memory Group PAS store
// back to its seed lists so the 5.3 walk-through can replay cleanly without
// restarting the dev server. Returns 405 if GROUP_PAS_BACKEND_URL is set
// (real backend deployments must not expose this).

import { NextResponse } from 'next/server';

import { resetMockStore } from '@/lib/api-mock/group-pas/store';

export async function POST(): Promise<NextResponse> {
  if (process.env.GROUP_PAS_BACKEND_URL) {
    return NextResponse.json(
      {
        timestamp: new Date().toISOString(),
        status: 405,
        error: 'Method Not Allowed',
        message: 'Mock reset is disabled when GROUP_PAS_BACKEND_URL is set.',
        path: '/api/dev/reset',
      },
      { status: 405 },
    );
  }
  resetMockStore();
  return NextResponse.json({ ok: true, message: 'Group PAS mock store reset.' });
}
