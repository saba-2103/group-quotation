import { PolicyConfig } from '@shared/types';

export const policyConfigSeeds: PolicyConfig[] = [
    {
        id: 'config-1',
        quotationId: '1',
        billingFrequency: 'Annual',
        premiumPaymentMethod: 'Cheque/NEFT',
        gracePeriodDays: 30
    },
    {
        id: 'config-2',
        quotationId: '2',
        billingFrequency: 'Monthly',
        premiumPaymentMethod: 'Direct Debit',
        gracePeriodDays: 15
    }
];
