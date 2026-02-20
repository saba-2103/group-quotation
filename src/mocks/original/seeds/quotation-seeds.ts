import { Quotation } from '@shared/types';

export const quotationSeeds: Quotation[] = [
    {
        id: '1',
        quotationNumber: 'QBAG00000000001',
        clientName: 'Reliance Group',
        schemeType: 'Employer-Employee',
        policyType: 'Group Term Life',
        quoteVersion: 'V1.0',
        effectiveDate: '2025-12-01',
        status: 'Draft'
    },
    {
        id: '2',
        quotationNumber: 'QBAG00000000002',
        clientName: 'Bajaj Finance Ltd',
        schemeType: 'Lender-Borrower',
        policyType: 'Group Credit Life',
        quoteVersion: 'V1.0',
        effectiveDate: '2025-12-01',
        status: 'Submitted'
    }
];
