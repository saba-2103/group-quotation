'use client';

import { useCallback, useEffect, useState } from 'react';
import { QUOTES_V2 } from '@/mocks/group-pas/quotation/data';
import type {
  Quote,
  QuoteStatus,
  QuoteSummary,
  SchemeType,
} from '@/types/group-pas/quotation-v2';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export interface QuotesFilter {
  status?: QuoteStatus;
  schemeType?: SchemeType;
  clientName?: string;
  search?: string;
}

export interface UseQuotesResult {
  quotes: Quote[];
  summaries: QuoteSummary[];
  isLoading: boolean;
  error: Error | null;
  createQuote: (draft: Omit<Quote, 'id' | 'quote_number' | 'created_at' | 'last_updated_at' | 'versions' | 'status'>) => Quote;
  updateQuoteStatus: (quoteId: string, status: QuoteStatus) => void;
  refetch: () => void;
}

// ─────────────────────────────────────────────────────────────────────────────
// Module-level mutable store (shared across hook instances in the same session)
// ─────────────────────────────────────────────────────────────────────────────

let _store: Quote[] = [...QUOTES_V2];
const _listeners: Set<() => void> = new Set();

function notifyAll() {
  _listeners.forEach((fn) => fn());
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function toSummary(q: Quote): QuoteSummary {
  const activeVersion = q.versions[q.versions.length - 1];
  return {
    id: q.id,
    quote_number: q.quote_number,
    client_name: q.client_name,
    scheme_type: q.scheme_type,
    business_type: q.business_type,
    status: q.status,
    active_version_status: activeVersion?.status ?? 'DRAFT',
    version_count: q.versions.length,
    premium: activeVersion?.premium?.totalPremium,
    intended_inception_date: q.intended_inception_date,
    created_at: q.created_at,
    last_updated_at: q.last_updated_at,
    created_by: q.created_by,
  };
}

let _quoteSeq = QUOTES_V2.length + 1;
function nextQuoteId(): string {
  return `QTE-V2-${String(_quoteSeq++).padStart(4, '0')}`;
}
function nextQuoteNumber(): string {
  return `QN-2026-${String(_quoteSeq).padStart(4, '0')}`;
}

function applyFilter(quotes: Quote[], filter?: QuotesFilter): Quote[] {
  if (!filter) return quotes;
  return quotes.filter((q) => {
    if (filter.status && q.status !== filter.status) return false;
    if (filter.schemeType && q.scheme_type !== filter.schemeType) return false;
    if (filter.clientName && !q.client_name.toLowerCase().includes(filter.clientName.toLowerCase())) return false;
    if (filter.search) {
      const s = filter.search.toLowerCase();
      if (!q.quote_number.toLowerCase().includes(s) && !q.client_name.toLowerCase().includes(s)) return false;
    }
    return true;
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Hook
// ─────────────────────────────────────────────────────────────────────────────

export function useQuotes(filter?: QuotesFilter): UseQuotesResult {
  const [data, setData] = useState<Quote[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error] = useState<Error | null>(null);
  const [, setTick] = useState(0);

  const load = useCallback(() => {
    setIsLoading(true);
    const timer = setTimeout(() => {
      setData([...applyFilter(_store, filter)]);
      setIsLoading(false);
    }, 200);
    return timer;
  }, // eslint-disable-next-line react-hooks/exhaustive-deps
  [JSON.stringify(filter)]);

  useEffect(() => {
    const timer = load();
    const rerender = () => setTick((t) => t + 1);
    _listeners.add(rerender);
    return () => {
      clearTimeout(timer);
      _listeners.delete(rerender);
    };
  }, [load]);

  // Re-apply filter when store mutates
  const filteredData = applyFilter(_store, filter);

  const createQuote = useCallback(
    (draft: Omit<Quote, 'id' | 'quote_number' | 'created_at' | 'last_updated_at' | 'versions' | 'status'>): Quote => {
      const now = new Date().toISOString();
      const newQuote: Quote = {
        ...draft,
        id: nextQuoteId(),
        quote_number: nextQuoteNumber(),
        status: 'DRAFT',
        versions: [],
        created_at: now,
        last_updated_at: now,
      };
      _store = [newQuote, ..._store];
      notifyAll();
      return newQuote;
    },
    [],
  );

  const updateQuoteStatus = useCallback((quoteId: string, status: QuoteStatus) => {
    _store = _store.map((q) =>
      q.id === quoteId
        ? { ...q, status, last_updated_at: new Date().toISOString() }
        : q,
    );
    notifyAll();
  }, []);

  const refetch = useCallback(() => {
    load();
  }, [load]);

  return {
    quotes: isLoading ? data : filteredData,
    summaries: (isLoading ? data : filteredData).map(toSummary),
    isLoading,
    error,
    createQuote,
    updateQuoteStatus,
    refetch,
  };
}
