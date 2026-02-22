import { NextResponse } from 'next/server';

const mockDocuments = [
    {
        id: 'doc-1',
        quotationId: '1',
        documentType: 'Master Policy Final',
        documentSource: 'insurer',
        linkedEntity: 'Policy-POL001',
        effectiveDate: '2025-01-01',
        expiryDate: '2026-01-01',
        uploadedBy: 'System Auto',
        uploadedDate: '2025-01-01',
        verificationStatus: 'verified',
        documentStatus: 'approved',
        dmsReference: 'DMS-8923-MP'
    },
    {
        id: 'doc-2',
        quotationId: '1',
        documentType: 'Member Roster V2',
        documentSource: 'client',
        linkedEntity: 'Roster Import',
        effectiveDate: '2025-01-01',
        expiryDate: '2026-01-01',
        uploadedBy: 'HR Admin',
        uploadedDate: '2025-11-20',
        verificationStatus: 'verified',
        documentStatus: 'approved',
        dmsReference: 'DMS-8924-ROS'
    },
    {
        id: 'doc-3',
        quotationId: '1',
        documentType: 'KYC Certificate',
        documentSource: 'client',
        linkedEntity: 'Company-XYZ',
        effectiveDate: '2024-01-01',
        expiryDate: '2025-01-01',
        uploadedBy: 'HR Admin',
        uploadedDate: '2024-01-05',
        verificationStatus: 'expired',
        documentStatus: 'expired',
        dmsReference: 'DMS-8925-KYC'
    },
    {
        id: 'doc-4',
        quotationId: '1',
        documentType: 'Medical Report (John Doe)',
        documentSource: 'broker',
        linkedEntity: 'Member-mem-1',
        effectiveDate: null,
        expiryDate: null,
        uploadedBy: 'Broker Agent',
        uploadedDate: '2025-11-22',
        verificationStatus: 'pending',
        documentStatus: 'pending',
        dmsReference: 'DMS-8926-MED'
    }
];

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
    const { id } = await context.params;

    // Simulate DB fetch by quote id
    const filteredDocs = mockDocuments.filter(d => d.quotationId === id);

    // If we're hitting another ID for demo purposes, just return the list anyway,
    // or return all if mock doesn't match
    const responseData = filteredDocs.length > 0 ? filteredDocs : mockDocuments;

    return NextResponse.json(responseData);
}
