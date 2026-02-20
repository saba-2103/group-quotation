import { NextResponse } from 'next/server';

export async function GET() {
    return NextResponse.json([
        { name: "GREEN", value: 450 },
        { name: "AMBER", value: 320 },
        { name: "RED", value: 180 },
    ]);
}
