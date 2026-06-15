'use client';

import { useCallback, useEffect, useState } from 'react';
import { ACTUARY_QUEUE_ITEMS, QUOTES_V2 } from '@/mocks/group-pas/quotation/data';
import type { ActuaryQueueItem, RoundOutcome, SchemeType } from '@/types/group-pas/quotation-v2';
import { mockDelay } from './_mockDelay';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export type ActuaryCasePriority = 'URGENT' | 'HIGH' | 'NORMAL' | 'LOW';

export interface ActuaryCaseItem {
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
  priority: ActuaryCasePriority;
  assignedToName?: string;
  isCounterFollowUp: boolean; // previous round was rejected (counter), awaiting Sales re-escalation
}

export interface DiscountApprovalItem {
  id: string;           // stable mock id
  versionId: string;
  quoteId: string;
  quoteNumber: string;
  clientName: string;
  discountLabel: string;
  discountPct: number;
  requestedBy: string;
  requestedDaysAgo: number;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
}

export interface EscalationMonthPoint {
  month: string;        // e.g. "Jan"
  total: number;
  escalated: number;
  ratePct: number;
}

export interface ActuaryRecentResolution {
  versionId: string;
  quoteId: string;
  quoteNumber: string;
  clientName: string;
  outcome: RoundOutcome;
  completedAt: string;
  roundNumber: number;
}

export interface RIConsultationItem {
  versionId: string;
  quoteId: string;
  quoteNumber: string;
  clientName: string;
  riPartnerName: string;
  riReferenceNumber: string;
  consultedDaysAgo: number;
  isStale: boolean;
}

export interface ActuaryDashboardData {
  openCases: ActuaryCaseItem[];
  overdueCases: ActuaryCaseItem[];
  resolvedThisWeek: number;
  approvedThisWeek: number;
  rejectedThisWeek: number;
  avgTurnaroundDays: number;
  avgTurnaroundTrendDays: number;
  escalationRatePct: number;
  counterRatePct: number;
  acceptRatePct: number;
  escalationTrend: EscalationMonthPoint[];
  pendingDiscounts: DiscountApprovalItem[];
  recentResolutions: ActuaryRecentResolution[];
  riPendingCases: RIConsultationItem[];
  unassignedCount: number;
  isLoading: boolean;
  // Optimistic action: approve/reject a discount
  approveDiscount: (id: string) => void;
  rejectDiscount: (id: string) => void;
}

// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────

const SLA_HOURS = 72; // 3 days

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

const MS_PER_HOUR = 3_600_000;
const MS_PER_DAY = 86_400_000;

function elapsedHoursFrom(dateStr: string): number {
  return Math.round((Date.now() - new Date(dateStr).getTime()) / MS_PER_HOUR);
}

function derivePriority(item: ActuaryQueueItem, elapsedHours: number): ActuaryCasePriority {
  if (elapsedHours > SLA_HOURS) return 'URGENT';
  if (elapsedHours > SLA_HOURS * 0.66) return 'HIGH';
  if (elapsedHours > SLA_HOURS * 0.33) return 'NORMAL';
  return 'LOW';
}

function toCaseItem(item: ActuaryQueueItem, quoteId: string, isCounterFollowUp: boolean): ActuaryCaseItem {
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
    isCounterFollowUp,
  };
}

// Generates 6 months of synthetic escalation trend data seeded from real round_log
function buildEscalationTrend(): EscalationMonthPoint[] {
  const now = new Date();
  const points: EscalationMonthPoint[] = [];

  // Seed actual rounds into monthly buckets
  const monthBuckets: Record<string, { total: number; escalated: number }> = {};

  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = `${d.getFullYear()}-${d.getMonth()}`;
    monthBuckets[key] = { total: 0, escalated: 0 };
  }

  QUOTES_V2.forEach((q) => {
    q.versions.forEach((v) => {
      v.round_log?.forEach((r) => {
        if (r.roundKind !== 'PRICING' || !r.completedAt) return;
        const d = new Date(r.completedAt);
        const key = `${d.getFullYear()}-${d.getMonth()}`;
        if (key in monthBuckets) {
          monthBuckets[key].total++;
          if (r.outcome === 'REJECTED') monthBuckets[key].escalated++;
        }
      });
    });
  });

  const MONTH_ABBREV = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  // Fill sparse data with plausible mock numbers
  const MOCK_BASELINE = [12, 15, 18, 14, 20, 16];
  const MOCK_ESCALATED = [2, 4, 5, 3, 6, 3];
  let idx = 0;
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = `${d.getFullYear()}-${d.getMonth()}`;
    const bucket = monthBuckets[key];
    const total = bucket.total > 0 ? bucket.total : MOCK_BASELINE[idx];
    const escalated = bucket.escalated > 0 ? bucket.escalated : MOCK_ESCALATED[idx];
    points.push({
      month: MONTH_ABBREV[d.getMonth()],
      total,
      escalated,
      ratePct: total > 0 ? Math.round((escalated / total) * 100) : 0,
    });
    idx++;
  }
  return points;
}

// Static mock discount approvals (pending_approval queue doesn't exist in type system yet)
const INITIAL_DISCOUNTS: DiscountApprovalItem[] = [
  {
    id: 'disc-001',
    versionId: 'VER-V2-0003-A',
    quoteId: 'QTE-V2-0003',
    quoteNumber: 'QN-2026-0003',
    clientName: 'Zenith Textiles',
    discountLabel: 'Loyalty Discount',
    discountPct: 7,
    requestedBy: 'Alex Carter',
    requestedDaysAgo: 2,
    status: 'PENDING',
  },
  {
    id: 'disc-002',
    versionId: 'VER-V2-0002-A',
    quoteId: 'QTE-V2-0002',
    quoteNumber: 'QN-2026-0002',
    clientName: 'ACME Corp',
    discountLabel: 'Volume Discount',
    discountPct: 5,
    requestedBy: 'Alex Carter',
    requestedDaysAgo: 4,
    status: 'PENDING',
  },
  {
    id: 'disc-003',
    versionId: 'VER-V2-0001-A',
    quoteId: 'QTE-V2-0001',
    quoteNumber: 'QN-2026-0001',
    clientName: 'BrightStar Logistics',
    discountLabel: 'New Business Incentive',
    discountPct: 3,
    requestedBy: 'Alex Carter',
    requestedDaysAgo: 1,
    status: 'PENDING',
  },
];

const MOCK_RI: RIConsultationItem[] = [
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
];

// ─────────────────────────────────────────────────────────────────────────────
// Hook
// ─────────────────────────────────────────────────────────────────────────────

export function useActuaryDashboard(): ActuaryDashboardData {
  const [isLoading, setIsLoading] = useState(true);
  const [discounts, setDiscounts] = useState<DiscountApprovalItem[]>(INITIAL_DISCOUNTS);
  const [data, setData] = useState<Omit<ActuaryDashboardData, 'isLoading' | 'pendingDiscounts' | 'approveDiscount' | 'rejectDiscount'>>({
    openCases: [],
    overdueCases: [],
    resolvedThisWeek: 0,
    approvedThisWeek: 0,
    rejectedThisWeek: 0,
    avgTurnaroundDays: 0,
    avgTurnaroundTrendDays: 0,
    escalationRatePct: 0,
    counterRatePct: 0,
    acceptRatePct: 0,
    escalationTrend: [],
    recentResolutions: [],
    riPendingCases: MOCK_RI,
    unassignedCount: 0,
  });

  useEffect(() => {
    let cancelled = false;
    mockDelay().then(() => {
      if (cancelled) return;

      const quoteIdByVersion = new Map<string, string>();
      QUOTES_V2.forEach((q) =>
        q.versions.forEach((v) => quoteIdByVersion.set(v.version_id, q.id)),
      );

      // Detect counter follow-ups: version where the last PRICING round was REJECTED
      const counterFollowUpVersionIds = new Set<string>(
        QUOTES_V2.flatMap((q) =>
          q.versions
            .filter((v) => {
              const pricingRounds = v.round_log?.filter((r) => r.roundKind === 'PRICING') ?? [];
              const last = pricingRounds[pricingRounds.length - 1];
              return last?.outcome === 'REJECTED';
            })
            .map((v) => v.version_id),
        ),
      );

      const allCases: ActuaryCaseItem[] = ACTUARY_QUEUE_ITEMS.map((item) =>
        toCaseItem(
          item,
          quoteIdByVersion.get(item.version_id) ?? item.quote_id,
          counterFollowUpVersionIds.has(item.version_id),
        ),
      ).sort((a, b) => {
        if (a.isOverdue !== b.isOverdue) return a.isOverdue ? -1 : 1;
        return b.elapsedHours - a.elapsedHours;
      });

      const overdueCases = allCases.filter((c) => c.isOverdue);
      const unassignedCount = ACTUARY_QUEUE_ITEMS.filter((i) => !i.assigned_to).length;

      const weekCutoff = Date.now() - 7 * MS_PER_DAY;
      const thirtyDayCutoff = Date.now() - 30 * MS_PER_DAY;
      const prevThirtyDayCutoff = Date.now() - 60 * MS_PER_DAY;

      let approvedThisWeek = 0;
      let rejectedThisWeek = 0;
      let totalClosed = 0;
      let totalAccepted = 0;
      let totalRejected = 0;
      let totalWithCounters = 0;
      const currentTurnarounds: number[] = [];
      const prevTurnarounds: number[] = [];
      const recentResolutions: ActuaryRecentResolution[] = [];

      QUOTES_V2.forEach((q) => {
        q.versions.forEach((v) => {
          v.round_log?.forEach((r) => {
            if (r.roundKind !== 'PRICING' || !r.completedAt || !r.outcome) return;
            const completedMs = new Date(r.completedAt).getTime();
            const assignedMs = new Date(r.assignedAt).getTime();
            const turnaroundDays = (completedMs - assignedMs) / MS_PER_DAY;

            totalClosed++;
            if (r.outcome === 'APPROVED') totalAccepted++;
            else if (r.outcome === 'REJECTED') totalRejected++;
            if ((r.parameterOverrides?.length ?? 0) > 0) totalWithCounters++;

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

      recentResolutions.sort(
        (a, b) => new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime(),
      );

      const avg = (arr: number[]) =>
        arr.length > 0 ? arr.reduce((s, v) => s + v, 0) / arr.length : 0;

      const avgTurnaroundDays = parseFloat(avg(currentTurnarounds).toFixed(1));
      const prevAvg = avg(prevTurnarounds);
      const avgTurnaroundTrendDays = prevAvg > 0
        ? parseFloat((prevAvg - avgTurnaroundDays).toFixed(1))
        : 0;

      const escalationRatePct =
        totalClosed > 0 ? Math.round((totalRejected / totalClosed) * 100) : 0;
      const counterRatePct =
        totalClosed > 0 ? Math.round((totalWithCounters / totalClosed) * 100) : 0;
      const acceptRatePct =
        totalClosed > 0 ? Math.round((totalAccepted / totalClosed) * 100) : 0;

      setData({
        openCases: allCases,
        overdueCases,
        resolvedThisWeek: approvedThisWeek + rejectedThisWeek,
        approvedThisWeek,
        rejectedThisWeek,
        avgTurnaroundDays,
        avgTurnaroundTrendDays,
        escalationRatePct,
        counterRatePct,
        acceptRatePct,
        escalationTrend: buildEscalationTrend(),
        recentResolutions: recentResolutions.slice(0, 4),
        riPendingCases: MOCK_RI,
        unassignedCount,
      });
      setIsLoading(false);
    });
    return () => { cancelled = true; };
  }, []);

  const approveDiscount = useCallback((id: string) => {
    setDiscounts((prev) =>
      prev.map((d) => (d.id === id ? { ...d, status: 'APPROVED' } : d)),
    );
  }, []);

  const rejectDiscount = useCallback((id: string) => {
    setDiscounts((prev) =>
      prev.map((d) => (d.id === id ? { ...d, status: 'REJECTED' } : d)),
    );
  }, []);

  const pendingDiscounts = discounts.filter((d) => d.status === 'PENDING');

  return { ...data, isLoading, pendingDiscounts, approveDiscount, rejectDiscount };
}
