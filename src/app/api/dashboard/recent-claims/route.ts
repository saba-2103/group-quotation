import { NextResponse } from 'next/server';

export async function GET() {
    return NextResponse.json([
        { id: "1", claimNumber: "CLM-2024-001234", customer: "John Smith", lane: "GREEN", amount: 45000 },
        { id: "2", claimNumber: "CLM-2024-001235", customer: "Sarah Johnson", lane: "AMBER", amount: 125000 },
        { id: "3", claimNumber: "CLM-2024-001236", customer: "Michael Brown", lane: "RED", amount: 250000 },
        { id: "4", claimNumber: "CLM-2024-001237", customer: "Emily Davis", lane: "GREEN", amount: 18500 },
        { id: "5", claimNumber: "CLM-2024-001238", customer: "Robert Wilson", lane: "AMBER", amount: 89000 },
    ]);
}
