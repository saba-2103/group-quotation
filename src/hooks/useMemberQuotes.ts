'use client';

import { useCallback, useEffect, useState } from 'react';
import { MEMBER_QUOTES_V2, QUOTES_V2 } from '@/mocks/group-pas/quotation/data';
import type { MemberQuoteV2, MemberQuoteV2Status } from '@/types/group-pas/quotation-v2';

// ─────────────────────────────────────────────────────────────────────────────
// Public types
// ─────────────────────────────────────────────────────────────────────────────

export interface NewMemberQuoteInput {
  quote_id: string;
  plan_id: string;
  plan_name: string;
  member_name: string;
  member_dob: string;           // ISODate
  member_role_occupation?: string;
  loan_reference: string;
  loan_amount_value: number;
  loan_amount_currency: string;
  loan_tenure_months?: number;
  loan_disbursement_date?: string;  // ISODate
  notes?: string;
}

export interface UseMemberQuotesResult {
  items: MemberQuoteV2[];
  isLoading: boolean;
  error: Error | null;
  /** Create and immediately add to in-memory store. Returns the new id. */
  createMemberQuote: (input: NewMemberQuoteInput) => string;
  /** Move a DRAFT quote to SUBMITTED. */
  submitMemberQuote: (id: string) => void;
  refetch: () => void;
}

// ─────────────────────────────────────────────────────────────────────────────
// GCL parent quote selector helper
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Returns all active GCL quotes that a partner agent can link member quotes to.
 */
export function getActiveGclQuotes() {
  return QUOTES_V2.filter(
    (q) => q.scheme_type === 'GCL' && (q.status === 'ACTIVE' || q.status === 'FINALIZED'),
  ).map((q) => ({
    id: q.id,
    quote_number: q.quote_number,
    client_name: q.client_name,
    plans: q.versions[q.versions.length - 1]?.plans ?? [],
  }));
}

// ─────────────────────────────────────────────────────────────────────────────
// Module-level mutable store
// ─────────────────────────────────────────────────────────────────────────────

let _store: MemberQuoteV2[] = [...MEMBER_QUOTES_V2];
let _nextSeq = _store.length + 1;
const _listeners: Set<() => void> = new Set();

function notifyAll() {
  _listeners.forEach((fn) => fn());
}

// ─────────────────────────────────────────────────────────────────────────────
// Hook
// ─────────────────────────────────────────────────────────────────────────────

export function useMemberQuotes(): UseMemberQuotesResult {
  const [items, setItems] = useState<MemberQuoteV2[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error] = useState<Error | null>(null);

  const load = useCallback(() => {
    setIsLoading(true);
    const timer = setTimeout(() => {
      setItems([..._store]);
      setIsLoading(false);
    }, 150);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    const cleanup = load();
    _listeners.add(load);
    return () => {
      _listeners.delete(load);
      cleanup?.();
    };
  }, [load]);

  const createMemberQuote = useCallback((input: NewMemberQuoteInput): string => {
    const id = `MQV2-${String(_nextSeq++).padStart(4, '0')}`;
    const now = new Date().toISOString();

    // Derive parent quote info
    const parentQuote = QUOTES_V2.find((q) => q.id === input.quote_id);
    const coverageFactor = 1.0; // GCL SA = 100% of loan amount (simplified)
    const sumAssuredAmount = Math.round(input.loan_amount_value * coverageFactor);

    const newItem: MemberQuoteV2 = {
      id,
      quote_id: input.quote_id,
      parent_quote_number: parentQuote?.quote_number,
      parent_client_name: parentQuote?.client_name,
      member_name: input.member_name,
      member_dob: input.member_dob,
      member_role_occupation: input.member_role_occupation,
      loan_reference: input.loan_reference,
      loan_amount: { amount: input.loan_amount_value, currency: input.loan_amount_currency as 'INR' | 'USD' },
      loan_tenure_months: input.loan_tenure_months,
      loan_disbursement_date: input.loan_disbursement_date,
      sum_assured: { amount: sumAssuredAmount, currency: input.loan_amount_currency as 'INR' | 'USD' },
      plan_id: input.plan_id,
      plan_name: input.plan_name,
      notes: input.notes,
      status: 'DRAFT',
      created_at: now,
      created_by: 'Morgan Kim', // mock current user (PARTNER_AGENT)
    };

    _store = [newItem, ..._store];
    notifyAll();
    return id;
  }, []);

  const submitMemberQuote = useCallback((id: string) => {
    _store = _store.map((item) =>
      item.id === id && item.status === 'DRAFT'
        ? { ...item, status: 'SUBMITTED' as MemberQuoteV2Status, submitted_at: new Date().toISOString() }
        : item,
    );
    notifyAll();
  }, []);

  const refetch = useCallback(() => load(), [load]);

  return { items, isLoading, error, createMemberQuote, submitMemberQuote, refetch };
}
