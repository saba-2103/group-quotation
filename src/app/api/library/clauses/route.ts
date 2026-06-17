import { NextResponse, type NextRequest } from 'next/server';
import { CLAUSE_LIBRARY } from '@/lib/constants';

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const bucket = searchParams.get('bucket');
  const riders = searchParams.get('riders') === 'true';

  let items = CLAUSE_LIBRARY;
  if (bucket) {
    items = items.filter((c) => c.bucket === bucket);
  }
  if (!riders) {
    items = items.filter((c) => c.bucket !== 'RIDER');
  }

  return NextResponse.json(items);
}
