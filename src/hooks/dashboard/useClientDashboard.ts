'use client';

import { useEffect, useState } from 'react';
import { CLIENTS } from '@/mocks/group-pas/policy-admin/clients';
import { POLICIES } from '@/mocks/group-pas/policy-admin/policies';
import { PROPOSALS } from '@/mocks/group-pas/issuance/proposals';
import { mockDelay } from './_mockDelay';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export interface ClientPolicyItem {
  policyId: string;
  policyNumber: string;
  policyType: string;
  effectiveDate: string;
  expiryDate: string;
  state: string;
}

export interface ClientQuoteItem {
  proposalId: string;
  quoteId: string;
  state: string;
}

export interface ClientRenewalDue {
  policyId: string;
  policyNumber: string;
  expiryDate: string;
  daysUntilExpiry: number;
}

export interface ClientDocument {
  id: string;
  name: string;
  type: string;
  date: string;
}

export interface ClientDashboardData {
  activePolicies: ClientPolicyItem[];
  quotesToReview: ClientQuoteItem[];
  memberCount: number;
  renewalDue: ClientRenewalDue | null;
  recentDocuments: ClientDocument[];
  isLoading: boolean;
}

// ─────────────────────────────────────────────────────────────────────────────
// Hook
// ─────────────────────────────────────────────────────────────────────────────

const MS_PER_DAY = 86_400_000;

function daysUntil(dateStr: string): number {
  return Math.round((new Date(dateStr).getTime() - Date.now()) / MS_PER_DAY);
}

// Simulate the logged-in client: use the first ACTIVE client (CLI-0005 from proposals has a policy)
const DEMO_CLIENT_ID = 'CLI-0005';

export function useClientDashboard(): ClientDashboardData {
  const [isLoading, setIsLoading] = useState(true);
  const [data, setData] = useState<Omit<ClientDashboardData, 'isLoading'>>({
    activePolicies: [],
    quotesToReview: [],
    memberCount: 0,
    renewalDue: null,
    recentDocuments: [],
  });

  useEffect(() => {
    let cancelled = false;
    mockDelay().then(() => {
      if (cancelled) return;

      const clientPolicies = POLICIES.filter((p) => p.clientId === DEMO_CLIENT_ID);

      const activePolicies: ClientPolicyItem[] = clientPolicies
        .filter(
          (p): p is typeof p & { effectiveDate: string; expiryDate: string } =>
            p.state === 'ACTIVE' &&
            p.effectiveDate != null &&
            p.expiryDate != null,
        )
        .map((p) => ({
          policyId: p.id,
          policyNumber: p.policyNumber,
          policyType: p.policyType,
          effectiveDate: p.effectiveDate,
          expiryDate: p.expiryDate,
          state: p.state,
        }));

      const quotesToReview: ClientQuoteItem[] = PROPOSALS.filter(
        (p) =>
          p.clientId === DEMO_CLIENT_ID &&
          (p.state === 'SUBMITTED' || p.state === 'DRAFT'),
      ).map((p) => ({
        proposalId: p.id,
        quoteId: p.quoteId,
        state: p.state,
      }));

      const memberCount = clientPolicies.reduce(
        (sum, p) => sum + (p.estimatedPremium ? 1 : 0) * 45,
        0,
      );

      const soonest = activePolicies
        .map((p) => ({ ...p, daysUntilExpiry: daysUntil(p.expiryDate) }))
        .sort((a, b) => a.daysUntilExpiry - b.daysUntilExpiry)[0];

      const renewalDue: ClientRenewalDue | null = soonest
        ? {
            policyId: soonest.policyId,
            policyNumber: soonest.policyNumber,
            expiryDate: soonest.expiryDate,
            daysUntilExpiry: soonest.daysUntilExpiry,
          }
        : null;

      const recentDocuments: ClientDocument[] = [
        { id: 'doc-001', name: 'Policy Schedule 2026', type: 'Policy Document', date: '2026-05-01' },
        { id: 'doc-002', name: 'Member Census Upload', type: 'Census', date: '2026-04-20' },
        { id: 'doc-003', name: 'Premium Invoice Q1', type: 'Invoice', date: '2026-04-05' },
      ];

      setData({ activePolicies, quotesToReview, memberCount, renewalDue, recentDocuments });
      setIsLoading(false);
    });
    return () => { cancelled = true; };
  }, []);

  return { ...data, isLoading };
}
