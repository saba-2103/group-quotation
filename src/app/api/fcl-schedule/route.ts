import { NextResponse, type NextRequest } from 'next/server';
import { FCL_LIMIT_SCHEDULE } from '@/lib/constants';
import type { FclPattern } from '@/lib/types';

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const pattern = searchParams.get('pattern') as FclPattern | null;

  if (pattern && FCL_LIMIT_SCHEDULE[pattern]) {
    return NextResponse.json(FCL_LIMIT_SCHEDULE[pattern]);
  }

  // Return all schedules flattened
  const all = Object.values(FCL_LIMIT_SCHEDULE).flat();
  return NextResponse.json(all);
}
