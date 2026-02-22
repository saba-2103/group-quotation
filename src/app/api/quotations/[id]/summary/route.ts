import { NextResponse } from 'next/server';

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
    return NextResponse.json({
        policyNumber: "POL-001-GROUP",
        masterPolicyNumber: "MP-2025-001",
        issueDate: "2025-01-01",
        inceptionDate: "2025-01-15",
        expiryDate: "2026-01-14",
        status: "active",
        currency: "INR"
    });
}
