'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';

import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  StatCard,
  SLAListItem,
  SectionWidget,
  MiniSparkline,
} from '@/components/widgets/dashboard';
import {
  DashboardLayout,
  DashboardSection,
} from '@/components/layout/DashboardLayout';
import { useAdminDashboard } from '@/hooks/dashboard/useAdminDashboard';
import type {
  AdminSLABreach,
  AdminTeamMember,
  AdminFunnelStage,
  AdminPendingApproval,
  AdminIntegration,
  IntegrationStatus,
} from '@/hooks/dashboard/useAdminDashboard';
import { formatMoney } from '@/components/quotation/quoteHelpers';

// ─────────────────────────────────────────────────────────────────────────────
// Sub-components
// ─────────────────────────────────────────────────────────────────────────────

// ── Degraded integration banner (renders above DashboardLayout) ───────────────

function DegradedBanner({ name }: { name: string }) {
  return (
    <div className="w-full bg-destructive px-4 py-2.5 text-sm font-medium text-destructive-foreground flex items-center gap-2">
      <span aria-hidden>⚠</span>
      <span>
        <strong>{name}</strong> is currently degraded. Some platform functions may be affected.
      </span>
    </div>
  );
}

// ── SLA breach row ─────────────────────────────────────────────────────────────

function SLABreachRow({ breach }: { breach: AdminSLABreach }) {
  const overdueDays = Math.max(1, Math.ceil(breach.overdueHours / 24));
  return (
    <div className="flex items-center gap-1">
      <div className="mr-1 shrink-0">
        <span
          className={cn(
            'inline-flex items-center rounded-full border px-1.5 py-0.5 text-[9px] font-bold leading-none',
            breach.role === 'UW'
              ? 'bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-500/20'
              : 'bg-purple-500/10 text-purple-700 dark:text-purple-300 border-purple-500/20',
          )}
        >
          {breach.role}
        </span>
      </div>
      <div className="flex-1 min-w-0">
        <SLAListItem
          label={`${breach.quoteNumber} — ${breach.clientName}`}
          sublabel={`Assigned: ${breach.assigneeName}`}
          elapsed={`${overdueDays}d overdue`}
          status="overdue"
        />
      </div>
      <button
        type="button"
        className="shrink-0 text-xs text-primary hover:underline px-2 py-1"
      >
        Reassign →
      </button>
    </div>
  );
}

// ── Team workload table ────────────────────────────────────────────────────────

interface TeamTableProps {
  title: string;
  members: AdminTeamMember[];
  unassigned: number;
  showCounters?: boolean;
}

function TeamTable({ title, members, unassigned, showCounters }: TeamTableProps) {
  return (
    <SectionWidget title={title} count={members.length + (unassigned > 0 ? 1 : 0)}>
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-border/60">
              <th className="text-left py-2 pr-3 font-medium text-muted-foreground">Assignee</th>
              <th className="text-right py-2 px-2 font-medium text-muted-foreground">Open</th>
              <th className="text-right py-2 px-2 font-medium text-muted-foreground">Overdue</th>
              <th className="text-right py-2 px-2 font-medium text-muted-foreground">Avg (d)</th>
              {showCounters && (
                <th className="text-right py-2 pl-2 font-medium text-muted-foreground">Counters</th>
              )}
            </tr>
          </thead>
          <tbody>
            {members.map((m) => (
              <tr key={m.id} className="border-b border-border/30 last:border-0">
                <td className="py-2 pr-3 font-medium truncate max-w-[100px]">{m.name}</td>
                <td
                  className={cn(
                    'text-right py-2 px-2 font-medium',
                    m.openCases > 3 ? 'text-yellow-700 dark:text-yellow-400' : '',
                  )}
                >
                  {m.openCases}
                </td>
                <td
                  className={cn(
                    'text-right py-2 px-2 font-medium',
                    m.overdueCases > 0 ? 'text-destructive' : 'text-muted-foreground',
                  )}
                >
                  {m.overdueCases}
                </td>
                <td className="text-right py-2 px-2 text-muted-foreground">{m.avgTurnaroundDays}d</td>
                {showCounters && (
                  <td className="text-right py-2 pl-2 text-muted-foreground">
                    {m.counterCount ?? 0}
                  </td>
                )}
              </tr>
            ))}
            {members.length === 0 && (
              <tr>
                <td
                  colSpan={showCounters ? 5 : 4}
                  className="py-3 text-center text-xs text-muted-foreground"
                >
                  No open cases.
                </td>
              </tr>
            )}
          </tbody>
        </table>

        {unassigned > 0 && (
          <div className="mt-2 flex items-center justify-between border-t border-border/40 pt-2 px-1">
            <span className="text-xs font-medium text-destructive">
              Unassigned: {unassigned} {unassigned === 1 ? 'case' : 'cases'}
            </span>
            <button type="button" className="text-xs text-primary hover:underline">
              Assign →
            </button>
          </div>
        )}
      </div>
    </SectionWidget>
  );
}

// ── Funnel stage row ───────────────────────────────────────────────────────────

function FunnelStageRow({
  stage,
  maxCount,
  isFirst,
}: {
  stage: AdminFunnelStage;
  maxCount: number;
  isFirst: boolean;
}) {
  const widthPct = maxCount === 0 ? 0 : Math.round((stage.count / maxCount) * 100);
  const lowConversion = !isFirst && stage.pctOfPrev < 50;

  return (
    <div className="flex items-center gap-3 py-1.5">
      <div className="w-[152px] shrink-0 text-xs text-muted-foreground leading-tight">
        {stage.label}
      </div>
      <div className="flex-1 min-w-0">
        <div className="relative h-5 overflow-hidden rounded bg-muted/40">
          <div
            className={cn(
              'absolute inset-y-0 left-0 rounded transition-all duration-500',
              lowConversion ? 'bg-amber-500/70' : 'bg-primary/60',
            )}
            style={{ width: `${widthPct}%` }}
          />
        </div>
      </div>
      <div className="w-10 shrink-0 text-right">
        <span className="text-sm font-semibold text-foreground">{stage.count}</span>
      </div>
      <div className="w-12 shrink-0 text-right">
        {!isFirst && (
          <span
            className={cn(
              'text-xs font-medium',
              lowConversion ? 'text-amber-600 dark:text-amber-400' : 'text-muted-foreground',
            )}
          >
            {stage.pctOfPrev}%
          </span>
        )}
      </div>
    </div>
  );
}

// ── Pending approval row ───────────────────────────────────────────────────────

type ApprovalAction = 'approved' | 'rejected' | null;

const APPROVAL_TYPE_LABEL: Record<AdminPendingApproval['type'], string> = {
  DISCOUNT:       'Discount',
  LICENSE_ENABLE: 'License',
  CURRENCY_CONFIG:'Currency',
  SYSTEM_CONFIG:  'Config',
};

const APPROVAL_TYPE_STYLE: Record<AdminPendingApproval['type'], string> = {
  DISCOUNT:       'bg-yellow-500/10 text-yellow-800 dark:text-yellow-300 border-yellow-500/20',
  LICENSE_ENABLE: 'bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-500/20',
  CURRENCY_CONFIG:'bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 border-indigo-500/20',
  SYSTEM_CONFIG:  'bg-zinc-500/10 text-zinc-700 dark:text-zinc-300 border-zinc-500/20',
};

interface ApprovalRowProps {
  approval: AdminPendingApproval;
  onApprove: (id: string) => void;
  onReject: (id: string) => void;
  action: ApprovalAction;
}

function ApprovalRow({ approval, onApprove, onReject, action }: ApprovalRowProps) {
  return (
    <div
      className={cn(
        'flex items-center gap-3 py-2.5 px-1 rounded transition-opacity',
        action !== null && 'opacity-50',
      )}
    >
      <span
        className={cn(
          'inline-flex shrink-0 items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold leading-none',
          APPROVAL_TYPE_STYLE[approval.type],
        )}
      >
        {APPROVAL_TYPE_LABEL[approval.type]}
      </span>

      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-foreground truncate">{approval.label}</p>
        <p className="text-xs text-muted-foreground truncate">
          Requested by {approval.requestedBy}
          {approval.value && ` · ${approval.value}`}
        </p>
      </div>

      {action === null ? (
        <div className="flex shrink-0 items-center gap-2">
          <button
            type="button"
            onClick={() => onApprove(approval.id)}
            className="text-xs font-semibold text-emerald-700 dark:text-emerald-400 hover:underline"
          >
            Approve
          </button>
          <span className="text-[10px] text-muted-foreground/50">|</span>
          <button
            type="button"
            onClick={() => onReject(approval.id)}
            className="text-xs font-semibold text-destructive hover:underline"
          >
            Reject
          </button>
        </div>
      ) : (
        <span
          className={cn(
            'text-xs font-semibold shrink-0',
            action === 'approved' ? 'text-emerald-600' : 'text-destructive',
          )}
        >
          {action === 'approved' ? 'Approved ✓' : 'Rejected'}
        </span>
      )}
    </div>
  );
}

// ── Integration health tile ────────────────────────────────────────────────────

const STATUS_DOT: Record<IntegrationStatus, string> = {
  healthy:  'bg-emerald-500',
  degraded: 'bg-yellow-500',
  down:     'bg-destructive',
};

const STATUS_TEXT: Record<IntegrationStatus, string> = {
  healthy:  'text-emerald-700 dark:text-emerald-400',
  degraded: 'text-yellow-700 dark:text-yellow-400',
  down:     'text-destructive',
};

const STATUS_LABEL: Record<IntegrationStatus, string> = {
  healthy:  'Healthy',
  degraded: 'Degraded',
  down:     'Down',
};

function IntegrationTile({ integration }: { integration: AdminIntegration }) {
  return (
    <div
      className={cn(
        'rounded-lg border border-border/80 bg-card p-3 space-y-1.5 transition-colors',
        integration.status === 'degraded' && 'border-yellow-500/40 bg-yellow-500/5',
        integration.status === 'down'     && 'border-destructive/40 bg-destructive/5',
      )}
    >
      <div className="flex items-center gap-2">
        <span className={cn('h-2.5 w-2.5 shrink-0 rounded-full', STATUS_DOT[integration.status])} />
        <span className="text-sm font-medium text-foreground truncate">{integration.name}</span>
      </div>
      <div className="space-y-0.5 text-xs text-muted-foreground">
        <div>p50: <span className="text-foreground">{integration.latencyP50Ms}ms</span></div>
        <div>
          Err rate:{' '}
          <span
            className={
              integration.errorRateLastHourPct > 0
                ? 'text-yellow-700 dark:text-yellow-400 font-medium'
                : ''
            }
          >
            {integration.errorRateLastHourPct}%
          </span>
        </div>
        <div className={cn('font-semibold', STATUS_TEXT[integration.status])}>
          {STATUS_LABEL[integration.status]}
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main component
// ─────────────────────────────────────────────────────────────────────────────

export function AdminDashboard() {
  const router = useRouter();
  const data = useAdminDashboard();
  const { isLoading } = data;

  // Optimistic approval actions
  const [approvalActions, setApprovalActions] = useState<Record<string, ApprovalAction>>({});
  const handleApprove = (id: string) => setApprovalActions((prev) => ({ ...prev, [id]: 'approved' }));
  const handleReject  = (id: string) => setApprovalActions((prev) => ({ ...prev, [id]: 'rejected' }));

  const pendingCount = isLoading
    ? 0
    : data.pendingApprovals.filter((a) => approvalActions[a.id] == null).length;

  const criticalBreachCount = isLoading
    ? 0
    : data.slaBreaches.filter((b) => b.overdueHours > 7 * 24).length;

  const firstDegradedIntegration = isLoading
    ? undefined
    : data.systemHealth.integrations.find((i) => i.status !== 'healthy');

  // Month-over-month trend for policies issued
  const policyTrend = !isLoading && data.platformStats.policiesIssuedLastMonth > 0
    ? {
        value: Math.abs(
          Math.round(
            ((data.platformStats.policiesIssuedMonth - data.platformStats.policiesIssuedLastMonth) /
              data.platformStats.policiesIssuedLastMonth) * 100,
          ),
        ),
        direction: (data.platformStats.policiesIssuedMonth >= data.platformStats.policiesIssuedLastMonth
          ? 'up'
          : 'down') as 'up' | 'down',
        label: 'vs last month',
      }
    : undefined;

  return (
    <>
      {/* Degraded banner — above the dashboard container */}
      {!isLoading && firstDegradedIntegration && (
        <DegradedBanner name={firstDegradedIntegration.name} />
      )}

      <DashboardLayout>

        {/* ── Section 1: Platform Stats ─────────────────────────────── */}
        <DashboardSection label="Platform Overview">
          {isLoading ? (
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-24 rounded-lg" />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              <StatCard
                value={data.platformStats.openQuotes}
                label="Open Quotes"
                onClick={() => router.push('/quotation/quotes')}
              />
              <StatCard
                value={data.platformStats.uwCasesOpen}
                label="UW Cases Open"
                variant={data.platformStats.uwCasesOpen > 5 ? 'warn' : 'default'}
                onClick={() => router.push('/quotation/uw-workbench')}
              />
              <StatCard
                value={data.platformStats.actuaryCasesOpen}
                label="Actuary Cases Open"
                variant={data.platformStats.actuaryCasesOpen > 3 ? 'warn' : 'default'}
                onClick={() => router.push('/quotation/actuary-workbench')}
              />
              <StatCard
                value={data.platformStats.proposalsInPIM}
                label="Proposals in PIM"
                onClick={() => router.push('/issuance/proposals')}
              />
              <StatCard
                value={data.platformStats.policiesIssuedMonth}
                label="Policies Issued (month)"
                variant="success"
                trend={policyTrend}
                onClick={() => router.push('/policy-admin/policies')}
              />
              <StatCard
                value={data.platformStats.slaBreachCount}
                label="SLA Breaches"
                sub={data.platformStats.slaBreachCount > 0 ? 'Action required' : 'All within SLA'}
                variant={data.platformStats.slaBreachCount > 0 ? 'danger' : 'default'}
              />
            </div>
          )}
        </DashboardSection>

        {/* ── Section 2: SLA Breaches ──────────────────────────────── */}
        <DashboardSection label="SLA Breaches">
          <SectionWidget
            title="SLA Breaches — Action Required"
            count={isLoading ? undefined : data.slaBreaches.length}
            countVariant={data.slaBreaches.length > 0 ? 'danger' : 'default'}
            emptyState="No SLA breaches — all cases are within threshold."
          >
            {isLoading ? (
              <div className="space-y-1 py-1">
                {Array.from({ length: 3 }).map((_, i) => (
                  <Skeleton key={i} className="h-12 rounded" />
                ))}
              </div>
            ) : (
              data.slaBreaches.length > 0 && (
                <>
                  {criticalBreachCount > 0 && (
                    <div className="mb-2 rounded border border-destructive/20 bg-destructive/10 px-3 py-2 text-xs font-medium text-destructive">
                      Critical: {criticalBreachCount} case{criticalBreachCount !== 1 ? 's have' : ' has'} been overdue for more than 7 days.
                    </div>
                  )}
                  {data.slaBreaches.map((breach) => (
                    <SLABreachRow key={breach.id} breach={breach} />
                  ))}
                </>
              )
            )}
          </SectionWidget>
        </DashboardSection>

        {/* ── Section 3: Team Workload ─────────────────────────────── */}
        <DashboardSection label="Team Workload">
          {isLoading ? (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Skeleton className="h-44 rounded-lg" />
              <Skeleton className="h-44 rounded-lg" />
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <TeamTable
                title="UW Queue by Person"
                members={data.teamWorkload.uwMembers}
                unassigned={data.teamWorkload.uwUnassigned}
              />
              <TeamTable
                title="Actuary Queue by Person"
                members={data.teamWorkload.actuaryMembers}
                unassigned={data.teamWorkload.actuaryUnassigned}
                showCounters
              />
            </div>
          )}
        </DashboardSection>

        {/* ── Section 4: Conversion Funnel ────────────────────────── */}
        <DashboardSection label="Conversion Funnel">
          <SectionWidget title="Platform Conversion Funnel — Last 30 Days">
            {isLoading ? (
              <div className="space-y-2 py-1">
                {Array.from({ length: 6 }).map((_, i) => (
                  <Skeleton key={i} className="h-7 rounded" />
                ))}
              </div>
            ) : (
              <>
                <div className="mb-1 flex justify-end gap-4 pr-1 text-[10px] text-muted-foreground/70">
                  <span className="w-10 text-right">Count</span>
                  <span className="w-12 text-right">Conv %</span>
                </div>
                {data.funnel.stages.map((stage, idx) => (
                  <FunnelStageRow
                    key={stage.label}
                    stage={stage}
                    maxCount={data.funnel.stages[0]?.count ?? 1}
                    isFirst={idx === 0}
                  />
                ))}
                <div className="mt-4 flex flex-wrap gap-6 border-t border-border/40 pt-3 text-xs text-muted-foreground">
                  <span>
                    Avg end-to-end cycle time:{' '}
                    <strong className="text-foreground">{data.funnel.avgCycleTimeDays} days</strong>
                  </span>
                  <span>
                    Quote-to-policy value:{' '}
                    <strong className="text-foreground">
                      {formatMoney(data.funnel.quoteToValueAmount, data.funnel.quoteToValueCurrency)}
                    </strong>
                  </span>
                </div>
              </>
            )}
          </SectionWidget>
        </DashboardSection>

        {/* ── Section 5: Pending Admin Approvals ──────────────────── */}
        <DashboardSection label="Pending Approvals">
          <SectionWidget
            title="Requires Your Approval"
            count={isLoading ? undefined : pendingCount}
            countVariant={pendingCount > 0 ? 'warn' : 'default'}
            emptyState="No pending approvals."
          >
            {isLoading ? (
              <div className="space-y-1 py-1">
                {Array.from({ length: 3 }).map((_, i) => (
                  <Skeleton key={i} className="h-12 rounded" />
                ))}
              </div>
            ) : (
              data.pendingApprovals.length > 0 && (
                data.pendingApprovals.map((approval) => (
                  <ApprovalRow
                    key={approval.id}
                    approval={approval}
                    onApprove={handleApprove}
                    onReject={handleReject}
                    action={approvalActions[approval.id] ?? null}
                  />
                ))
              )
            )}
          </SectionWidget>
        </DashboardSection>

        {/* ── Section 6: System Health ─────────────────────────────── */}
        <DashboardSection label="System Health">
          <SectionWidget title="System Health">
            {isLoading ? (
              <div className="grid grid-cols-2 gap-3 py-1 sm:grid-cols-3">
                {Array.from({ length: 6 }).map((_, i) => (
                  <Skeleton key={i} className="h-20 rounded-lg" />
                ))}
              </div>
            ) : (
              <>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                  {data.systemHealth.integrations.map((integration) => (
                    <IntegrationTile key={integration.id} integration={integration} />
                  ))}
                </div>
                <div className="mt-4 flex items-center gap-3 border-t border-border/40 pt-3">
                  <span className="text-xs text-muted-foreground">Event Processing Lag</span>
                  <MiniSparkline
                    data={data.systemHealth.eventLagSparkline}
                    color="var(--primary)"
                  />
                  <span className="text-xs font-semibold text-foreground">
                    {data.systemHealth.eventLagMs}ms
                  </span>
                </div>
              </>
            )}
          </SectionWidget>
        </DashboardSection>

        {/* ── CTA bar ────────────────────────────────────────────────── */}
        <div className="flex flex-col gap-3 pt-2 sm:flex-row">
          <Button onClick={() => router.push('/quotation/uw-workbench?assign=1')} className="gap-1.5">
            Assign Unassigned Cases
          </Button>
          <Button variant="outline" onClick={() => router.push('/quotation/quotes')}>
            View All Quotes
          </Button>
          <Button variant="outline" onClick={() => router.push('/issuance/proposals')}>
            View All Proposals
          </Button>
        </div>

      </DashboardLayout>
    </>
  );
}
