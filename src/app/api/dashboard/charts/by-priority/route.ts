import { NextResponse } from 'next/server';

export async function GET() {
    return NextResponse.json([
        { priority: "LOW", count: 200 },
        { priority: "MEDIUM", count: 400 },
        { priority: "HIGH", count: 250 },
        { priority: "CRITICAL", count: 100 },
    ]);
}
