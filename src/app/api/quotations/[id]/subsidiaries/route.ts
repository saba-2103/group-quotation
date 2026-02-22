import { NextResponse } from 'next/server';

const mockSubsidiaries = [
    {
        id: 'sub-1',
        quotationId: '1',
        subsidiaryCode: 'SUB-001',
        subsidiaryName: 'Acme Corp North',
        locationBranch: 'New York',
        billingSplitRule: 'headcount',
        startDate: '2025-01-01',
        endDate: '2026-01-01',
        status: 'active'
    },
    {
        id: 'sub-2',
        quotationId: '1',
        subsidiaryCode: 'SUB-002',
        subsidiaryName: 'Acme Corp South',
        locationBranch: 'Texas',
        billingSplitRule: 'premium',
        startDate: '2025-01-01',
        endDate: '2026-01-01',
        status: 'active'
    },
    {
        id: 'sub-3',
        quotationId: '1',
        subsidiaryCode: 'SUB-003',
        subsidiaryName: 'Acme Corp West (Defunct)',
        locationBranch: 'California',
        billingSplitRule: 'si',
        startDate: '2022-01-01',
        endDate: '2024-01-01',
        status: 'terminated'
    }
];

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
    const { id } = await context.params;

    // Simulate DB fetch by quote id
    const filtered = mockSubsidiaries.filter(d => d.quotationId === id);

    // If we're hitting another ID for demo purposes, just return the list anyway,
    // or return all if mock doesn't match
    const responseData = filtered.length > 0 ? filtered : mockSubsidiaries;

    return NextResponse.json(responseData);
}
