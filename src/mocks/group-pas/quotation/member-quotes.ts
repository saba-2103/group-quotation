// Mock MemberQuote (GCL) fixtures.
// Backend has the full MemberQuoteAPI deployed; we mirror it client-side
// so dev demos work without the real backend.

import type { Money } from '@/types/group-pas/common';
import type { MemberQuote, MemberQuoteDto } from '@/types/group-pas/quotation';

const inr = (amount: number): Money => ({ amount, currency: 'INR' });

const POLICY_ID = 'POL-2026-0001';

export const MEMBER_QUOTES: MemberQuote[] = [
  {
    id: 'MQT-2026-0001',
    policyId: POLICY_ID,
    planNo: 'PLAN-GTL-001',
    sumAssured: inr(2_500_000),
    status: 'FINALIZED',
    memberData: {
      name: 'Rohan Mehta',
      dob: '1985-03-12',
      gender: 'M',
      salary: 1_400_000,
      occupation: 'Software Engineer',
    },
    premium: {
      amount: inr(8_400),
      breakup: [{ productCode: 'TERM-LIFE', premium: inr(8_400) }],
    },
  },
  {
    id: 'MQT-2026-0002',
    policyId: POLICY_ID,
    planNo: 'PLAN-GTL-001',
    sumAssured: inr(1_800_000),
    status: 'SUBMITTED',
    memberData: {
      name: 'Priya Iyer',
      dob: '1991-07-25',
      gender: 'F',
      salary: 1_100_000,
      occupation: 'Designer',
    },
    premium: {
      amount: inr(6_120),
      breakup: [{ productCode: 'TERM-LIFE', premium: inr(6_120) }],
    },
  },
  {
    id: 'MQT-2026-0003',
    policyId: POLICY_ID,
    planNo: undefined,
    sumAssured: inr(2_000_000),
    status: 'DRAFT',
    memberData: {
      name: 'Arjun Patel',
      dob: '1988-11-04',
      gender: 'M',
      salary: 1_600_000,
      occupation: 'Sales Lead',
    },
  },
];

export const MEMBER_QUOTE_DTOS: MemberQuoteDto[] = MEMBER_QUOTES.map((q) => ({
  id: q.id,
  policyId: q.policyId,
  planNo: q.planNo ?? '',
  status: q.status,
  name: q.memberData.name,
  dob: q.memberData.dob ?? '',
  gender: q.memberData.gender ?? '',
  salary: q.memberData.salary ?? 0,
  sumAssured: q.sumAssured?.amount ?? 0,
  annualPremiumAmount: q.premium?.amount.amount ?? 0,
  annualPremiumCurrency: q.premium?.amount.currency ?? 'INR',
  premiumBreakupJson: JSON.stringify(q.premium?.breakup ?? []),
}));
