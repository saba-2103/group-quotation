'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { CheckCircle2, ChevronRight } from 'lucide-react';
import { useRfqBundle } from '@/context/RfqBundleContext';
import { useHandoffStore } from '@/stores/handoffStore';
import { useRole } from '@/hooks/useRole';
import { computePlanRoutingStatus } from '@/lib/computations';
import { canDispatch } from '@/lib/permissions';
import { updatePlan } from '@/lib/api/quotation-client';
import {
  HandoffKind, HandoffStatus, PlanHandoffStatus,
  type HandoffTask,
} from '@/lib/types';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function localId() {
  return `task-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
}

function fmt(n: number) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency', currency: 'INR', maximumFractionDigits: 0,
  }).format(n);
}

function slaDisplay(task: HandoffTask): { text: string; overdue: boolean } {
  const deadline = new Date(task.requestedAt).getTime() + task.slaHours * 3600 * 1000;
  const remainingH = (deadline - Date.now()) / 3600 / 1000;
  if (remainingH < 0) return { text: 'Overdue', overdue: true };
  return { text: `${Math.round(remainingH)}h remaining`, overdue: false };
}

const TASK_STATUS_COLORS: Record<HandoffStatus, string> = {
  [HandoffStatus.REQUESTED]:  'bg-slate-50 text-slate-700 border-slate-200',
  [HandoffStatus.IN_PROGRESS]:'bg-blue-50 text-blue-700 border-blue-200',
  [HandoffStatus.PUBLISHED]:  'bg-green-50 text-green-700 border-green-200',
  [HandoffStatus.RETURNED]:   'bg-amber-50 text-amber-700 border-amber-200',
};

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function SalesDispatchPage() {
  const router = useRouter();
  const { bundle, refetch } = useRfqBundle();
  const { role, salesLevel } = useRole();
  const { upsertTask, removeTask, getTasksForRfq, getTaskForPlan } = useHandoffStore();
  const [dispatching, setDispatching] = useState(false);

  if (!bundle) return null;

  const rfqId = bundle.rfqId;
  const allPlans = bundle.plans;
  const tasks = getTasksForRfq(rfqId);
  const canDispatchAction = canDispatch(role, salesLevel);

  // Derive routing for all plans
  const planRouting = allPlans.map((plan) => ({
    plan,
    routing: computePlanRoutingStatus(plan, bundle.mphAppetite, tasks),
    version: bundle.quoteVersions.find((v) => v.id === plan.quoteVersionId),
  }));

  const awaitingPlans = planRouting.filter(({ plan, routing }) =>
    routing !== 'STP' &&
    routing !== 'PRICED' &&
    !getTaskForPlan(plan.planId, HandoffKind.ACTUARY) &&
    !getTaskForPlan(plan.planId, HandoffKind.UW)
  );

  const stpPlans = planRouting.filter(({ routing }) => routing === 'STP');

  // KPI counts
  const totalAsks = tasks.length;
  const dispatchedCount = tasks.filter((t) =>
    [HandoffStatus.IN_PROGRESS, HandoffStatus.PUBLISHED, HandoffStatus.RETURNED].includes(t.status)
  ).length;
  const awaitingCount = awaitingPlans.length;
  const stpCount = stpPlans.length;

  async function handleDispatchAll() {
    setDispatching(true);
    try {
      for (const { plan, routing } of awaitingPlans) {
        const kind = routing === 'NEEDS_UW' ? HandoffKind.UW : HandoffKind.ACTUARY;
        const slaHours = kind === HandoffKind.UW ? 72 : 48;
        const handoffStatus = kind === HandoffKind.UW
          ? PlanHandoffStatus.UW_REFERRED
          : PlanHandoffStatus.PRICING_REQUESTED;
        upsertTask({
          taskId: localId(),
          rfqId,
          planId: plan.planId,
          versionId: plan.quoteVersionId,
          kind,
          status: HandoffStatus.REQUESTED,
          reason: 'Batch dispatch from sales dispatch screen',
          lives: bundle!.members.length,
          slaHours,
          requestedAt: new Date().toISOString(),
        });
        await updatePlan(rfqId, plan.planId, { handoffStatus });
      }
      await refetch();
    } finally {
      setDispatching(false);
    }
  }

  async function handleAcceptPricing(task: HandoffTask) {
    removeTask(task.taskId);
    await updatePlan(rfqId, task.planId, { handoffStatus: PlanHandoffStatus.PRICED });
    await refetch();
  }

  async function handleAcknowledge(task: HandoffTask) {
    removeTask(task.taskId);
    await updatePlan(rfqId, task.planId, { handoffStatus: PlanHandoffStatus.RETURNED });
    await refetch();
  }

  async function handleCancelTask(task: HandoffTask) {
    removeTask(task.taskId);
    await updatePlan(rfqId, task.planId, { handoffStatus: PlanHandoffStatus.DRAFT });
    await refetch();
  }

  async function handleRequestSingle(planId: string, versionId: string, routing: string) {
    const kind = routing === 'NEEDS_UW' ? HandoffKind.UW : HandoffKind.ACTUARY;
    const slaHours = kind === HandoffKind.UW ? 72 : 48;
    const handoffStatus = kind === HandoffKind.UW
      ? PlanHandoffStatus.UW_REFERRED
      : PlanHandoffStatus.PRICING_REQUESTED;
    upsertTask({
      taskId: localId(),
      rfqId,
      planId,
      versionId,
      kind,
      status: HandoffStatus.REQUESTED,
      reason: 'Manual request from sales dispatch screen',
      lives: bundle!.members.length,
      slaHours,
      requestedAt: new Date().toISOString(),
    });
    await updatePlan(rfqId, planId, { handoffStatus });
    await refetch();
  }

  return (
    <div className="flex flex-col gap-6 p-6 max-w-[1200px] mx-auto">
      {/* P-HEADER */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-xl font-bold tracking-tight">Sales Dispatch</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {bundle.employerName} — all versions
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            size="sm" variant="default"
            disabled={!canDispatchAction || dispatching || awaitingCount === 0}
            onClick={handleDispatchAll}
          >
            {dispatching ? 'Dispatching…' : `Dispatch all pending (${awaitingCount})`}
          </Button>
          <Button
            size="sm" variant="outline"
            onClick={() => router.push(`/rfqs/${rfqId}/sales-dispatch/raise`)}
          >
            Raise request <ChevronRight className="size-3.5 ml-1" />
          </Button>
        </div>
      </div>

      {/* P-KPI */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'Total asks', value: totalAsks },
          { label: 'Dispatched', value: dispatchedCount },
          { label: 'Awaiting dispatch', value: awaitingCount },
          { label: 'Pre-approved (STP)', value: stpCount },
        ].map(({ label, value }) => (
          <div key={label} className="rounded-lg border border-border bg-card p-3.5">
            <div className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground mb-1">{label}</div>
            <div className="text-2xl font-bold tabular-nums">{value}</div>
          </div>
        ))}
      </div>

      {/* P-LIST — Dispatched queue */}
      <div className="rounded-xl border border-border bg-card">
        <div className="px-5 py-4 border-b border-border/50">
          <h2 className="text-sm font-semibold">Dispatched Queue</h2>
          <p className="text-xs text-muted-foreground mt-0.5">Open handoff tasks across all versions</p>
        </div>
        {tasks.length === 0 ? (
          <p className="px-5 py-8 text-sm text-muted-foreground italic text-center">No open dispatch tasks.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-border/50">
                  {['Plan', 'Version', 'Desk', 'Status', 'SLA', 'Actions'].map((h) => (
                    <th key={h} className="text-left px-4 py-2.5 font-medium text-muted-foreground whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {tasks.map((task) => {
                  const plan = allPlans.find((p) => p.planId === task.planId);
                  const version = bundle.quoteVersions.find((v) => v.id === task.versionId);
                  const sla = slaDisplay(task);
                  return (
                    <tr key={task.taskId} className="border-b border-border/30 last:border-0 hover:bg-muted/20 align-top">
                      <td className="px-4 py-3">
                        <div className="font-medium">{plan?.name ?? task.planId}</div>
                        {task.reason && (
                          <div className="text-[10px] text-muted-foreground mt-0.5 max-w-[160px] truncate">{task.reason}</div>
                        )}
                        {task.returnNote && (
                          <div className="text-[10px] text-amber-700 mt-0.5 italic">{task.returnNote}</div>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-medium">{version?.name ?? '—'}</div>
                        {version && (
                          <div className="text-[10px] text-muted-foreground">{version.status}</div>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span className={cn(
                          'text-[10px] font-medium border rounded-full px-2 py-0.5',
                          task.kind === HandoffKind.ACTUARY
                            ? 'bg-violet-50 text-violet-700 border-violet-200'
                            : 'bg-orange-50 text-orange-700 border-orange-200'
                        )}>
                          {task.kind}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className={cn(
                          'text-[10px] font-medium border rounded-full px-2 py-0.5 inline-block',
                          TASK_STATUS_COLORS[task.status]
                        )}>
                          {task.status}
                        </div>
                        {task.publishedPremium != null && (
                          <div className="text-[10px] mt-1 text-green-700">
                            {fmt(task.publishedPremium)}
                            {task.publishedDiscountPct != null && ` (${task.publishedDiscountPct.toFixed(1)}% disc.)`}
                          </div>
                        )}
                        <div className="text-[10px] text-muted-foreground mt-0.5">
                          {new Date(task.requestedAt).toLocaleDateString('en-IN')}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className={cn(
                          'text-[10px] font-medium',
                          sla.overdue ? 'text-destructive' : 'text-muted-foreground'
                        )}>
                          {sla.text}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-col gap-1 min-w-[130px]">
                          {task.status === HandoffStatus.PUBLISHED && canDispatchAction && (
                            <Button
                              size="sm" variant="outline"
                              className="text-[10px] h-6 px-2 text-green-700 border-green-300"
                              onClick={() => handleAcceptPricing(task)}
                            >
                              Accept pricing
                            </Button>
                          )}
                          {task.status === HandoffStatus.RETURNED && (
                            <Button
                              size="sm" variant="outline"
                              className="text-[10px] h-6 px-2"
                              onClick={() => handleAcknowledge(task)}
                            >
                              Acknowledge & clear
                            </Button>
                          )}
                          <span className="text-[10px] text-muted-foreground underline cursor-pointer">
                            Open {task.kind === HandoffKind.ACTUARY ? 'actuary' : 'UW'} queue
                          </span>
                          {[HandoffStatus.REQUESTED, HandoffStatus.IN_PROGRESS].includes(task.status) && (
                            <Button
                              size="sm" variant="ghost"
                              className="text-[10px] h-6 px-2 text-destructive hover:text-destructive"
                              onClick={() => handleCancelTask(task)}
                            >
                              Cancel
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* P-LIST — Awaiting dispatch */}
      {awaitingPlans.length > 0 && (
        <div className="rounded-xl border border-border bg-card">
          <div className="px-5 py-4 border-b border-border/50">
            <h2 className="text-sm font-semibold">Awaiting Dispatch ({awaitingPlans.length})</h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Plans with no open task and routing status not STP
            </p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-border/50">
                  {['Plan', 'Version', 'Routing', 'Actions'].map((h) => (
                    <th key={h} className="text-left px-4 py-2.5 font-medium text-muted-foreground">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {awaitingPlans.map(({ plan, routing, version }) => (
                  <tr key={plan.planId} className="border-b border-border/30 last:border-0 hover:bg-muted/20">
                    <td className="px-4 py-3 font-medium">{plan.name}</td>
                    <td className="px-4 py-3 text-muted-foreground">{version?.name ?? '—'}</td>
                    <td className="px-4 py-3">
                      <span className="text-[10px] bg-amber-50 text-amber-700 border border-amber-200 rounded-full px-2 py-0.5">
                        {routing.replace(/_/g, ' ')}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <Button
                        size="sm" variant="outline" className="text-[10px] h-6 px-2"
                        disabled={!canDispatchAction}
                        onClick={() => handleRequestSingle(plan.planId, plan.quoteVersionId, routing)}
                      >
                        {routing === 'NEEDS_UW' ? 'Refer to UW' : 'Request pricing'}
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* P-SUMMARY — STP recap */}
      {stpPlans.length > 0 && (
        <div className="rounded-xl border border-green-200 bg-green-50">
          <div className="px-5 py-4 border-b border-green-200">
            <h2 className="text-sm font-semibold text-green-800">Pre-approved (STP) Plans</h2>
            <p className="text-xs text-green-700 mt-0.5">
              These plans qualify for straight-through processing — no dispatch needed
            </p>
          </div>
          <div className="divide-y divide-green-200">
            {stpPlans.map(({ plan, version }) => (
              <div key={plan.planId} className="px-5 py-3 flex items-center justify-between text-xs">
                <div>
                  <span className="font-medium text-green-900">{plan.name}</span>
                  {version && <span className="ml-2 text-green-700">{version.name}</span>}
                </div>
                <CheckCircle2 className="size-4 text-green-500" />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
