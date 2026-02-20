import { PolicyFlags } from '@shared/types';

export const policyFlagsSeeds: PolicyFlags[] = [
    {
        id: 'flags-1',
        quotationId: '1',
        isMicroInsurance: false,
        hasReinsurance: true,
        makerCheckerEnabled: true
    },
    {
        id: 'flags-2',
        quotationId: '2',
        isMicroInsurance: true,
        hasReinsurance: false,
        makerCheckerEnabled: false
    }
];
