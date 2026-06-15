'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { ArrowRight, ClipboardCheck } from 'lucide-react';

import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';

import {
  StatCard,
  SLAListItem,
  SectionWidget,
} from '@/components/widgets/dashboard';
import {
  DashboardLayout,
  DashboardSection,
} from '@/components/layout/DashboardLayout';

import { useUWDashboard } from '@/hooks/dashboard/useUWDashboard';
import type { UWCaseItem, UWCasePriority, RecentResolutionItem } from '@/hooks/dashboard/useUWDashboard';

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

const SLA_HOURS = 96; // 4 days — must match hook constant

function slaStatus(hours: number): 'ok' | 'warn' | 'overdue' {
  if (hours > SLA_HOURS) return 'overdue';
  if (hours > SLA_HOURS * 0.5) return 'warn';
  return 'ok';
}

function formatElapsed(hours: number): string {
  if (hours >= SLA_HOURS) {
    return `${Math.round(hours / 24)}d — OVERDUE`;
  }
  if (hours >= 24) return `${Math.round(hours / 24)}d`;
  return `${hours}h`;
}

const PRIORITY_CHIP: Record<UWCasePriority, { label: string; className: string }> = {
  URGENT: { label: 'URGENT', className: 'bg-destructive/10 text-destructive border-destructive/20' },
  HIGH:   { label: 'HIGH',   className: 'bg-orange-500/10 text-orange-700 dark:text-orange-300 border-orange-500/20' },
  NORMAL: { label: 'NORMAL', className: 'bg-sky-500/10 text-sky-700 dark:text-sky-300 border-sky-500/25' },
  LOW:    { label: 'LOW',    className: 'bg-zinc-500/10 text-zinc-600 dark:text-zinc-400 border-zinc-500/20' },
};

const SCHEME_CHIP: Record<string, string> = {
  GTL: 'bg-violet-50 text-violet-700 ring-violet-200 dark:bg-violet-900/30 dark:text-violet-300 dark:ring-violet-700',
  GCL: 'bg-blue-50 text-blue-700 ring-blue-200 dark:bg-blue-900/30 dark:text-blue-300 dark:ring-blue-700',
  GH:  'bg-teal-50 text-teal-700 ring-teal-200 dark:bg-teal-900/30 dark:text-teal-300 dark:ring-teal-700',
};

function SchemeChip({ scheme }: { scheme: string }) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-semibold ring-1 ring-inset',
        SCHEME_CHIP[scheme] ?? 'bg-muted text-muted-foreground ring-border',
      )}
    >
      {scheme}
    </span>
  );
}

function PriorityChip({ priority }: { priority: UWCasePriority }) {
  const s = PRIORITY_CHIP[priority];
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full border px-1.5 py-0.5 text-[10px] font-semibold leading-none',
        s.className,
      )}
    >
      {s.label}
    </span>
  );
}

function OutcomeChip({ outcome }: { outcome: 'APPROVED' | 'REJECTED' }) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium leading-none',
        outcome === 'APPROVED'
          ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/20'
          : 'bg-destructive/10 text-destructive border-destructive/20',
      )}
    >
      {outcome === 'APPROVED' ? 'Approved' : 'Rejected'}
    </span>
  );
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Open Cases list
// ─────────────────────────────────────────────────────────────────────────────

interface OpenCasesListProps {
  cases: UWCaseItem[];
  onNavigate: (versionId: string) => void;
}

function OpenCasesList({ cases, onNavigate }: OpenCasesListProps) {
  if (cases.length === 0) {
    return (
      <p className="py-6 text-center text-sm text-emerald-700 dark:text-emerald-400 font-medium">
        Your queue is clear.
      </p>
    );
  }
  return (
    <>
      {cases.map((c) => (
        <SLAListItem
          key={c.versionId}
          label={
            `${c.quoteNumber} · V${c.versionNumber}`
          }
          sublabel={`${c.clientName} · Round ${c.roundNumber}`}
          elapsed={formatElapsed(c.elapsedHours)}
          status={slaStatus(c.elapsedHours)}
          onClick={() => onNavigate(c.versionId)}
        />
      ))}
    </>
  );
}

// Extra chips rendered to the right of SLAListItem via an overlay wrapper
interface CaseRowProps {
  c: UWCaseItem;
  onNavigate: (versionId: string) => void;
}

function CaseRow({ c, onNavigate }: CaseRowProps) {
  return (
    <div className="relative group">
      {/* Core SLAListItem */}
      <SLAListItem
        label={`${c.quoteNumber} · V${c.versionNumber}`}
        sublabel={`${c.clientName} · Round ${c.roundNumber}`}
        elapsed={formatElapsed(c.elapsedHours)}
        status={slaStatus(c.elapsedHours)}
        onClick={() => onNavigate(c.versionId)}
      />
      {/* Chips row (shown below the main row, same click target) */}
      <div
        className="flex items-center gap-1.5 px-7 pb-1.5 -mt-1.5 cursor-pointer"
        onClick={() => onNavigate(c.versionId)}
      >
        <SchemeChip scheme={c.schemeType} />
        <PriorityChip priority={c.priority} />
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main component
// ─────────────────────────────────────────────────────────────────────────────

export function UWDashboard() {
  const router = useRouter();
  const data = useUWDashboard();
  const { isLoading } = data;

  const goToWorkbench = (versionId: string) => {
    router.push(`/quotation/uw-workbench/${versionId}`);
  };

  const goToQueue = () => router.push('/quotation/uw-workbench');

  // Trend chip for avg turnaround
  const turnaroundTrend =
    data.avgTurnaroundTrendDays !== 0
      ? {
          value: Math.abs(data.avgTurnaroundTrendDays),
          direction: data.avgTurnaroundTrendDays > 0 ? ('up' as const) : ('down' as const),
          label: 'vs prev 30d',
        }
      : undefined;

  return (
    <DashboardLayout>
      {/* ── Section 1: Queue Stats ────────────────────────────────────────── */}
      <DashboardSection label="Queue Stats">
        {isLoading ? (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-28 rounded-lg" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <StatCard
              value={data.overdueCases.length}
              label="Overdue Cases"
              sub="Past 4-day SLA"
              variant={data.overdueCases.length > 0 ? 'danger' : 'default'}
              onClick={goToQueue}
            />
            <StatCard
              value={data.openCases.length}
              label="Open Cases"
              sub="Assigned to me"
              variant={data.openCases.length > 0 ? 'warn' : 'default'}
              onClick={goToQueue}
            />
            <StatCard
              value={data.resolvedThisWeek}
              label="Resolved This Week"
              variant="success"
              onClick={goToQueue}
            />
            <StatCard
              value={`${data.avgTurnaroundDays}d`}
              label="Avg Turnaround"
              sub="Last 30 days"
              variant="default"
              trend={turnaroundTrend}
            />
          </div>
        )}
      </DashboardSection>

      {/* ── Section 2: My Open Cases ──────────────────────────────────────── */}
      <DashboardSection label="My Open Cases">
        <SectionWidget
          title="UW Queue — My Cases"
          count={isLoading ? undefined : data.openCases.length}
          countVariant={data.overdueCases.length > 0 ? 'danger' : data.openCases.length > 0 ? 'warn' : 'default'}
          onViewAll={goToQueue}
          emptyState="Your queue is clear."
        >
          {isLoading ? (
            <div className="space-y-2 py-1">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-12 rounded" />
              ))}
            </div>
          ) : data.openCases.length === 0 ? null : (
            <>
              {data.openCases.map((c) => (
                <CaseRow key={c.versionId} c={c} onNavigate={goToWorkbench} />
              ))}
              {data.unassignedCount > 0 && (
                <p className="px-1 pt-2 pb-1 text-xs text-muted-foreground">
                  {data.unassignedCount} unassigned case{data.unassignedCount > 1 ? 's' : ''} in the team queue.
                </p>
              )}
            </>
          )}
        </SectionWidget>
      </DashboardSection>

      {/* ── Section 3: RI Consultations Pending ──────────────────────────── */}
      <DashboardSection label="RI Consultations">
        <SectionWidget
          title="Awaiting RI Input"
          count={isLoading ? undefined : data.riPendingCases.length}
          countVariant={data.riPendingCases.some((r) => r.isStale) ? 'warn' : 'default'}
          emptyState="No pending RI consultations."
        >
          {isLoading ? (
            <div className="space-y-1 py-1">
              {Array.from({ length: 2 }).map((_, i) => (
                <Skeleton key={i} className="h-10 rounded" />
              ))}
            </div>
          ) : (
            data.riPendingCases.map((ri) => (
              <div
                key={ri.versionId}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && goToWorkbench(ri.versionId)}
                onClick={() => goToWorkbench(ri.versionId)}
                className="flex items-center gap-3 py-2.5 px-1 rounded cursor-pointer hover:bg-muted/50 transition-colors"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">
                    {ri.quoteNumber} — {ri.clientName}
                  </p>
                  <p className="text-xs text-muted-foreground truncate">
                    {ri.riPartnerName} · {ri.riReferenceNumber}
                  </p>
                </div>
                <span
                  className={cn(
                    'shrink-0 text-xs font-medium',
                    ri.isStale ? 'text-destructive' : 'text-muted-foreground',
                  )}
                >
                  {ri.consultedDaysAgo}d ago
                </span>
              </div>
            ))
          )}
        </SectionWidget>
      </DashboardSection>

      {/* ── Section 4: This Week's Summary ───────────────────────────────── */}
      <DashboardSection label="This Week's Summary">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {/* Left — Approved / Rejected stat cards */}
          <div className="flex flex-col gap-3">
            {isLoading ? (
              <>
                <Skeleton className="h-24 rounded-lg" />
                <Skeleton className="h-24 rounded-lg" />
              </>
            ) : (
              <>
                <StatCard
                  value={data.approvedThisWeek}
                  label="Approved This Week"
                  variant="success"
                />
                <StatCard
                  value={data.rejectedThisWeek}
                  label="Rejected This Week"
                  variant={data.rejectedThisWeek > 0 ? 'danger' : 'default'}
                />
              </>
            )}
          </div>

          {/* Right — Recent Resolutions */}
          <SectionWidget
            title="Recent Resolutions"
            emptyState="No resolved cases yet this period."
          >
            {isLoading ? (
              <div className="space-y-1 py-1">
                {Array.from({ length: 3 }).map((_, i) => (
                  <Skeleton key={i} className="h-10 rounded" />
                ))}
              </div>
            ) : (
              data.recentResolutions.map((r: RecentResolutionItem) => (
                <div
                  key={`${r.versionId}-${r.roundNumber}`}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) =>
                    (e.key === 'Enter' || e.key === ' ') &&
                    router.push(`/quotation/quotes/${r.quoteId}/versions/${r.versionId}?tab=uw`)
                  }
                  onClick={() =>
                    router.push(`/quotation/quotes/${r.quoteId}/versions/${r.versionId}?tab=uw`)
                  }
                  className="flex items-center gap-3 py-2.5 px-1 rounded cursor-pointer hover:bg-muted/50 transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">
                      {r.quoteNumber} · Round {r.roundNumber}
                    </p>
                    <p className="text-xs text-muted-foreground truncate">{r.clientName}</p>
                  </div>
                  <div className="shrink-0 flex flex-col items-end gap-0.5">
                    <OutcomeChip outcome={r.outcome} />
                    <span className="text-xs text-muted-foreground">{formatDate(r.completedAt)}</span>
                  </div>
                </div>
              ))
            )}
          </SectionWidget>
        </div>
      </DashboardSection>

      {/* ── CTA bar ──────────────────────────────────────────────────────── */}
      <div className="flex items-center gap-3 pt-2">
        <Button onClick={goToQueue} className="gap-1.5">
          <ClipboardCheck className="h-4 w-4" />
          Open My Queue
        </Button>
        <Button variant="outline" onClick={() => router.push('/quotation/uw-workbench')} className="gap-1.5">
          View All Cases
          <ArrowRight className="h-4 w-4" />
        </Button>
      </div>
    </DashboardLayout>
  );
}
