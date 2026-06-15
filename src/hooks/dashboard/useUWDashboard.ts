'use client';

import { useEffect, useState } from 'react';
import { UW_QUEUE_ITEMS, QUOTES_V2 } from '@/mocks/group-pas/quotation/data';
import type { RoundOutcome, SchemeType, UWQueueItem } from '@/types/group-pas/quotation-v2';
import { mockDelay } from './_mockDelay';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export type UWCasePriority = 'URGENT' | 'HIGH' | 'NORMAL' | 'LOW';

export interface UWCaseItem {
  versionId: string;
  quoteId: string;
  quoteNumber: string;
  versionNumber: number;
  clientName: string;
  schemeType: SchemeType;
  roundNumber: number;
  referredAt: string;
  slaHours: number;
  elapsedHours: number;
  isOverdue: boolean;
  priority: UWCasePriority;
  assignedToName?: string;
}

export interface RIConsultationItem {
  versionId: string;
  quoteId: string;
  quoteNumber: string;
  clientName: string;
  riPartnerName: string;
  riReferenceNumber: string;
  consultedDaysAgo: number;
  isStale: boolean; // > 3 days
}

export interface RecentResolutionItem {
  versionId: string;
  quoteId: string;
  quoteNumber: string;
  clientName: string;
  outcome: RoundOutcome;
  completedAt: string;
  roundNumber: number;
}

export interface UWDashboardData {
  openCases: UWCaseItem[];
  overdueCases: UWCaseItem[];
  resolvedThisWeek: number;
  approvedThisWeek: number;
  rejectedThisWeek: number;
  avgTurnaroundDays: number;
  avgTurnaroundTrendDays: number; // vs previous 30d (positive = faster)
  riPendingCases: RIConsultationItem[];
  recentResolutions: RecentResolutionItem[];
  unassignedCount: number;
  isLoading: boolean;
}

// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────

const SLA_HOURS = 96; // 4 days

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

const MS_PER_HOUR = 3_600_000;
const MS_PER_DAY = 86_400_000;

function elapsedHoursFrom(dateStr: string): number {
  return Math.round((Date.now() - new Date(dateStr).getTime()) / MS_PER_HOUR);
}

function derivePriority(item: UWQueueItem, elapsedHours: number): UWCasePriority {
  if (elapsedHours > SLA_HOURS) return 'URGENT';
  if (item.industry_hazard_band === 'VERY_HIGH' || item.industry_hazard_band === 'HIGH') return 'HIGH';
  if (elapsedHours > SLA_HOURS * 0.66) return 'HIGH';
  if (elapsedHours > SLA_HOURS * 0.33) return 'NORMAL';
  return 'LOW';
}

function toUWCaseItem(item: UWQueueItem, quoteId: string): UWCaseItem {
  const elapsedHours = elapsedHoursFrom(item.referred_at);
  return {
    versionId: item.version_id,
    quoteId,
    quoteNumber: item.quote_number,
    versionNumber: item.version_number,
    clientName: item.client_name,
    schemeType: item.scheme_type,
    roundNumber: item.round_number,
    referredAt: item.referred_at,
    slaHours: SLA_HOURS,
    elapsedHours,
    isOverdue: elapsedHours > SLA_HOURS,
    priority: derivePriority(item, elapsedHours),
    assignedToName: item.assigned_to_name,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Mock RI consultation data (no RI fields in the type system yet)
// ─────────────────────────────────────────────────────────────────────────────

const MOCK_RI_CONSULTATIONS: RIConsultationItem[] = [
  {
    versionId: 'VER-V2-0003-A',
    quoteId: 'QTE-V2-0003',
    quoteNumber: 'QN-2026-0003',
    clientName: 'Zenith Textiles',
    riPartnerName: 'SwissRe India',
    riReferenceNumber: 'RI-2026-0041',
    consultedDaysAgo: 4,
    isStale: true,
  },
  {
    versionId: 'VER-V2-0002-A',
    quoteId: 'QTE-V2-0002',
    quoteNumber: 'QN-2026-0002',
    clientName: 'ACME Corp',
    riPartnerName: 'Munich Re',
    riReferenceNumber: 'RI-2026-0038',
    consultedDaysAgo: 1,
    isStale: false,
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// Hook
// ─────────────────────────────────────────────────────────────────────────────

export function useUWDashboard(): UWDashboardData {
  const [isLoading, setIsLoading] = useState(true);
  const [data, setData] = useState<Omit<UWDashboardData, 'isLoading'>>({
    openCases: [],
    overdueCases: [],
    resolvedThisWeek: 0,
    approvedThisWeek: 0,
    rejectedThisWeek: 0,
    avgTurnaroundDays: 0,
    avgTurnaroundTrendDays: 0,
    riPendingCases: [],
    recentResolutions: [],
    unassignedCount: 0,
  });

  useEffect(() => {
    let cancelled = false;
    mockDelay().then(() => {
      if (cancelled) return;

      // Build case items with enriched fields, preserving quoteId
      const quoteIdByVersion = new Map<string, string>();
      QUOTES_V2.forEach((q) => q.versions.forEach((v) => quoteIdByVersion.set(v.version_id, q.id)));

      const allCases: UWCaseItem[] = UW_QUEUE_ITEMS.map((item) =>
        toUWCaseItem(item, quoteIdByVersion.get(item.version_id) ?? item.quote_id),
      );

      // Sort: overdue first, then by elapsed desc
      const openCases = [...allCases].sort((a, b) => {
        if (a.isOverdue !== b.isOverdue) return a.isOverdue ? -1 : 1;
        return b.elapsedHours - a.elapsedHours;
      });

      const overdueCases = openCases.filter((c) => c.isOverdue);
      const unassignedCount = UW_QUEUE_ITEMS.filter((i) => !i.assigned_to).length;

      // Resolved rounds from round_log
      const weekCutoff = Date.now() - 7 * 24 * MS_PER_HOUR;
      const thirtyDayCutoff = Date.now() - 30 * MS_PER_DAY;
      const prevThirtyDayCutoff = Date.now() - 60 * MS_PER_DAY;

      let approvedThisWeek = 0;
      let rejectedThisWeek = 0;
      const currentTurnarounds: number[] = [];
      const prevTurnarounds: number[] = [];
      const recentResolutions: RecentResolutionItem[] = [];

      QUOTES_V2.forEach((q) => {
        q.versions.forEach((v) => {
          v.round_log?.forEach((r) => {
            if (r.roundKind !== 'UW' || !r.completedAt || !r.outcome) return;
            const completedMs = new Date(r.completedAt).getTime();
            const assignedMs = new Date(r.assignedAt).getTime();
            const turnaroundDays = (completedMs - assignedMs) / MS_PER_DAY;

            if (completedMs > weekCutoff) {
              if (r.outcome === 'APPROVED') approvedThisWeek++;
              else if (r.outcome === 'REJECTED') rejectedThisWeek++;
            }

            if (completedMs > thirtyDayCutoff) {
              currentTurnarounds.push(turnaroundDays);
            } else if (completedMs > prevThirtyDayCutoff) {
              prevTurnarounds.push(turnaroundDays);
            }

            recentResolutions.push({
              versionId: v.version_id,
              quoteId: q.id,
              quoteNumber: q.quote_number,
              clientName: q.client_name,
              outcome: r.outcome as RoundOutcome,
              completedAt: r.completedAt,
              roundNumber: r.roundNumber,
            });
          });
        });
      });

      // Sort recent resolutions newest first, keep last 4
      recentResolutions.sort(
        (a, b) => new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime(),
      );
      const top4 = recentResolutions.slice(0, 4);

      const avg = (arr: number[]) =>
        arr.length > 0 ? arr.reduce((s, v) => s + v, 0) / arr.length : 0;

      const avgTurnaroundDays = parseFloat(avg(currentTurnarounds).toFixed(1));
      const prevAvg = avg(prevTurnarounds);
      // positive = got faster (shorter than previous period)
      const avgTurnaroundTrendDays = prevAvg > 0
        ? parseFloat((prevAvg - avgTurnaroundDays).toFixed(1))
        : 0;

      const resolvedThisWeek = approvedThisWeek + rejectedThisWeek;

      setData({
        openCases,
        overdueCases,
        resolvedThisWeek,
        approvedThisWeek,
        rejectedThisWeek,
        avgTurnaroundDays,
        avgTurnaroundTrendDays,
        riPendingCases: MOCK_RI_CONSULTATIONS,
        recentResolutions: top4,
        unassignedCount,
      });
      setIsLoading(false);
    });
    return () => { cancelled = true; };
  }, []);

  return { ...data, isLoading };
}
