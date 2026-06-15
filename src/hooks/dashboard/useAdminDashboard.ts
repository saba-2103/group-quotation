'use client';

import { useEffect, useState } from 'react';
import { QUOTES_V2, UW_QUEUE_ITEMS, ACTUARY_QUEUE_ITEMS } from '@/mocks/group-pas/quotation/data';
import { POLICIES } from '@/mocks/group-pas/policy-admin/policies';
import { PROPOSALS } from '@/mocks/group-pas/issuance/proposals';
import { mockDelay } from './_mockDelay';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export interface AdminPlatformStats {
  openQuotes: number;
  uwCasesOpen: number;
  actuaryCasesOpen: number;
  proposalsInPIM: number;
  policiesIssuedMonth: number;
  policiesIssuedLastMonth: number;
  slaBreachCount: number;
}

export interface AdminSLABreach {
  id: string;
  quoteNumber: string;
  clientName: string;
  assigneeName: string;
  role: 'UW' | 'ACTUARY';
  elapsedHours: number;
  slaHours: number;
  overdueHours: number;
}

export interface AdminTeamMember {
  id: string;
  name: string;
  openCases: number;
  overdueCases: number;
  avgTurnaroundDays: number;
  counterCount?: number; // actuary only — rounds issued as COUNTER
}

export interface AdminTeamWorkload {
  uwMembers: AdminTeamMember[];
  actuaryMembers: AdminTeamMember[];
  uwUnassigned: number;
  actuaryUnassigned: number;
}

export interface AdminFunnelStage {
  label: string;
  count: number;
  pctOfPrev: number; // 0–100
}

export interface AdminFunnelData {
  stages: AdminFunnelStage[];
  avgCycleTimeDays: number;
  quoteToValueAmount: number;
  quoteToValueCurrency: string;
}

export type AdminApprovalType = 'DISCOUNT' | 'LICENSE_ENABLE' | 'CURRENCY_CONFIG' | 'SYSTEM_CONFIG';

export interface AdminPendingApproval {
  id: string;
  type: AdminApprovalType;
  label: string;
  quoteNumber?: string;
  requestedBy: string;
  value?: string;
}

export type IntegrationStatus = 'healthy' | 'degraded' | 'down';

export interface AdminIntegration {
  id: string;
  name: string;
  status: IntegrationStatus;
  latencyP50Ms: number;
  errorRateLastHourPct: number;
}

export interface AdminSystemHealth {
  integrations: AdminIntegration[];
  eventLagMs: number;
  eventLagSparkline: number[];
}

export interface AdminDashboardData {
  platformStats: AdminPlatformStats;
  slaBreaches: AdminSLABreach[];
  teamWorkload: AdminTeamWorkload;
  funnel: AdminFunnelData;
  pendingApprovals: AdminPendingApproval[];
  systemHealth: AdminSystemHealth;
  isLoading: boolean;
}

// ─────────────────────────────────────────────────────────────────────────────
// Constants & static mock data
// ─────────────────────────────────────────────────────────────────────────────

const UW_SLA_H = 96;   // 4 days — must match useUWDashboard
const ACT_SLA_H = 72;  // 3 days — must match useActuaryDashboard

function elapsedHours(dateStr: string): number {
  return Math.round((Date.now() - new Date(dateStr).getTime()) / 3_600_000);
}

const MOCK_INTEGRATIONS: AdminIntegration[] = [
  { id: 're',   name: 'Rule Engine',          status: 'healthy',  latencyP50Ms: 12,  errorRateLastHourPct: 0.0 },
  { id: 'pc',   name: 'Product Configurator', status: 'healthy',  latencyP50Ms: 8,   errorRateLastHourPct: 0.0 },
  { id: 'ccm',  name: 'CCM',                  status: 'degraded', latencyP50Ms: 340, errorRateLastHourPct: 2.1 },
  { id: 'docs', name: 'Document Service',      status: 'healthy',  latencyP50Ms: 55,  errorRateLastHourPct: 0.0 },
  { id: 'pim',  name: 'PIM Module',            status: 'healthy',  latencyP50Ms: 18,  errorRateLastHourPct: 0.0 },
  { id: 'bus',  name: 'Outbox / Event Bus',    status: 'healthy',  latencyP50Ms: 6,   errorRateLastHourPct: 0.0 },
];

const EVENT_LAG_SPARKLINE = [18, 22, 19, 25, 31, 28, 24, 22, 20, 18];

// ─────────────────────────────────────────────────────────────────────────────
// Hook
// ─────────────────────────────────────────────────────────────────────────────

export function useAdminDashboard(): AdminDashboardData {
  const [isLoading, setIsLoading] = useState(true);
  const [data, setData] = useState<Omit<AdminDashboardData, 'isLoading'>>({
    platformStats: {
      openQuotes: 0, uwCasesOpen: 0, actuaryCasesOpen: 0,
      proposalsInPIM: 0, policiesIssuedMonth: 0, policiesIssuedLastMonth: 0, slaBreachCount: 0,
    },
    slaBreaches: [],
    teamWorkload: { uwMembers: [], actuaryMembers: [], uwUnassigned: 0, actuaryUnassigned: 0 },
    funnel: { stages: [], avgCycleTimeDays: 0, quoteToValueAmount: 0, quoteToValueCurrency: 'INR' },
    pendingApprovals: [],
    systemHealth: { integrations: [], eventLagMs: 0, eventLagSparkline: [] },
  });

  useEffect(() => {
    let cancelled = false;
    mockDelay().then(() => {
      if (cancelled) return;

      // ── Platform stats ─────────────────────────────────────────────────────
      const now = new Date();
      const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);
      const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString().slice(0, 10);
      const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0).toISOString().slice(0, 10);

      const openQuotes = QUOTES_V2.filter((q) => q.status === 'DRAFT' || q.status === 'ACTIVE').length;
      const uwCasesOpen = UW_QUEUE_ITEMS.length;
      const actuaryCasesOpen = ACTUARY_QUEUE_ITEMS.length;
      const proposalsInPIM = PROPOSALS.filter((p) => p.state !== 'POLICY_CREATED' && p.state !== 'CANCELLED').length;
      const policiesIssuedMonth = POLICIES.filter(
        (p) => p.effectiveDate != null && p.effectiveDate >= thisMonthStart,
      ).length;
      const policiesIssuedLastMonth = POLICIES.filter(
        (p) => p.effectiveDate != null && p.effectiveDate >= lastMonthStart && p.effectiveDate <= lastMonthEnd,
      ).length;

      // ── SLA breaches ───────────────────────────────────────────────────────
      const uwBreaches: AdminSLABreach[] = UW_QUEUE_ITEMS.filter(
        (item) => elapsedHours(item.referred_at) > UW_SLA_H,
      ).map((item) => {
        const eh = elapsedHours(item.referred_at);
        return {
          id: item.version_id,
          quoteNumber: item.quote_number,
          clientName: item.client_name,
          assigneeName: item.assigned_to_name ?? 'Unassigned',
          role: 'UW' as const,
          elapsedHours: eh,
          slaHours: UW_SLA_H,
          overdueHours: eh - UW_SLA_H,
        };
      });

      const actuaryBreaches: AdminSLABreach[] = ACTUARY_QUEUE_ITEMS.filter(
        (item) => elapsedHours(item.referred_at) > ACT_SLA_H,
      ).map((item) => {
        const eh = elapsedHours(item.referred_at);
        return {
          id: item.version_id,
          quoteNumber: item.quote_number,
          clientName: item.client_name,
          assigneeName: item.assigned_to_name ?? 'Unassigned',
          role: 'ACTUARY' as const,
          elapsedHours: eh,
          slaHours: ACT_SLA_H,
          overdueHours: eh - ACT_SLA_H,
        };
      });

      const slaBreaches = [...uwBreaches, ...actuaryBreaches];
      const slaBreachCount = slaBreaches.length;

      // ── Team workload — UW ─────────────────────────────────────────────────
      const uwByPerson = new Map<string, { name: string; items: typeof UW_QUEUE_ITEMS }>();
      UW_QUEUE_ITEMS.forEach((item) => {
        const key = item.assigned_to ?? '__unassigned__';
        const name = item.assigned_to_name ?? 'Unassigned';
        if (!uwByPerson.has(key)) uwByPerson.set(key, { name, items: [] });
        uwByPerson.get(key)!.items.push(item);
      });

      const uwMembers: AdminTeamMember[] = [];
      let uwUnassigned = 0;
      uwByPerson.forEach(({ name, items }, key) => {
        if (key === '__unassigned__') { uwUnassigned = items.length; return; }
        const overdueCases = items.filter((i) => elapsedHours(i.referred_at) > UW_SLA_H).length;
        const completedUwRounds = QUOTES_V2.flatMap((q) =>
          q.versions.flatMap((v) =>
            v.round_log.filter((r) => r.roundKind === 'UW' && r.assignedTo === key && r.completedAt != null),
          ),
        );
        const avgH = completedUwRounds.length > 0
          ? completedUwRounds.reduce((acc, r) => {
              return acc + Math.round((new Date(r.completedAt!).getTime() - new Date(r.assignedAt).getTime()) / 3_600_000);
            }, 0) / completedUwRounds.length
          : 48;
        uwMembers.push({ id: key, name, openCases: items.length, overdueCases, avgTurnaroundDays: Math.round(avgH / 24 * 10) / 10 });
      });

      // ── Team workload — Actuary ────────────────────────────────────────────
      const actByPerson = new Map<string, { name: string; items: typeof ACTUARY_QUEUE_ITEMS }>();
      ACTUARY_QUEUE_ITEMS.forEach((item) => {
        const key = item.assigned_to ?? '__unassigned__';
        const name = item.assigned_to_name ?? 'Unassigned';
        if (!actByPerson.has(key)) actByPerson.set(key, { name, items: [] });
        actByPerson.get(key)!.items.push(item);
      });

      const actuaryMembers: AdminTeamMember[] = [];
      let actuaryUnassigned = 0;
      actByPerson.forEach(({ name, items }, key) => {
        if (key === '__unassigned__') { actuaryUnassigned = items.length; return; }
        const overdueCases = items.filter((i) => elapsedHours(i.referred_at) > ACT_SLA_H).length;
        const completedActRounds = QUOTES_V2.flatMap((q) =>
          q.versions.flatMap((v) =>
            v.round_log.filter((r) => r.roundKind === 'PRICING' && r.assignedTo === key && r.completedAt != null),
          ),
        );
        const avgH = completedActRounds.length > 0
          ? completedActRounds.reduce((acc, r) => {
              return acc + Math.round((new Date(r.completedAt!).getTime() - new Date(r.assignedAt).getTime()) / 3_600_000);
            }, 0) / completedActRounds.length
          : 36;
        // RoundOutcome doesn't include COUNTER in the type system; derive from parameterOverrides as proxy
        const counterCount = completedActRounds.filter((r) => (r.parameterOverrides?.length ?? 0) > 0).length;
        actuaryMembers.push({ id: key, name, openCases: items.length, overdueCases, avgTurnaroundDays: Math.round(avgH / 24 * 10) / 10, counterCount });
      });

      const teamWorkload: AdminTeamWorkload = { uwMembers, actuaryMembers, uwUnassigned, actuaryUnassigned };

      // ── Conversion funnel ──────────────────────────────────────────────────
      const allVersions = QUOTES_V2.flatMap((q) => q.versions);
      const quotesCreated = QUOTES_V2.length;
      const vsSubmitted = allVersions.filter((v) => ['SUBMITTED', 'SENT_TO_CLIENT', 'ACCEPTED', 'FINALIZED'].includes(v.status)).length;
      const vsSentToClient = allVersions.filter((v) => ['SENT_TO_CLIENT', 'ACCEPTED', 'FINALIZED'].includes(v.status)).length;
      const vsAccepted = allVersions.filter((v) => ['ACCEPTED', 'FINALIZED'].includes(v.status)).length;
      const quotesFinalized = QUOTES_V2.filter((q) => q.status === 'FINALIZED').length;
      const policiesIssued = POLICIES.length;

      const pct = (a: number, b: number) => (b === 0 ? 0 : Math.round((a / b) * 100));
      const stages: AdminFunnelStage[] = [
        { label: 'RFQs / Quotes Created',    count: quotesCreated,  pctOfPrev: 100 },
        { label: 'Versions Submitted',         count: vsSubmitted,    pctOfPrev: pct(vsSubmitted, quotesCreated) },
        { label: 'Versions Sent to Client',    count: vsSentToClient, pctOfPrev: pct(vsSentToClient, vsSubmitted) },
        { label: 'Versions Accepted',          count: vsAccepted,     pctOfPrev: pct(vsAccepted, vsSentToClient) },
        { label: 'Quotes Finalized',           count: quotesFinalized, pctOfPrev: pct(quotesFinalized, vsAccepted) },
        { label: 'Policies Issued',            count: policiesIssued, pctOfPrev: pct(policiesIssued, quotesFinalized) },
      ];

      const quoteToValueAmount = POLICIES.reduce((acc, p) => acc + p.estimatedPremium.amount, 0);
      const funnel: AdminFunnelData = {
        stages,
        avgCycleTimeDays: 18, // static mock — real value requires created_at → policy inception tracking
        quoteToValueAmount,
        quoteToValueCurrency: 'INR',
      };

      // ── Pending approvals ──────────────────────────────────────────────────
      const pendingApprovals: AdminPendingApproval[] = [
        {
          id: 'APP-001',
          type: 'DISCOUNT',
          label: '15% group discount — QN-2026-0004 (BrightStar Logistics)',
          quoteNumber: 'QN-2026-0004',
          requestedBy: 'Alex Carter',
          value: '15%',
        },
        {
          id: 'APP-002',
          type: 'LICENSE_ENABLE',
          label: 'Enable GCL composite product license — BrightStar Logistics',
          requestedBy: 'Morgan Kim',
        },
        {
          id: 'APP-003',
          type: 'CURRENCY_CONFIG',
          label: 'Add USD as accepted premium currency',
          requestedBy: 'Sam Patel',
          value: 'USD',
        },
      ];

      // ── System health ──────────────────────────────────────────────────────
      const systemHealth: AdminSystemHealth = {
        integrations: MOCK_INTEGRATIONS,
        eventLagMs: EVENT_LAG_SPARKLINE[EVENT_LAG_SPARKLINE.length - 1],
        eventLagSparkline: EVENT_LAG_SPARKLINE,
      };

      const platformStats: AdminPlatformStats = {
        openQuotes,
        uwCasesOpen,
        actuaryCasesOpen,
        proposalsInPIM,
        policiesIssuedMonth,
        policiesIssuedLastMonth,
        slaBreachCount,
      };

      setData({ platformStats, slaBreaches, teamWorkload, funnel, pendingApprovals, systemHealth });
      setIsLoading(false);
    });
    return () => { cancelled = true; };
  }, []);

  return { ...data, isLoading };
}
