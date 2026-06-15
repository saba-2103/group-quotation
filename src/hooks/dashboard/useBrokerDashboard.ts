'use client';

import { useEffect, useState } from 'react';
import { QUOTES_V2 } from '@/mocks/group-pas/quotation/data';
import { POLICIES } from '@/mocks/group-pas/policy-admin/policies';
import { mockDelay } from './_mockDelay';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export interface BrokerQuoteItem {
  quoteId: string;
  quoteNumber: string;
  clientName: string;
  status: string;
  updatedAt: string;
}

export interface BrokerRenewalItem {
  policyId: string;
  policyNumber: string;
  clientId: string;
  expiryDate: string;
  daysUntilExpiry: number;
}

export interface BrokerDashboardData {
  awaitingDecision: BrokerQuoteItem[];
  quotesInProgress: BrokerQuoteItem[];
  activePolicies: number;
  renewalsDue: BrokerRenewalItem[];
  recentRFQs: BrokerQuoteItem[];
  isLoading: boolean;
}

// ─────────────────────────────────────────────────────────────────────────────
// Hook
// ─────────────────────────────────────────────────────────────────────────────

const MS_PER_DAY = 86_400_000;

function daysUntil(dateStr: string): number {
  return Math.round((new Date(dateStr).getTime() - Date.now()) / MS_PER_DAY);
}

export function useBrokerDashboard(): BrokerDashboardData {
  const [isLoading, setIsLoading] = useState(true);
  const [data, setData] = useState<Omit<BrokerDashboardData, 'isLoading'>>({
    awaitingDecision: [],
    quotesInProgress: [],
    activePolicies: 0,
    renewalsDue: [],
    recentRFQs: [],
  });

  useEffect(() => {
    let cancelled = false;
    mockDelay().then(() => {
      if (cancelled) return;

      // Brokers see quotes routed via broker channel
      const brokerQuotes = QUOTES_V2.filter((q) => q.broker_id != null);

      const toItem = (q: typeof QUOTES_V2[number]): BrokerQuoteItem => ({
        quoteId: q.id,
        quoteNumber: q.quote_number,
        clientName: q.client_name,
        status: q.status,
        updatedAt: q.last_updated_at,
      });

      const awaitingDecision = brokerQuotes
        .filter((q) => q.status === 'ACTIVE')
        .map(toItem);

      const quotesInProgress = brokerQuotes
        .filter((q) => q.status === 'DRAFT' || q.status === 'ACTIVE')
        .map(toItem);

      const recentRFQs = brokerQuotes.slice(0, 5).map(toItem);

      const activePolicies = POLICIES.filter((p) => p.state === 'ACTIVE').length;

      const renewalsDue: BrokerRenewalItem[] = POLICIES.filter(
        (p): p is typeof p & { expiryDate: string } =>
          p.state === 'ACTIVE' && p.expiryDate != null,
      )
        .map((p) => ({
          policyId: p.id,
          policyNumber: p.policyNumber,
          clientId: p.clientId,
          expiryDate: p.expiryDate,
          daysUntilExpiry: daysUntil(p.expiryDate),
        }))
        .sort((a, b) => a.daysUntilExpiry - b.daysUntilExpiry);

      setData({ awaitingDecision, quotesInProgress, activePolicies, renewalsDue, recentRFQs });
      setIsLoading(false);
    });
    return () => { cancelled = true; };
  }, []);

  return { ...data, isLoading };
}
