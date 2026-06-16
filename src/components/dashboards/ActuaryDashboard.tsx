'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowRight, Calculator, CheckCircle2, XCircle } from 'lucide-react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ReferenceLine,
  ResponsiveContainer,
} from 'recharts';

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

import { useActuaryDashboard } from '@/hooks/dashboard/useActuaryDashboard';
import type {
  ActuaryCaseItem,
  ActuaryCasePriority,
  DiscountApprovalItem,
  EscalationMonthPoint,
  ActuaryRecentResolution,
} from '@/hooks/dashboard/useActuaryDashboard';

// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────

const SLA_HOURS = 72; // must match hook

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function slaStatus(hours: number): 'ok' | 'warn' | 'overdue' {
  if (hours > SLA_HOURS) return 'overdue';
  if (hours > SLA_HOURS * 0.5) return 'warn';
  return 'ok';
}

function formatElapsed(hours: number): string {
  if (hours >= SLA_HOURS) return `${Math.round(hours / 24)}d — OVERDUE`;
  if (hours >= 24) return `${Math.round(hours / 24)}d`;
  return `${hours}h`;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
}

// ─────────────────────────────────────────────────────────────────────────────
// Sub-components
// ─────────────────────────────────────────────────────────────────────────────

const PRIORITY_CHIP: Record<ActuaryCasePriority, { label: string; className: string }> = {
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
    <span className={cn('inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-semibold ring-1 ring-inset', SCHEME_CHIP[scheme] ?? 'bg-muted text-muted-foreground ring-border')}>
      {scheme}
    </span>
  );
}

function PriorityChip({ priority }: { priority: ActuaryCasePriority }) {
  const s = PRIORITY_CHIP[priority];
  return (
    <span className={cn('inline-flex items-center rounded-full border px-1.5 py-0.5 text-[10px] font-semibold leading-none', s.className)}>
      {s.label}
    </span>
  );
}

function CounterChip() {
  return (
    <span className="inline-flex items-center rounded-full border border-violet-500/25 bg-violet-500/10 px-1.5 py-0.5 text-[10px] font-semibold leading-none text-violet-700 dark:text-violet-300">
      Counter response pending
    </span>
  );
}

function OutcomeChip({ outcome }: { outcome: 'APPROVED' | 'REJECTED' }) {
  return (
    <span className={cn('inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium leading-none', outcome === 'APPROVED' ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/20' : 'bg-destructive/10 text-destructive border-destructive/20')}>
      {outcome === 'APPROVED' ? 'Approved' : 'Rejected'}
    </span>
  );
}

// ── CaseRow ────────────────────────────────────────────────────────────────

interface CaseRowProps {
  c: ActuaryCaseItem;
  onNavigate: (versionId: string) => void;
}

function CaseRow({ c, onNavigate }: CaseRowProps) {
  return (
    <div className="group">
      <SLAListItem
        label={`${c.quoteNumber} · V${c.versionNumber}`}
        sublabel={`${c.clientName} · Round ${c.roundNumber}`}
        elapsed={formatElapsed(c.elapsedHours)}
        status={slaStatus(c.elapsedHours)}
        onClick={() => onNavigate(c.versionId)}
      />
      <div
        className="flex items-center gap-1.5 px-7 pb-1.5 -mt-1.5 cursor-pointer"
        onClick={() => onNavigate(c.versionId)}
      >
        <SchemeChip scheme={c.schemeType} />
        <PriorityChip priority={c.priority} />
        {c.isCounterFollowUp && <CounterChip />}
      </div>
    </div>
  );
}

// ── Escalation chart ──────────────────────────────────────────────────────

interface EscalationChartProps {
  data: EscalationMonthPoint[];
}

function EscalationChart({ data }: EscalationChartProps) {
  return (
    <ResponsiveContainer width="100%" height={140}>
      <LineChart data={data} margin={{ top: 8, right: 40, left: -10, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
        <XAxis
          dataKey="month"
          tick={{ fill: 'currentColor', fontSize: 11 }}
          axisLine={false}
          tickLine={false}
          className="text-muted-foreground"
        />
        <YAxis
          yAxisId="count"
          tick={{ fill: 'currentColor', fontSize: 11 }}
          axisLine={false}
          tickLine={false}
          className="text-muted-foreground"
          allowDecimals={false}
        />
        <YAxis
          yAxisId="rate"
          orientation="right"
          domain={[0, 100]}
          tickFormatter={(v: number) => `${v}%`}
          tick={{ fill: 'currentColor', fontSize: 11 }}
          axisLine={false}
          tickLine={false}
          className="text-muted-foreground"
        />
        <Tooltip
          contentStyle={{
            backgroundColor: 'var(--background)',
            borderColor: 'var(--border)',
            borderRadius: '8px',
            fontSize: '12px',
          }}
          itemStyle={{ color: 'var(--foreground)' }}
          formatter={((value: number | string | undefined, name: string): [string, string] => [
            name === 'Escalation %' ? `${value ?? ''}%` : String(value ?? ''),
            name,
          ]) as never}
        />
        <Legend
          wrapperStyle={{ fontSize: '11px', paddingTop: '4px' }}
          iconType="circle"
          iconSize={8}
        />
        <ReferenceLine
          yAxisId="rate"
          y={20}
          stroke="#f59e0b"
          strokeDasharray="4 2"
          label={{ value: '20% target', position: 'insideTopRight', fontSize: 10, fill: '#f59e0b' }}
        />
        <Line
          yAxisId="count"
          type="monotone"
          dataKey="total"
          name="Total requests"
          stroke="#a1a1aa"
          strokeWidth={2}
          dot={{ r: 3 }}
          activeDot={{ r: 5 }}
        />
        <Line
          yAxisId="count"
          type="monotone"
          dataKey="escalated"
          name="Manual escalations"
          stroke="#818cf8"
          strokeWidth={2}
          dot={{ r: 3 }}
          activeDot={{ r: 5 }}
        />
        <Line
          yAxisId="rate"
          type="monotone"
          dataKey="ratePct"
          name="Escalation %"
          stroke="#6366f1"
          strokeWidth={2}
          strokeDasharray="5 3"
          dot={false}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}

// ── Discount approval row ─────────────────────────────────────────────────

interface DiscountRowProps {
  item: DiscountApprovalItem;
  onApprove: (id: string) => void;
  onReject: (id: string) => void;
}

function DiscountRow({ item, onApprove, onReject }: DiscountRowProps) {
  const [busy, setBusy] = useState(false);

  const handle = (action: 'approve' | 'reject') => {
    setBusy(true);
    // optimistic — immediate state update, no real delay needed
    if (action === 'approve') onApprove(item.id);
    else onReject(item.id);
  };

  return (
    <div className="flex items-start gap-3 py-2.5 px-1">
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-foreground truncate">
          {item.quoteNumber} — {item.discountLabel}{' '}
          <span className="font-semibold">{item.discountPct}%</span>
        </p>
        <p className="text-xs text-muted-foreground truncate">
          {item.clientName} · Requested by {item.requestedBy} · {item.requestedDaysAgo}d ago
        </p>
      </div>
      <div className="shrink-0 flex items-center gap-1.5">
        <button
          disabled={busy}
          onClick={() => handle('approve')}
          className="inline-flex items-center gap-0.5 rounded border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-xs font-medium text-emerald-700 hover:bg-emerald-500/20 dark:text-emerald-300 transition-colors disabled:opacity-50"
        >
          <CheckCircle2 className="h-3 w-3" />
          Approve
        </button>
        <button
          disabled={busy}
          onClick={() => handle('reject')}
          className="inline-flex items-center gap-0.5 rounded border border-destructive/20 bg-transparent px-2 py-0.5 text-xs font-medium text-destructive hover:bg-destructive/5 transition-colors disabled:opacity-50"
        >
          <XCircle className="h-3 w-3" />
          Reject
        </button>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main component
// ─────────────────────────────────────────────────────────────────────────────

export function ActuaryDashboard() {
  const router = useRouter();
  const data = useActuaryDashboard();
  const { isLoading } = data;

  const goToWorkbench = (versionId: string) =>
    router.push(`/quotation/actuary-workbench/${versionId}`);

  const goToQueue = () => router.push('/quotation/actuary-workbench');

  const turnaroundTrend =
    data.avgTurnaroundTrendDays !== 0
      ? {
          value: Math.abs(data.avgTurnaroundTrendDays),
          direction: data.avgTurnaroundTrendDays > 0 ? ('up' as const) : ('down' as const),
          label: 'vs prev 30d',
        }
      : undefined;

  const escalationColor =
    data.escalationRatePct < 20
      ? 'text-emerald-700 dark:text-emerald-400'
      : data.escalationRatePct <= 35
      ? 'text-yellow-700 dark:text-yellow-400'
      : 'text-destructive';

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
              sub="Past 3-day SLA"
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
          title="Actuary Queue — My Cases"
          count={isLoading ? undefined : data.openCases.length}
          countVariant={
            data.overdueCases.length > 0
              ? 'danger'
              : data.openCases.length > 0
              ? 'warn'
              : 'default'
          }
          onViewAll={goToQueue}
          emptyState="Your pricing queue is clear."
        >
          {isLoading ? (
            <div className="space-y-2 py-1">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-12 rounded" />
              ))}
            </div>
          ) : data.openCases.length === 0 ? null : (
            <>
              {data.openCases.map((c: ActuaryCaseItem) => (
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

      {/* ── Section 3: Escalation Rate Trend ─────────────────────────────── */}
      <DashboardSection label="Pricing Escalation Rate">
        <SectionWidget title="Pricing Escalation Rate — Last 6 Months">
          {isLoading ? (
            <Skeleton className="h-36 rounded my-2" />
          ) : (
            <>
              <div className="mt-1 mb-3">
                <EscalationChart data={data.escalationTrend} />
              </div>

              {/* Inline stat pills */}
              <div className="flex flex-wrap gap-4 px-1 pb-1 text-sm">
                <div className="flex flex-col gap-0.5">
                  <span className="text-xs text-muted-foreground uppercase tracking-wide">
                    Last 30d escalation
                  </span>
                  <span className={cn('font-bold text-base', escalationColor)}>
                    {data.escalationRatePct}%
                  </span>
                </div>
                <div className="flex flex-col gap-0.5">
                  <span className="text-xs text-muted-foreground uppercase tracking-wide">Accept rate</span>
                  <span className="font-bold text-base text-emerald-700 dark:text-emerald-400">
                    {data.acceptRatePct}%
                  </span>
                </div>
                <div className="flex flex-col gap-0.5">
                  <span className="text-xs text-muted-foreground uppercase tracking-wide">Counter rate</span>
                  <span className="font-bold text-base text-violet-700 dark:text-violet-400">
                    {data.counterRatePct}%
                  </span>
                </div>
              </div>
            </>
          )}
        </SectionWidget>
      </DashboardSection>

      {/* ── Section 4: Pending Discount Approvals ────────────────────────── */}
      <DashboardSection label="Discount Approvals">
        <SectionWidget
          title="Discount Approvals"
          count={isLoading ? undefined : data.pendingDiscounts.length}
          countVariant={data.pendingDiscounts.length > 0 ? 'warn' : 'default'}
          onViewAll={() => router.push('/quotation/actuary-workbench?tab=discounts')}
          emptyState="No pending discount approvals."
        >
          {isLoading ? (
            <div className="space-y-1 py-1">
              {Array.from({ length: 2 }).map((_, i) => (
                <Skeleton key={i} className="h-12 rounded" />
              ))}
            </div>
          ) : (
            data.pendingDiscounts.map((item: DiscountApprovalItem) => (
              <DiscountRow
                key={item.id}
                item={item}
                onApprove={data.approveDiscount}
                onReject={data.rejectDiscount}
              />
            ))
          )}
        </SectionWidget>
      </DashboardSection>

      {/* ── Section 5: RI Consultations ──────────────────────────────────── */}
      <DashboardSection label="RI Consultations">
        <SectionWidget
          title="Awaiting RI Input"
          count={isLoading ? undefined : data.riPendingCases.length}
          countVariant={data.riPendingCases.some((r) => r.isStale) ? 'warn' : 'default'}
          emptyState="No pending RI consultations."
        >
          {isLoading ? (
            <div className="space-y-1 py-1">
              {Array.from({ length: 1 }).map((_, i) => (
                <Skeleton key={i} className="h-10 rounded" />
              ))}
            </div>
          ) : (
            data.riPendingCases.map((ri) => (
              <div
                key={ri.versionId}
                role="button"
                tabIndex={0}
                onKeyDown={(e) =>
                  (e.key === 'Enter' || e.key === ' ') && goToWorkbench(ri.versionId)
                }
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

      {/* ── CTA bar ──────────────────────────────────────────────────────── */}
      <div className="flex items-center gap-3 pt-2">
        <Button onClick={goToQueue} className="gap-1.5">
          <Calculator className="h-4 w-4" />
          Open My Queue
        </Button>
        <Button
          variant="outline"
          onClick={() => router.push('/quotation/actuary-workbench?tab=discounts')}
          className="gap-1.5"
        >
          View Discount Queue
          <ArrowRight className="h-4 w-4" />
        </Button>
      </div>
    </DashboardLayout>
  );
}
