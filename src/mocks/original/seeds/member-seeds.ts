import { Member } from '@shared/types';

export const memberSeeds: Member[] = [
    // Quote 1: Employer-Employee Members
    {
        id: 'mem-1',
        quotationId: '1',
        planId: 'plan-1',
        name: 'John Doe',
        dob: '1980-05-15', // Age 45
        gender: 'M',
        salary: 2000000,
        designation: 'Senior Manager',
        sumAssured: 6000000, // 20L * 3
        fclStatus: 'Above', // 60L > 50L (Plan 1 FCL)
        premium: 15000 // (6000 * 2.5) -> Example calc
    },
    {
        id: 'mem-2',
        quotationId: '1',
        planId: 'plan-2',
        name: 'Jane Smith',
        dob: '1995-10-20', // Age 30
        gender: 'F',
        salary: 800000,
        designation: 'Executive',
        sumAssured: 1000000, // Flat 10L
        fclStatus: 'Within', // 10L < 30L (Plan 2 FCL)
        premium: 1500 // (1000 * 1.5)
    }
];
