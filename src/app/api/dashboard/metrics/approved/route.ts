import { NextResponse } from 'next/server';

export async function GET() {
    return NextResponse.json({
        value: 856,
        trend: 8.2
    });
}
