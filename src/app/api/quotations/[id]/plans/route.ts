import { NextResponse } from 'next/server';

const mockPlans = [
    {
        id: 'plan-1',
        quotationId: '1',
        planNumber: 'PLN-001',
        planDescription: 'Executive Core Coverage GP',
        planType: 'level-term',
        sumAssuredBasis: 'salary-multiple',
        enrollmentType: 'auto',
        livesCovered: 'Employees Only',
        memberCount: 250,
        totalSumInsured: 50000000,
        completenessScore: '100',
        status: 'active',
        startDate: '2025-01-01',
        endDate: '2026-01-01'
    },
    {
        id: 'plan-2',
        quotationId: '1',
        planNumber: 'PLN-002',
        planDescription: 'General Staff Coverage',
        planType: 'reducing-term',
        sumAssuredBasis: 'flat',
        enrollmentType: 'auto',
        livesCovered: 'Employees + Spouse',
        memberCount: 1000,
        totalSumInsured: 75000000,
        completenessScore: '75',
        status: 'active',
        startDate: '2025-01-01',
        endDate: '2026-01-01'
    }
];

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
    const { id } = await context.params;

    // Simulate DB fetch by quote id
    const filtered = mockPlans.filter(d => d.quotationId === id);

    // If we're hitting another ID for demo purposes, just return the list anyway,
    // or return all if mock doesn't match
    const responseData = filtered.length > 0 ? filtered : mockPlans;

    return NextResponse.json(responseData);
}
