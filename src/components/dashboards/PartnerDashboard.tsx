'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { Plus } from 'lucide-react';

import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';

import {
  StatCard,
  ActionListItem,
  SectionWidget,
} from '@/components/widgets/dashboard';
import {
  DashboardLayout,
  DashboardSection,
} from '@/components/layout/DashboardLayout';

import { usePartnerDashboard } from '@/hooks/dashboard/usePartnerDashboard';
import type { PartnerMemberQuoteItem, PartnerSchemeItem } from '@/hooks/dashboard/usePartnerDashboard';
import { formatMoney } from '@/components/quotation/quoteHelpers';

// ─────────────────────────────────────────────────────────────────────────────
// Sub-components
// ─────────────────────────────────────────────────────────────────────────────

function SchemeStatusChip({ status }: { status: 'ACTIVE' | 'FINALIZED' }) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold leading-none',
        status === 'ACTIVE'
          ? 'bg-sky-500/10 text-sky-700 dark:text-sky-300 border-sky-500/25'
          : 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/20',
      )}
    >
      {status}
    </span>
  );
}

// ── Rejected item row ─────────────────────────────────────────────────────────

interface RejectedRowProps {
  item: PartnerMemberQuoteItem;
  onFix: (id: string) => void;
}

function RejectedRow({ item, onFix }: RejectedRowProps) {
  return (
    <div className="py-2.5 px-1 space-y-0.5">
      <ActionListItem
        label={`${item.memberName} — ${item.loanReference}`}
        sublabel={formatMoney(item.loanAmount.amount, item.loanAmount.currency)}
        badge={{ text: 'Rejected', variant: 'terminal' }}
        action="Fix & Resubmit →"
        onClick={() => onFix(item.id)}
      />
      {item.rejectionReason && (
        <p className="pl-1 text-xs text-destructive truncate">{item.rejectionReason}</p>
      )}
    </div>
  );
}

// ── Today activity row ────────────────────────────────────────────────────────

function ActivityRow({ label, value, highlight }: { label: string; value: number; highlight?: boolean }) {
  return (
    <div className="flex items-center justify-between py-2 px-1 border-b border-border/40 last:border-0">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span
        className={cn(
          'text-sm font-semibold',
          highlight && value > 0 ? 'text-yellow-700 dark:text-yellow-400' : 'text-foreground',
        )}
      >
        {value}
      </span>
    </div>
  );
}

// ── Scheme row ────────────────────────────────────────────────────────────────

interface SchemeRowProps {
  scheme: PartnerSchemeItem;
  onNavigate: (quoteId: string) => void;
}

function SchemeRow({ scheme, onNavigate }: SchemeRowProps) {
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => onNavigate(scheme.quoteId)}
      onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && onNavigate(scheme.quoteId)}
      className="flex items-center gap-3 py-2.5 px-1 rounded cursor-pointer hover:bg-muted/50 transition-colors"
    >
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-foreground truncate">
          {scheme.quoteNumber} — {scheme.clientName}
        </p>
        <p className="text-xs text-muted-foreground truncate">{scheme.planName}</p>
      </div>
      <div className="shrink-0 flex flex-col items-end gap-1">
        <SchemeStatusChip status={scheme.schemeStatus} />
        <span className="text-xs text-muted-foreground">
          {scheme.submissionCount} submission{scheme.submissionCount !== 1 ? 's' : ''}
        </span>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main component
// ─────────────────────────────────────────────────────────────────────────────

export function PartnerDashboard() {
  const router = useRouter();
  const data = usePartnerDashboard();
  const { isLoading } = data;

  const goToMemberQuotes = (quoteId?: string) => {
    const qs = quoteId ? `?parent_quote_id=${quoteId}` : '';
    router.push(`/quotation/member-quotes${qs}`);
  };

  const goToDetail = (id: string) =>
    router.push(`/quotation/member-quotes/${id}`);

  const goToNew = () =>
    router.push('/quotation/member-quotes?new=1');

  return (
    <DashboardLayout>
      {/* ── Section 1: Submission Stats ────────────────────────────────── */}
      <DashboardSection label="My Submissions">
        {isLoading ? (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-28 rounded-lg" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <StatCard
              value={data.totalSubmitted}
              label="Total Submitted"
              sub="All time"
              variant="default"
              onClick={() => goToMemberQuotes()}
            />
            <StatCard
              value={data.accepted}
              label="Accepted by PIM"
              variant="success"
              onClick={() => goToMemberQuotes()}
            />
            <StatCard
              value={data.rejected}
              label="Rejected"
              sub={data.rejected > 0 ? 'Needs rework' : undefined}
              variant={data.rejected > 0 ? 'danger' : 'default'}
              onClick={() => goToMemberQuotes()}
            />
            <StatCard
              value={data.drafts}
              label="Drafts Unsent"
              sub="Awaiting submission"
              variant={data.drafts > 0 ? 'warn' : 'default'}
              onClick={() => goToMemberQuotes()}
            />
          </div>
        )}
      </DashboardSection>

      {/* ── Section 2: Rejected — Needs Rework ────────────────────────── */}
      <DashboardSection label="Rejected — Needs Rework">
        <SectionWidget
          title="Rejected Member Quotes"
          count={isLoading ? undefined : data.rejectedItems.length}
          countVariant={data.rejectedItems.length > 0 ? 'danger' : 'default'}
          onViewAll={() => goToMemberQuotes()}
          emptyState="No rejected quotes — you're all clear."
        >
          {isLoading ? (
            <div className="space-y-1 py-1">
              {Array.from({ length: 2 }).map((_, i) => (
                <Skeleton key={i} className="h-14 rounded" />
              ))}
            </div>
          ) : (
            data.rejectedItems.map((item: PartnerMemberQuoteItem) => (
              <RejectedRow key={item.id} item={item} onFix={goToDetail} />
            ))
          )}
        </SectionWidget>
      </DashboardSection>

      {/* ── Section 3: Today's Activity ────────────────────────────────── */}
      <DashboardSection label="Today's Activity">
        <SectionWidget title="Today">
          {isLoading ? (
            <div className="space-y-1 py-1">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-9 rounded" />
              ))}
            </div>
          ) : (
            <>
              <ActivityRow label="Submitted today" value={data.todayStats.submittedToday} />
              <ActivityRow label="Accepted by PIM" value={data.todayStats.acceptedToday} />
              <ActivityRow label="Rejected" value={data.todayStats.rejectedToday} />
              <ActivityRow
                label="NML breach flags"
                value={data.todayStats.nmlBreachFlags}
                highlight
              />
              <ActivityRow label="Drafts created" value={data.todayStats.draftsCreated} />
            </>
          )}
        </SectionWidget>
      </DashboardSection>

      {/* ── Section 4: Active GCL Schemes ─────────────────────────────── */}
      <DashboardSection label="Active Schemes">
        <SectionWidget
          title="Active Schemes I Work Under"
          count={isLoading ? undefined : data.activeSchemes.length}
          emptyState="No active GCL schemes found."
        >
          {isLoading ? (
            <div className="space-y-1 py-1">
              {Array.from({ length: 2 }).map((_, i) => (
                <Skeleton key={i} className="h-12 rounded" />
              ))}
            </div>
          ) : (
            data.activeSchemes.map((scheme: PartnerSchemeItem) => (
              <SchemeRow
                key={scheme.quoteId}
                scheme={scheme}
                onNavigate={(qid) => goToMemberQuotes(qid)}
              />
            ))
          )}
        </SectionWidget>
      </DashboardSection>

      {/* ── CTA bar ───────────────────────────────────────────────────── */}
      <div className="flex flex-col gap-3 pt-2 sm:flex-row">
        <Button
          onClick={goToNew}
          className="w-full sm:w-auto gap-1.5 bg-amber-600 hover:bg-amber-700 text-white"
        >
          <Plus className="h-4 w-4" />
          New Member Quote
        </Button>
      </div>
    </DashboardLayout>
  );
}
