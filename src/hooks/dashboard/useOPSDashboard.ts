'use client';

import { useEffect, useState } from 'react';
import { PROPOSALS } from '@/mocks/group-pas/issuance/proposals';
import { POLICIES } from '@/mocks/group-pas/policy-admin/policies';
import { mockDelay } from './_mockDelay';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export interface OPSProposalItem {
  proposalId: string;
  quoteId: string;
  clientId: string;
  state: string;
  updatedAt?: string | undefined;
}

export interface OPSPolicyItem {
  policyId: string;
  policyNumber: string;
  clientId: string;
  state: string;
  effectiveDate?: string;
}

export interface OPSDashboardData {
  proposalsByStatus: Record<string, number>;
  blockedProposals: OPSProposalItem[];
  readyToIssue: OPSProposalItem[];
  reconciliationQueue: OPSPolicyItem[];
  recentlyIssued: OPSPolicyItem[];
  isLoading: boolean;
}

// ─────────────────────────────────────────────────────────────────────────────
// Hook
// ─────────────────────────────────────────────────────────────────────────────

export function useOPSDashboard(): OPSDashboardData {
  const [isLoading, setIsLoading] = useState(true);
  const [data, setData] = useState<Omit<OPSDashboardData, 'isLoading'>>({
    proposalsByStatus: {},
    blockedProposals: [],
    readyToIssue: [],
    reconciliationQueue: [],
    recentlyIssued: [],
  });

  useEffect(() => {
    let cancelled = false;
    mockDelay().then(() => {
      if (cancelled) return;

      const proposalsByStatus: Record<string, number> = {};
      PROPOSALS.forEach((p) => {
        proposalsByStatus[p.state] = (proposalsByStatus[p.state] ?? 0) + 1;
      });

      const toOPSProposal = (p: typeof PROPOSALS[number]): OPSProposalItem => ({
        proposalId: p.id,
        quoteId: p.quoteId,
        clientId: p.clientId,
        state: p.state,
        updatedAt: undefined,
      });

      const blockedProposals = PROPOSALS.filter(
        (p) => p.state === 'DRAFT' || p.state === 'SUBMITTED',
      ).map(toOPSProposal);

      const readyToIssue = PROPOSALS.filter(
        (p) => p.state === 'FINALIZED',
      ).map(toOPSProposal);

      const toOPSPolicy = (p: typeof POLICIES[number]): OPSPolicyItem => ({
        policyId: p.id,
        policyNumber: p.policyNumber,
        clientId: p.clientId,
        state: p.state,
        effectiveDate: p.effectiveDate,
      });

      const reconciliationQueue = POLICIES.filter(
        (p) => p.state === 'PENDING',
      ).map(toOPSPolicy);

      const recentlyIssued = POLICIES.filter(
        (p) => p.state === 'ACTIVE',
      ).map(toOPSPolicy);

      setData({
        proposalsByStatus,
        blockedProposals,
        readyToIssue,
        reconciliationQueue,
        recentlyIssued,
      });
      setIsLoading(false);
    });
    return () => { cancelled = true; };
  }, []);

  return { ...data, isLoading };
}
