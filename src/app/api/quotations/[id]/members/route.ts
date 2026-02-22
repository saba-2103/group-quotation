import { NextResponse } from 'next/server';

const mockMembers = [
    {
        id: 'mem-1',
        quotationId: '1',
        planNumber: 'plan-1',
        memberName: 'John Doe',
        dob: '1980-05-15',
        gender: 'M',
        employeeNumber: 'E1001',
        borrowerNumber: 'B1001',
        loanNumber: 'L1001',
        salary: 2000000,
        subsidiaryCode: 'SUB-NYC',
        startDate: '2025-01-01',
        endDate: '2026-01-01',
        effectiveDate: '2025-01-01',
        currentCoverageSI: 6000000,
        fclStatus: 'above',
        excessSI: 1000000,
        uwRequired: 'required',
        uwReasonCode: 'AGE_OVER_45',
        evidencePendingCount: 2,
        pricingStatus: 'rated',
        matchedRateRowId: 'RATE-892',
        lastActivity: '2025-11-20',
        slaAge: 5,
        status: 'pending',
        premium: 15000
    },
    {
        id: 'mem-2',
        quotationId: '1',
        planNumber: 'plan-2',
        memberName: 'Jane Smith',
        dob: '1995-10-20',
        gender: 'F',
        employeeNumber: 'E1002',
        borrowerNumber: 'B1002',
        loanNumber: 'L1002',
        salary: 800000,
        subsidiaryCode: 'SUB-NYC',
        startDate: '2025-01-01',
        endDate: '2026-01-01',
        effectiveDate: '2025-01-01',
        currentCoverageSI: 1000000,
        fclStatus: 'within',
        excessSI: 0,
        uwRequired: 'not-required',
        uwReasonCode: 'N/A',
        evidencePendingCount: 0,
        pricingStatus: 'rated',
        matchedRateRowId: 'RATE-893',
        lastActivity: '2025-11-21',
        slaAge: 1,
        status: 'active',
        premium: 1500
    },
    {
        id: 'mem-3',
        quotationId: '1',
        planNumber: 'plan-1',
        memberName: 'Robert Johnson',
        dob: '1975-03-12',
        gender: 'M',
        employeeNumber: 'E1003',
        borrowerNumber: 'B1003',
        loanNumber: 'L1003',
        salary: 3500000,
        subsidiaryCode: 'SUB-LON',
        startDate: '2025-01-01',
        endDate: '2026-01-01',
        effectiveDate: '2025-01-01',
        currentCoverageSI: 8500000,
        fclStatus: 'above',
        excessSI: 3500000,
        uwRequired: 'in-progress',
        uwReasonCode: 'HIGH_SI',
        evidencePendingCount: 1,
        pricingStatus: 'unrated',
        matchedRateRowId: 'RATE-PENDING',
        lastActivity: '2025-11-22',
        slaAge: 2,
        status: 'active',
        premium: null
    }
];

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
    const { id } = await context.params;

    // Simulate DB fetch by quote id
    const filteredMembers = mockMembers.filter(m => m.quotationId === id);

    // If we're hitting another ID for demo purposes, just return the list anyway,
    // or return all if mock doesn't match
    const responseData = filteredMembers.length > 0 ? filteredMembers : mockMembers;

    return NextResponse.json(responseData);
}
