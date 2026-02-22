import { NextResponse } from 'next/server';

const mockExclusions = [
    {
        id: 'exc-1',
        quotationId: '1',
        exclusionCode: 'EXC001',
        exclusionDescription: 'Pre-existing Conditions (12 Months)',
        scope: 'policy',
        category: 'mandatory',
        version: 'v2.1',
        effectiveDate: '2025-01-01',
        status: 'active'
    },
    {
        id: 'exc-2',
        quotationId: '1',
        exclusionCode: 'EXC002',
        exclusionDescription: 'Hazardous Sports & Aviation',
        scope: 'policy',
        category: 'mandatory',
        version: 'v1.0',
        effectiveDate: '2024-01-01',
        status: 'active'
    },
    {
        id: 'exc-3',
        quotationId: '1',
        exclusionCode: 'EXC007',
        exclusionDescription: 'Acts of War or Terrorism',
        scope: 'policy',
        category: 'conditional',
        version: 'v3.0',
        effectiveDate: '2025-06-01',
        status: 'draft'
    }
];

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
    const { id } = await context.params;

    // Simulate DB fetch by quote id
    const filtered = mockExclusions.filter(d => d.quotationId === id);

    // If we're hitting another ID for demo purposes, just return the list anyway,
    // or return all if mock doesn't match
    const responseData = filtered.length > 0 ? filtered : mockExclusions;

    return NextResponse.json(responseData);
}
