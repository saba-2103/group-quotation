import { Plan } from '@shared/types';

export const planSeeds: Plan[] = [
    // Quote 1: Employer-Employee
    {
        id: 'plan-1',
        quotationId: '1',
        planName: 'Senior Management (Grades M1-M3)',
        planType: 'Level Term',
        fclLimit: 5000000, // 50L
        siBasis: 'Salary * 3'
    },
    {
        id: 'plan-2',
        quotationId: '1',
        planName: 'General Staff',
        planType: 'Level Term',
        fclLimit: 3000000, // 30L
        siBasis: 'Flat 10L'
    },
    // Quote 2: Lender-Borrower
    {
        id: 'plan-3',
        quotationId: '2',
        planName: 'Home Loan Borrowers',
        planType: 'Reducing Term',
        fclLimit: 7500000, // 75L
        siBasis: 'Loan Outstanding'
    }
];
