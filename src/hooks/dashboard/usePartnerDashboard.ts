'use client';

import { useEffect, useState } from 'react';
import { MEMBER_QUOTES_V2, QUOTES_V2 } from '@/mocks/group-pas/quotation/data';
import type { Money } from '@/types/group-pas/common';
import { mockDelay } from './_mockDelay';

// ─────────────────────────────────────────────────────────────────────────────
// Extended mock status (PIM lifecycle doesn't exist in the type system yet)
// ─────────────────────────────────────────────────────────────────────────────

export type PimStatus = 'DRAFT' | 'SUBMITTED' | 'ACCEPTED_BY_PIM' | 'REJECTED_BY_PIM';

export interface PartnerMemberQuoteItem {
  id: string;
  quoteId: string;
  parentQuoteNumber: string;
  parentClientName: string;
  memberName: string;
  loanReference: string;
  loanAmount: Money;
  planName?: string;
  planId: string;
  status: PimStatus;
  submittedAt?: string;
  createdAt: string;
  rejectionReason?: string;
  nmlBreach: boolean;   // true if sum_assured > NML threshold (mock: > 4M)
}

export interface PartnerSchemeItem {
  quoteId: string;
  quoteNumber: string;
  clientName: string;
  planName: string;
  submissionCount: number;
  schemeStatus: 'ACTIVE' | 'FINALIZED';
}

export interface PartnerTodayStats {
  submittedToday: number;
  acceptedToday: number;
  rejectedToday: number;
  nmlBreachFlags: number;
  draftsCreated: number;
}

export interface PartnerDashboardData {
  totalSubmitted: number;
  accepted: number;
  rejected: number;
  drafts: number;
  rejectedItems: PartnerMemberQuoteItem[];
  todayStats: PartnerTodayStats;
  activeSchemes: PartnerSchemeItem[];
  allItems: PartnerMemberQuoteItem[];
  isLoading: boolean;
}

// ─────────────────────────────────────────────────────────────────────────────
// Mock extended data — PIM outcomes not yet in type system
// ─────────────────────────────────────────────────────────────────────────────

const NML_THRESHOLD = 4_000_000;

// Enrich the real V2 mock data with PIM statuses and rejections
const MOCK_ENRICHED: Array<{ id: string; pimStatus: PimStatus; rejectionReason?: string }> = [
  { id: 'MQV2-0001', pimStatus: 'ACCEPTED_BY_PIM' },
  {
    id: 'MQV2-0002',
    pimStatus: 'REJECTED_BY_PIM',
    rejectionReason: 'Sum assured exceeds FCL without medical evidence. Please attach CMO declaration.',
  },
  { id: 'MQV2-0003', pimStatus: 'DRAFT' },
  {
    id: 'MQV2-0004',
    pimStatus: 'REJECTED_BY_PIM',
    rejectionReason: 'Loan disbursement date missing. Resubmit with complete loan particulars.',
  },
];

function buildItems(): PartnerMemberQuoteItem[] {
  const enrichMap = new Map(MOCK_ENRICHED.map((e) => [e.id, e]));
  return MEMBER_QUOTES_V2.map((mq) => {
    const enrich = enrichMap.get(mq.id);
    const pimStatus: PimStatus = enrich?.pimStatus ?? (mq.status === 'SUBMITTED' ? 'SUBMITTED' : 'DRAFT');
    return {
      id: mq.id,
      quoteId: mq.quote_id,
      parentQuoteNumber: mq.parent_quote_number ?? '',
      parentClientName: mq.parent_client_name ?? '',
      memberName: mq.member_name,
      loanReference: mq.loan_reference,
      loanAmount: mq.loan_amount,
      planId: mq.plan_id,
      planName: mq.plan_name,
      status: pimStatus,
      submittedAt: mq.submitted_at,
      createdAt: mq.created_at,
      rejectionReason: enrich?.rejectionReason,
      nmlBreach: (mq.sum_assured?.amount ?? 0) > NML_THRESHOLD,
    };
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Scheme aggregation — GCL quotes this agent submits under
// ─────────────────────────────────────────────────────────────────────────────

function buildSchemes(items: PartnerMemberQuoteItem[]): PartnerSchemeItem[] {
  const countByQuote = new Map<string, number>();
  items.forEach((i) => {
    countByQuote.set(i.quoteId, (countByQuote.get(i.quoteId) ?? 0) + 1);
  });

  return QUOTES_V2.filter(
    (q) => q.scheme_type === 'GCL' && countByQuote.has(q.id),
  ).map((q) => ({
    quoteId: q.id,
    quoteNumber: q.quote_number,
    clientName: q.client_name,
    planName: q.versions[q.versions.length - 1]?.plans[0]?.plan_name ?? 'GCL Standard',
    submissionCount: countByQuote.get(q.id) ?? 0,
    schemeStatus: (q.status === 'FINALIZED' ? 'FINALIZED' : 'ACTIVE') as 'ACTIVE' | 'FINALIZED',
  }));
}

// ─────────────────────────────────────────────────────────────────────────────
// Hook
// ─────────────────────────────────────────────────────────────────────────────

export function usePartnerDashboard(): PartnerDashboardData {
  const [isLoading, setIsLoading] = useState(true);
  const [data, setData] = useState<Omit<PartnerDashboardData, 'isLoading'>>({
    totalSubmitted: 0,
    accepted: 0,
    rejected: 0,
    drafts: 0,
    rejectedItems: [],
    todayStats: { submittedToday: 0, acceptedToday: 0, rejectedToday: 0, nmlBreachFlags: 0, draftsCreated: 0 },
    activeSchemes: [],
    allItems: [],
  });

  useEffect(() => {
    let cancelled = false;
    mockDelay().then(() => {
      if (cancelled) return;

      const items = buildItems();
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);
      const todayMs = todayStart.getTime();

      const totalSubmitted = items.filter(
        (i) => i.status !== 'DRAFT',
      ).length;
      const accepted = items.filter((i) => i.status === 'ACCEPTED_BY_PIM').length;
      const rejected = items.filter((i) => i.status === 'REJECTED_BY_PIM').length;
      const drafts = items.filter((i) => i.status === 'DRAFT').length;

      const rejectedItems = items.filter((i) => i.status === 'REJECTED_BY_PIM');

      const todayStats: PartnerTodayStats = {
        submittedToday: items.filter(
          (i) => i.submittedAt && new Date(i.submittedAt).getTime() >= todayMs,
        ).length,
        acceptedToday: items.filter(
          (i) =>
            i.status === 'ACCEPTED_BY_PIM' &&
            i.submittedAt &&
            new Date(i.submittedAt).getTime() >= todayMs,
        ).length,
        rejectedToday: items.filter(
          (i) =>
            i.status === 'REJECTED_BY_PIM' &&
            i.submittedAt &&
            new Date(i.submittedAt).getTime() >= todayMs,
        ).length,
        nmlBreachFlags: items.filter((i) => i.nmlBreach).length,
        draftsCreated: items.filter(
          (i) => i.status === 'DRAFT' && new Date(i.createdAt).getTime() >= todayMs,
        ).length,
      };

      const activeSchemes = buildSchemes(items);

      setData({ totalSubmitted, accepted, rejected, drafts, rejectedItems, todayStats, activeSchemes, allItems: items });
      setIsLoading(false);
    });
    return () => { cancelled = true; };
  }, []);

  return { ...data, isLoading };
}


