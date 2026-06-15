'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { Plus, ArrowRight, AlertTriangle } from 'lucide-react';

import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';

import {
  StatCard,
  SLAListItem,
  ActionListItem,
  SectionWidget,
  PipelineBar,
  RenewalCalendarItem,
} from '@/components/widgets/dashboard';
import {
  DashboardLayout,
  DashboardSection,
} from '@/components/layout/DashboardLayout';

import { useSalesDashboard } from '@/hooks/dashboard/useSalesDashboard';
import type { SalesVersionItem, ReferredVersionItem } from '@/hooks/dashboard/useSalesDashboard';
import type { QuoteVersionStatus } from '@/types/group-pas/quotation-v2';
import { VERSION_STATUS_LABEL } from '@/components/quotation/quoteHelpers';

// ─────────────────────────────────────────────────────────────────────────────
// Action hint — what should Sales do next for this version?
// ─────────────────────────────────────────────────────────────────────────────

function actionHint(v: SalesVersionItem): string {
  switch (v.status) {
    case 'DRAFT':
      return v.hasPlans ? '→ Run UW Check' : '→ Configure Plans';
    case 'EVALUATED':
      return '→ Request Pricing';
    case 'RATED':
      return v.hasPremium ? '→ Submit Version' : '→ Calculate Premium';
    case 'SUBMITTED':
      return '→ Send to Client';
    case 'SENT_TO_CLIENT': {
      const days = v.daysUntilExpiry;
      return days !== undefined ? `→ Awaiting client · ${Math.abs(days)}d` : '→ Awaiting client';
    }
    case 'ACCEPTED':
      return '→ Finalize Version';
    default:
      return '';
  }
}

// Map version status to the badge variant used in ActionListItem
const STATUS_BADGE_VARIANT: Partial<
  Record<QuoteVersionStatus, Parameters<typeof ActionListItem>[0]['badge']>
> = {
  DRAFT:                 { text: 'Draft',            variant: 'draft' },
  EVALUATED:             { text: 'Evaluated',         variant: 'evaluated' },
  RATED:                 { text: 'Rated',             variant: 'rated' },
  SUBMITTED:             { text: 'Submitted',         variant: 'submitted' },
  SENT_TO_CLIENT:        { text: 'Sent to Client',    variant: 'sent' },
  ACCEPTED:              { text: 'Accepted',          variant: 'accepted' },
  FINALIZED:             { text: 'Finalized',         variant: 'finalized' },
  REFERRED_MANUAL_UW:    { text: 'Referred — UW',     variant: 'referred' },
  REFERRED_MANUAL_PRICING:{ text: 'Referred — Pricing', variant: 'referred' },
  REJECTED:              { text: 'Rejected',          variant: 'terminal' },
  WITHDRAWN:             { text: 'Withdrawn',         variant: 'terminal' },
  EXPIRED:               { text: 'Expired',           variant: 'terminal' },
};

// ─────────────────────────────────────────────────────────────────────────────
// SLA elapsed → status + display
// ─────────────────────────────────────────────────────────────────────────────

function slaStatus(hours: number): 'ok' | 'warn' | 'overdue' {
  if (hours > 96) return 'overdue'; // > 4d
  if (hours > 48) return 'warn';    // 2–4d
  return 'ok';
}

function formatElapsed(hours: number): string {
  if (hours >= 96) {
    const d = Math.round(hours / 24);
    return `${d}d — OVERDUE`;
  }
  if (hours >= 48) return `${Math.round(hours / 24)}d`;
  return `${hours}h`;
}

// ─────────────────────────────────────────────────────────────────────────────
// Loading skeleton
// ─────────────────────────────────────────────────────────────────────────────

function StatCardsSkeleton() {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <Skeleton key={i} className="h-28 rounded-lg" />
      ))}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main component
// ─────────────────────────────────────────────────────────────────────────────

export function SalesDashboard() {
  const router = useRouter();
  const data = useSalesDashboard();

  const { isLoading } = data;

  // Navigation helpers
  const goToQuotes = (params?: Record<string, string>) => {
    const qs = params ? '?' + new URLSearchParams(params).toString() : '';
    router.push(`/quotation/quotes${qs}`);
  };

  const goToVersion = (quoteId: string, versionId: string, tab?: string) => {
    const path = `/quotation/quotes/${quoteId}/versions/${versionId}`;
    router.push(tab ? `${path}?tab=${tab}` : path);
  };

  // Trend chip for "Finalized This Month"
  const trendDiff = data.finalizedThisMonth - data.finalizedLastMonth;
  const finalizedTrend =
    data.finalizedLastMonth > 0
      ? {
          value: Math.abs(trendDiff),
          direction: trendDiff >= 0 ? ('up' as const) : ('down' as const),
          label: 'vs last month',
        }
      : undefined;

  // Overdue referred count for banner
  const overdueCount = data.referredVersions.filter(
    (v) => slaStatus(v.elapsedHours) === 'overdue',
  ).length;

  return (
    <DashboardLayout>
      {/* ── Section 1: Pipeline stats ─────────────────────────────────────── */}
      <DashboardSection label="Pipeline Stats">
        {isLoading ? (
          <StatCardsSkeleton />
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <StatCard
              value={data.openQuotes}
              label="Open Quotes"
              sub="Draft + Active"
              variant="accent"
              onClick={() => goToQuotes({ status: 'DRAFT,ACTIVE' })}
            />
            <StatCard
              value={data.awaitingReviewCount}
              label="Awaiting Review"
              sub="Referred to UW / Actuary"
              variant={data.awaitingReviewCount > 0 ? 'warn' : 'default'}
              onClick={() => goToQuotes({ status: 'REFERRED_MANUAL_UW,REFERRED_MANUAL_PRICING' })}
            />
            <StatCard
              value={data.expiringCount}
              label="Expiring Soon"
              sub="Within 14 days"
              variant={data.expiringCount > 0 ? 'warn' : 'default'}
              onClick={() => goToQuotes({ expiring: 'true' })}
            />
            <StatCard
              value={data.finalizedThisMonth}
              label="Finalized This Month"
              variant="success"
              trend={finalizedTrend}
              onClick={() => goToQuotes({ status: 'FINALIZED' })}
            />
          </div>
        )}
      </DashboardSection>

      {/* ── Section 2: Needs Action ───────────────────────────────────────── */}
      <DashboardSection label="Needs Action">
        <SectionWidget
          title="Versions Waiting for You"
          count={isLoading ? undefined : data.needsActionVersions.length}
          countVariant={data.needsActionVersions.length > 0 ? 'warn' : 'default'}
          onViewAll={() => goToQuotes({ assignee: 'me' })}
          emptyState="No versions currently require your action."
        >
          {isLoading ? (
            <div className="space-y-1 py-1">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-10 rounded" />
              ))}
            </div>
          ) : (
            data.needsActionVersions.map((v) => (
              <ActionListItem
                key={v.versionId}
                label={`${v.quoteNumber} · V${v.versionNumber}`}
                sublabel={v.clientName}
                badge={STATUS_BADGE_VARIANT[v.status]}
                action={actionHint(v)}
                onClick={() => {
                  const tab =
                    v.status === 'REFERRED_MANUAL_UW' ? 'uw'
                    : v.status === 'REFERRED_MANUAL_PRICING' ? 'pricing'
                    : v.status === 'SUBMITTED' || v.status === 'SENT_TO_CLIENT' || v.status === 'ACCEPTED'
                    ? 'submit'
                    : 'plans';
                  goToVersion(v.quoteId, v.versionId, tab);
                }}
              />
            ))
          )}
        </SectionWidget>
      </DashboardSection>

      {/* ── Section 3: Pending External Review ───────────────────────────── */}
      <DashboardSection label="Pending External Review">
        <SectionWidget
          title="Blocked on UW / Actuary"
          count={isLoading ? undefined : data.referredVersions.length}
          countVariant={overdueCount > 0 ? 'danger' : 'default'}
          onViewAll={() => goToQuotes({ status: 'REFERRED_MANUAL_UW,REFERRED_MANUAL_PRICING' })}
          emptyState="No versions are currently pending external review."
        >
          {isLoading ? (
            <div className="space-y-1 py-1">
              {Array.from({ length: 2 }).map((_, i) => (
                <Skeleton key={i} className="h-10 rounded" />
              ))}
            </div>
          ) : (
            <>
              {overdueCount > 0 && (
                <div className="flex items-start gap-2 rounded-md bg-destructive/10 border border-destructive/20 px-3 py-2 mb-1 mt-1">
                  <AlertTriangle className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
                  <p className="text-xs text-destructive">
                    <span className="font-semibold">{overdueCount} case{overdueCount > 1 ? 's' : ''}</span> overdue.
                    Consider following up with the workbench team.
                  </p>
                </div>
              )}
              {data.referredVersions.map((v: ReferredVersionItem) => (
                <SLAListItem
                  key={v.versionId}
                  label={`${v.quoteNumber} · V${v.versionNumber} — ${v.referralType} R${v.roundNumber}`}
                  sublabel={v.clientName}
                  elapsed={formatElapsed(v.elapsedHours)}
                  status={slaStatus(v.elapsedHours)}
                  onClick={() => goToVersion(v.quoteId, v.versionId, v.referralType === 'UW' ? 'uw' : 'pricing')}
                />
              ))}
            </>
          )}
        </SectionWidget>
      </DashboardSection>

      {/* ── Section 4: Pipeline Bar ───────────────────────────────────────── */}
      <DashboardSection label="My Quote Pipeline">
        {isLoading ? (
          <Skeleton className="h-16 rounded-lg" />
        ) : (
          <div className="rounded-lg border border-border/80 bg-card p-4 shadow-sm">
            <p className="text-sm font-semibold text-foreground mb-3">My Quote Pipeline</p>
            <PipelineBar segments={data.pipelineSegments} height={20} />
          </div>
        )}
      </DashboardSection>

      {/* ── Section 5: Expiring Versions ─────────────────────────────────── */}
      <DashboardSection label="Expiring Soon">
        {(() => {
          const urgentCount = data.expiringVersions.filter(
            (v) => (v.daysUntilExpiry ?? 999) < 7,
          ).length;
          return (
            <SectionWidget
              title="Versions Expiring Soon"
              count={isLoading ? undefined : data.expiringVersions.length}
              countVariant={urgentCount > 0 ? 'danger' : 'default'}
              onViewAll={() => goToQuotes({ expiring: 'true' })}
              emptyState="No versions expiring in the next 14 days."
            >
              {isLoading ? (
                <div className="space-y-1 py-1">
                  {Array.from({ length: 2 }).map((_, i) => (
                    <Skeleton key={i} className="h-10 rounded" />
                  ))}
                </div>
              ) : (
                data.expiringVersions.map((v) => (
                  <RenewalCalendarItem
                    key={v.versionId}
                    label={`${v.quoteNumber} · V${v.versionNumber} — ${VERSION_STATUS_LABEL[v.status] ?? v.status}`}
                    daysUntil={v.daysUntilExpiry ?? 0}
                    policyNumber={v.clientName}
                  />
                ))
              )}
            </SectionWidget>
          );
        })()}
      </DashboardSection>

      {/* ── CTA bar ──────────────────────────────────────────────────────── */}
      <div className="flex items-center gap-3 pt-2">
        <Button
          onClick={() => router.push('/quotation/quotes?new=1')}
          className="gap-1.5"
        >
          <Plus className="h-4 w-4" />
          New Quote
        </Button>
        <Button
          variant="outline"
          onClick={() => goToQuotes()}
          className="gap-1.5"
        >
          View All Quotes
          <ArrowRight className="h-4 w-4" />
        </Button>
      </div>
    </DashboardLayout>
  );
}
