'use client';

import { useEffect, useState } from 'react';
import { QUOTES_V2 } from '@/mocks/group-pas/quotation/data';
import type { QuoteVersion, QuoteVersionStatus } from '@/types/group-pas/quotation-v2';
import { mockDelay } from './_mockDelay';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export interface SalesVersionItem {
  versionId: string;
  versionNumber: number;
  quoteId: string;
  quoteNumber: string;
  clientName: string;
  status: QuoteVersionStatus;
  updatedAt: string;
  /** True if this version has ≥1 plan configured. */
  hasPlans: boolean;
  /** True if a rated premium exists on the version. */
  hasPremium: boolean;
  /** ISO date string if the version has an expiry_date or quote intended_expiry_date. */
  expiryDate?: string;
  /** Days until expiry (undefined if no expiry date). */
  daysUntilExpiry?: number;
}

export interface ReferredVersionItem extends SalesVersionItem {
  referralType: 'UW' | 'PRICING';
  roundNumber: number;
  referredAt: string;
  elapsedHours: number;
}

export interface PipelineSegment {
  label: string;
  value: number;
  color: string;
  /** QuoteStatus key(s) this segment represents — for filter navigation. */
  statusKey: string;
}

export interface SalesDashboardData {
  openQuotes: number;
  awaitingReviewCount: number;
  expiringCount: number;
  finalizedThisMonth: number;
  finalizedLastMonth: number;
  expiringVersions: SalesVersionItem[];
  needsActionVersions: SalesVersionItem[];
  pipelineSegments: PipelineSegment[];
  referredVersions: ReferredVersionItem[];
  recentlyFinalized: SalesVersionItem[];
  isLoading: boolean;
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

const MS_PER_DAY = 86_400_000;
const MS_PER_HOUR = 3_600_000;
const EXPIRY_WINDOW_DAYS = 14;

function daysUntil(dateStr: string): number {
  return Math.round((new Date(dateStr).getTime() - Date.now()) / MS_PER_DAY);
}

function elapsedHoursFrom(dateStr: string): number {
  return Math.round((Date.now() - new Date(dateStr).getTime()) / MS_PER_HOUR);
}

function isCurrentMonth(dateStr: string): boolean {
  const d = new Date(dateStr);
  const now = new Date();
  return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
}

function isLastMonth(dateStr: string): boolean {
  const d = new Date(dateStr);
  const now = new Date();
  const last = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  return d.getFullYear() === last.getFullYear() && d.getMonth() === last.getMonth();
}

// ─────────────────────────────────────────────────────────────────────────────
// Hook
// ─────────────────────────────────────────────────────────────────────────────

export function useSalesDashboard(): SalesDashboardData {
  const [isLoading, setIsLoading] = useState(true);
  const [data, setData] = useState<Omit<SalesDashboardData, 'isLoading'>>({
    openQuotes: 0,
    awaitingReviewCount: 0,
    expiringCount: 0,
    finalizedThisMonth: 0,
    finalizedLastMonth: 0,
    expiringVersions: [],
    needsActionVersions: [],
    pipelineSegments: [],
    referredVersions: [],
    recentlyFinalized: [],
  });

  useEffect(() => {
    let cancelled = false;
    mockDelay().then(() => {
      if (cancelled) return;

      // Build rich version items including plan/premium presence and expiry
      const allVersions: SalesVersionItem[] = QUOTES_V2.flatMap((q) =>
        q.versions.map((v: QuoteVersion) => {
          const expiryDate = v.expiry_date ?? q.intended_expiry_date;
          const days = daysUntil(expiryDate);
          return {
            versionId: v.version_id,
            versionNumber: v.version_number,
            quoteId: q.id,
            quoteNumber: q.quote_number,
            clientName: q.client_name,
            status: v.status,
            updatedAt: v.last_updated_at ?? v.created_at,
            hasPlans: (v.plans?.length ?? 0) > 0,
            hasPremium: v.premium != null,
            expiryDate,
            daysUntilExpiry: days,
          };
        }),
      );

      // ── Stat card counts ────────────────────────────────────────────────────

      const openQuotes = QUOTES_V2.filter(
        (q) => q.status === 'DRAFT' || q.status === 'ACTIVE',
      ).length;

      const awaitingReviewCount = allVersions.filter(
        (v) =>
          v.status === 'REFERRED_MANUAL_UW' ||
          v.status === 'REFERRED_MANUAL_PRICING',
      ).length;

      const TERMINAL: QuoteVersionStatus[] = ['SUPERSEDED', 'REJECTED', 'WITHDRAWN', 'EXPIRED', 'FINALIZED'];
      const expiringVersions = allVersions
        .filter(
          (v) =>
            !TERMINAL.includes(v.status) &&
            v.daysUntilExpiry !== undefined &&
            v.daysUntilExpiry <= EXPIRY_WINDOW_DAYS &&
            v.daysUntilExpiry >= 0,
        )
        .sort((a, b) => (a.daysUntilExpiry ?? 999) - (b.daysUntilExpiry ?? 999));

      const expiringCount = expiringVersions.length;

      let finalizedThisMonth = 0;
      let finalizedLastMonth = 0;
      QUOTES_V2.forEach((q) => {
        q.versions.forEach((v) => {
          if (v.status === 'FINALIZED' && v.finalized_at) {
            if (isCurrentMonth(v.finalized_at)) finalizedThisMonth++;
            if (isLastMonth(v.finalized_at)) finalizedLastMonth++;
          }
        });
      });

      // ── Needs action ────────────────────────────────────────────────────────

      const NEEDS_ACTION: QuoteVersionStatus[] = [
        'DRAFT', 'EVALUATED', 'RATED', 'SUBMITTED', 'SENT_TO_CLIENT', 'ACCEPTED',
      ];
      const needsActionVersions = allVersions
        .filter((v) => NEEDS_ACTION.includes(v.status))
        .slice(0, 6);

      // ── Referred versions (with detail) ─────────────────────────────────────

      const referredVersions: ReferredVersionItem[] = QUOTES_V2.flatMap((q) =>
        q.versions
          .filter(
            (v) =>
              v.status === 'REFERRED_MANUAL_UW' ||
              v.status === 'REFERRED_MANUAL_PRICING',
          )
          .map((v) => {
            const referralType: 'UW' | 'PRICING' =
              v.status === 'REFERRED_MANUAL_UW' ? 'UW' : 'PRICING';
            // Latest round matching the referral kind
            const roundKind = referralType === 'UW' ? 'UW' : 'PRICING';
            const latestRound = [...(v.round_log ?? [])]
              .reverse()
              .find((r) => r.roundKind === roundKind);
            const referredAt = latestRound?.assignedAt ?? v.last_updated_at ?? v.created_at;
            const expiryDate = v.expiry_date ?? q.intended_expiry_date;
            return {
              versionId: v.version_id,
              versionNumber: v.version_number,
              quoteId: q.id,
              quoteNumber: q.quote_number,
              clientName: q.client_name,
              status: v.status,
              updatedAt: v.last_updated_at ?? v.created_at,
              hasPlans: (v.plans?.length ?? 0) > 0,
              hasPremium: v.premium != null,
              expiryDate,
              daysUntilExpiry: daysUntil(expiryDate),
              referralType,
              roundNumber: latestRound?.roundNumber ?? 1,
              referredAt,
              elapsedHours: elapsedHoursFrom(referredAt),
            };
          }),
      );

      // ── Recently finalized ──────────────────────────────────────────────────

      const recentlyFinalized = allVersions
        .filter((v) => v.status === 'FINALIZED' || v.status === 'ACCEPTED')
        .slice(0, 5);

      // ── Pipeline by quote status ────────────────────────────────────────────

      const quoteCounts: Record<string, number> = {};
      QUOTES_V2.forEach((q) => {
        quoteCounts[q.status] = (quoteCounts[q.status] ?? 0) + 1;
      });

      const pipelineSegments: PipelineSegment[] = [
        { label: 'Draft', value: quoteCounts['DRAFT'] ?? 0, color: '#a1a1aa', statusKey: 'DRAFT' },
        { label: 'Active', value: quoteCounts['ACTIVE'] ?? 0, color: '#38bdf8', statusKey: 'ACTIVE' },
        { label: 'Finalized', value: quoteCounts['FINALIZED'] ?? 0, color: '#818cf8', statusKey: 'FINALIZED' },
        { label: 'Withdrawn', value: quoteCounts['WITHDRAWN'] ?? 0, color: '#f87171', statusKey: 'WITHDRAWN' },
        { label: 'Expired', value: quoteCounts['EXPIRED'] ?? 0, color: '#fca5a5', statusKey: 'EXPIRED' },
      ].filter((s) => s.value > 0);

      setData({
        openQuotes,
        awaitingReviewCount,
        expiringCount,
        finalizedThisMonth,
        finalizedLastMonth,
        expiringVersions,
        needsActionVersions,
        pipelineSegments,
        referredVersions,
        recentlyFinalized,
      });
      setIsLoading(false);
    });
    return () => { cancelled = true; };
  }, []);

  return { ...data, isLoading };
}
