import { NextResponse } from 'next/server';

export async function GET() {
    return NextResponse.json([
        { date: "Jan 1", count: 45 },
        { date: "Jan 5", count: 52 },
        { date: "Jan 10", count: 48 },
        { date: "Jan 15", count: 61 },
        { date: "Jan 20", count: 55 },
        { date: "Jan 25", count: 67 },
        { date: "Jan 30", count: 72 },
    ]);
}
