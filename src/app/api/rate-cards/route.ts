import { NextResponse, type NextRequest } from 'next/server';
import { PLAN_RATE_CARDS } from '@/lib/constants';

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const productCode = searchParams.get('productCode');

  let cards = PLAN_RATE_CARDS;
  if (productCode) {
    cards = cards.filter((c) => c.productCode === productCode);
  }

  return NextResponse.json(cards);
}
