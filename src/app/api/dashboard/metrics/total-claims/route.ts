import { NextResponse } from 'next/server';

export async function GET() {
    return NextResponse.json({
        value: 1234,
        trend: 12.5
    });
}
