'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Zap, Loader2, Package, ArrowRight, CheckCircle2 } from 'lucide-react';
import { useRfqBundle } from '@/context/RfqBundleContext';
import { useHandoffStore } from '@/stores/handoffStore';
import { useRole } from '@/hooks/useRole';
import { computeGradeAllocationSummary, computePlanRoutingStatus } from '@/lib/computations';
import { getMergedTemplates } from '@/lib/constants';
import { updateRfq, updatePlan, runPricingMacro } from '@/lib/api/quotation-client';
import { canDispatch } from '@/lib/permissions';
import {
  HandoffKind, HandoffStatus, PlanHandoffStatus,
  type Plan, type RfqBundle,
} from '@/lib/types';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

// ─── Types ────────────────────────────────────────────────────────────────────

interface GradeExposureRow {
  grade: string;
  lives: number;
  avgSalary: number;
  avgSumAssured: number;
  totalSI: number;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function localId() {
  return `task-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
}

function fmt(n: number) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(n);
}

function deriveGradeRows(bundle: RfqBundle): { rows: GradeExposureRow[]; source: string } {
  if (bundle.members.length > 0) {
    const gradeMap: Record<string, { lives: number; totalSalary: number; totalSA: number }> = {};
    for (const m of bundle.members) {
      if (!gradeMap[m.grade]) gradeMap[m.grade] = { lives: 0, totalSalary: 0, totalSA: 0 };
      gradeMap[m.grade].lives++;
      gradeMap[m.grade].totalSalary += m.salary;
      gradeMap[m.grade].totalSA += m.sumAssured;
    }
    const rows = Object.entries(gradeMap).map(([grade, d]) => ({
      grade,
      lives: d.lives,
      avgSalary: d.lives > 0 ? Math.round(d.totalSalary / d.lives) : 0,
      avgSumAssured: d.lives > 0 ? Math.round(d.totalSA / d.lives) : 0,
      totalSI: Math.round(d.totalSA),
    }));
    return { rows, source: 'Derived from census' };
  }
  if (bundle.headcountData?.grades?.length) {
    const rows = bundle.headcountData.grades.map((g) => ({
      grade: g.grade,
      lives: g.lives,
      avgSalary: g.avgSalary,
      avgSumAssured: g.avgSumAssured,
      totalSI: g.lives * g.avgSumAssured,
    }));
    return { rows, source: 'Derived from aggregate headcount' };
  }
  return { rows: [], source: '' };
}

function getAllocatedLives(planId: string, bundle: RfqBundle): number {
  const allocations = bundle.gradeAllocations[bundle.activeVersionId] ?? {};
  const allocatedGrades = Object.entries(allocations)
    .filter(([, pid]) => pid === planId)
    .map(([grade]) => grade);
  if (bundle.members.length > 0) {
    return bundle.members.filter((m) => allocatedGrades.includes(m.grade)).length;
  }
  if (bundle.headcountData?.grades) {
    return bundle.headcountData.grades
      .filter((g) => allocatedGrades.includes(g.grade))
      .reduce((s, g) => s + g.lives, 0);
  }
  return 0;
}

const ROUTING_COLORS: Record<string, string> = {
  STP:               'bg-green-50 text-green-700 border-green-200',
  PRICED:            'bg-blue-50 text-blue-700 border-blue-200',
  NEEDS_PRICING:     'bg-amber-50 text-amber-700 border-amber-200',
  PRICING_REQUESTED: 'bg-violet-50 text-violet-700 border-violet-200',
  UW_REFERRED:       'bg-orange-50 text-orange-700 border-orange-200',
  NEEDS_UW:          'bg-red-50 text-red-700 border-red-200',
};

const ROUTING_LABELS: Record<string, string> = {
  STP:               'STP',
  PRICED:            'Priced',
  NEEDS_PRICING:     'Needs Pricing',
  PRICING_REQUESTED: 'Pricing Requested',
  UW_REFERRED:       'UW Referred',
  NEEDS_UW:          'Needs UW',
};

function CompletenessBar({ pct }: { pct: number }) {
  return (
    <div className="flex items-center gap-2">
      <div className="h-1.5 w-16 rounded-full bg-muted overflow-hidden">
        <div
          className={cn(
            'h-full rounded-full',
            pct === 100 ? 'bg-green-500' : pct >= 60 ? 'bg-amber-500' : 'bg-destructive'
          )}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="text-xs tabular-nums">{pct}%</span>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function PlansPage() {
  const router = useRouter();
  const { bundle, refetch } = useRfqBundle();
  const { role, salesLevel } = useRole();
  const { upsertTask, removeTask, getTaskForPlan, getTasksForRfq } = useHandoffStore();
  const [pricing, setPricing] = useState(false);
  const [allocLoading, setAllocLoading] = useState<Record<string, boolean>>({});

  if (!bundle) return null;

  const rfqId = bundle.rfqId;
  const activePlans = bundle.plans.filter((p) => p.quoteVersionId === bundle.activeVersionId);
  const tasksForRfq = getTasksForRfq(rfqId);
  const allocations = bundle.gradeAllocations[bundle.activeVersionId] ?? {};
  const { rows: gradeRows, source: gradeSource } = deriveGradeRows(bundle);
  const allocatedCount = Object.keys(allocations).length;
  const totalGrades = gradeRows.length;

  const canPriceWithActuary = role === 'SALES' || role === 'ACTUARIAL' || role === 'ACTUARY';
  const canRequestPricing = canDispatch(role, salesLevel);
  const templates = getMergedTemplates();
  const hasCensus = bundle.members.length > 0 || !!bundle.headcountData?.grades?.length;

  async function handlePriceWithActuary() {
    setPricing(true);
    try {
      await runPricingMacro(rfqId);
      await refetch();
    } catch {/* ignore */} finally {
      setPricing(false);
    }
  }

  async function handleAllocation(grade: string, planId: string) {
    setAllocLoading((s) => ({ ...s, [grade]: true }));
    const current = bundle!.gradeAllocations[bundle!.activeVersionId] ?? {};
    let next: Record<string, string>;
    if (!planId) {
      next = { ...current };
      delete next[grade];
    } else {
      next = { ...current, [grade]: planId };
    }
    try {
      await updateRfq(rfqId, {
        gradeAllocations: { ...bundle!.gradeAllocations, [bundle!.activeVersionId]: next },
      });
      await refetch();
    } finally {
      setAllocLoading((s) => ({ ...s, [grade]: false }));
    }
  }

  async function handleRequestPricing(plan: Plan) {
    const lives = getAllocatedLives(plan.planId, bundle!);
    upsertTask({
      taskId: localId(),
      rfqId,
      planId: plan.planId,
      versionId: bundle!.activeVersionId,
      kind: HandoffKind.ACTUARY,
      status: HandoffStatus.REQUESTED,
      reason: 'Pricing requested from plans screen',
      lives,
      slaHours: 48,
      requestedAt: new Date().toISOString(),
    });
    await updatePlan(rfqId, plan.planId, { handoffStatus: PlanHandoffStatus.PRICING_REQUESTED });
    await refetch();
  }

  async function handleReferToUW(plan: Plan) {
    const lives = getAllocatedLives(plan.planId, bundle!);
    upsertTask({
      taskId: localId(),
      rfqId,
      planId: plan.planId,
      versionId: bundle!.activeVersionId,
      kind: HandoffKind.UW,
      status: HandoffStatus.REQUESTED,
      reason: 'UW referral from plans screen',
      lives,
      slaHours: 72,
      requestedAt: new Date().toISOString(),
    });
    await updatePlan(rfqId, plan.planId, { handoffStatus: PlanHandoffStatus.UW_REFERRED });
    await refetch();
  }

  async function handleCancelTask(plan: Plan, kind: HandoffKind) {
    const task = getTaskForPlan(plan.planId, kind);
    if (task) removeTask(task.taskId);
    await updatePlan(rfqId, plan.planId, { handoffStatus: PlanHandoffStatus.DRAFT });
    await refetch();
  }

  return (
    <div className="flex flex-col gap-6 p-6 max-w-[1400px] mx-auto">
      {/* P-HEADER */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-xl font-bold tracking-tight">Plans</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {bundle.employerName} — active version
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            disabled={!canPriceWithActuary || pricing}
            onClick={handlePriceWithActuary}
          >
            {pricing ? (
              <><Loader2 className="size-4 mr-1.5 animate-spin" /> Pricing…</>
            ) : (
              <><Zap className="size-4 mr-1.5" /> Price with actuary</>
            )}
          </Button>
          <Button
            size="sm"
            variant="default"
            onClick={() => router.push(`/rfqs/${rfqId}/plans/new`)}
          >
            <Plus className="size-4 mr-1.5" /> Plan wizard
          </Button>
        </div>
      </div>

      {/* P-LIST — Census exposure */}
      <div className="rounded-xl border border-border bg-card">
        <div className="flex items-center justify-between px-5 py-4 border-b border-border/50">
          <div>
            <h2 className="text-sm font-semibold">Census Exposure</h2>
            {gradeSource && (
              <p className="text-xs text-muted-foreground mt-0.5">{gradeSource}</p>
            )}
          </div>
          {gradeRows.length > 0 && (
            <span className="text-xs text-muted-foreground">
              <span className={cn('font-semibold', allocatedCount === totalGrades && totalGrades > 0 ? 'text-green-600' : 'text-amber-600')}>
                {allocatedCount}
              </span>
              /{totalGrades} grades allocated
            </span>
          )}
        </div>
        {gradeRows.length === 0 ? (
          <div className="px-5 py-10 text-center">
            <p className="text-sm text-muted-foreground mb-3">No census or headcount data loaded yet.</p>
            <Button size="sm" variant="outline" onClick={() => router.push(`/rfqs/${rfqId}/census-workbench`)}>
              Go to Census Workbench <ArrowRight className="size-3.5 ml-1.5" />
            </Button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-border/50">
                  {['Grade', 'Lives', 'Avg Salary', 'Avg SA', 'Total SI', 'Plan Allocation'].map((h) => (
                    <th key={h} className="text-left px-4 py-2.5 font-medium text-muted-foreground whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {gradeRows.map((row) => (
                  <tr key={row.grade} className="border-b border-border/30 last:border-0 hover:bg-muted/20">
                    <td className="px-4 py-2.5 font-medium">{row.grade}</td>
                    <td className="px-4 py-2.5 tabular-nums">{row.lives.toLocaleString()}</td>
                    <td className="px-4 py-2.5 tabular-nums">{fmt(row.avgSalary)}</td>
                    <td className="px-4 py-2.5 tabular-nums">{fmt(row.avgSumAssured)}</td>
                    <td className="px-4 py-2.5 tabular-nums">{fmt(row.totalSI)}</td>
                    <td className="px-4 py-2.5">
                      {activePlans.length === 0 ? (
                        <span className="text-[10px] text-muted-foreground italic">Create a plan to allocate</span>
                      ) : (
                        <select
                          className="text-xs border border-border rounded-md px-2 py-1 bg-background focus:outline-none focus:ring-1 focus:ring-primary/30 disabled:opacity-50"
                          value={allocations[row.grade] ?? ''}
                          disabled={allocLoading[row.grade]}
                          onChange={(e) => handleAllocation(row.grade, e.target.value)}
                        >
                          <option value="">Unallocated</option>
                          {activePlans.map((p) => (
                            <option key={p.planId} value={p.planId}>{p.name}</option>
                          ))}
                        </select>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* P-LAUNCHPAD — Template picker */}
      <div className="rounded-xl border border-border bg-card px-5 py-4">
        <h2 className="text-sm font-semibold mb-3">Quick-start Templates</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
          {templates.map((tmpl) => (
            <button
              key={tmpl.id}
              className="text-left rounded-lg border border-border bg-background hover:bg-muted/40 hover:border-primary/40 transition-colors p-3"
              onClick={() => router.push(`/rfqs/${rfqId}/plans/new?template=${tmpl.id}`)}
            >
              <div className="flex items-start justify-between mb-1.5 gap-2">
                <p className="text-xs font-semibold leading-tight">{tmpl.name}</p>
                <div className="flex gap-1 shrink-0">
                  {tmpl.censusAware && hasCensus && (
                    <span className="text-[9px] bg-green-50 border border-green-200 text-green-700 rounded-full px-1.5 py-0.5">
                      Uses your census
                    </span>
                  )}
                  {tmpl.isCustom && (
                    <span className="text-[9px] bg-violet-50 border border-violet-200 text-violet-700 rounded-full px-1.5 py-0.5">
                      Custom
                    </span>
                  )}
                </div>
              </div>
              <p className="text-[10px] text-muted-foreground leading-snug mb-2">{tmpl.description}</p>
              <div className="flex flex-wrap gap-1">
                {tmpl.tags.slice(0, 3).map((t) => (
                  <span key={t} className="text-[9px] bg-muted border border-border/50 rounded px-1.5 py-0.5">{t}</span>
                ))}
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* P-LIST — Plan portfolio */}
      <div className="rounded-xl border border-border bg-card">
        <div className="flex items-center justify-between px-5 py-4 border-b border-border/50">
          <h2 className="text-sm font-semibold">Plan Portfolio</h2>
          <span className="text-xs text-muted-foreground">{activePlans.length} plan(s) in active version</span>
        </div>
        {activePlans.length === 0 ? (
          <div className="px-5 py-10 text-center">
            <Package className="size-8 text-muted-foreground/40 mx-auto mb-3" />
            <p className="text-sm text-muted-foreground mb-3">
              No plans defined yet — start the wizard or pick a template above.
            </p>
            <Button size="sm" onClick={() => router.push(`/rfqs/${rfqId}/plans/new`)}>
              <Plus className="size-4 mr-1.5" /> Plan wizard
            </Button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-border/50">
                  {['Plan', 'Routing', 'Product', 'Cover', 'SA Basis', 'Alloc. Lives', 'Premium', 'Complete', 'Actions'].map((h) => (
                    <th key={h} className="text-left px-4 py-2.5 font-medium text-muted-foreground whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {activePlans.map((plan, idx) => {
                  const routing = computePlanRoutingStatus(plan, bundle.mphAppetite, tasksForRfq);
                  const actuaryTask = getTaskForPlan(plan.planId, HandoffKind.ACTUARY);
                  const uwTask = getTaskForPlan(plan.planId, HandoffKind.UW);
                  const allocLives = getAllocatedLives(plan.planId, bundle);
                  const versionRun = bundle.actuaryPricing.byVersion[bundle.activeVersionId];
                  const planPremium = versionRun?.byPlan?.[plan.planId]?.premium;

                  return (
                    <tr key={plan.planId} className="border-b border-border/30 last:border-0 hover:bg-muted/20 align-top">
                      <td className="px-4 py-3">
                        <div className="font-medium">{plan.name}</div>
                        <div className="text-muted-foreground text-[10px] font-mono">P{idx + 1}</div>
                      </td>
                      <td className="px-4 py-3">
                        <span className={cn(
                          'text-[10px] font-medium border rounded-full px-2 py-0.5 whitespace-nowrap',
                          ROUTING_COLORS[routing] ?? 'bg-muted text-muted-foreground border-border'
                        )}>
                          {ROUTING_LABELS[routing] ?? routing}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-mono text-[10px] text-muted-foreground">{plan.productCode ?? '—'}</td>
                      <td className="px-4 py-3">{plan.coverPattern ?? '—'}</td>
                      <td className="px-4 py-3">{plan.sumAssuredBasis ?? '—'}</td>
                      <td className="px-4 py-3 tabular-nums">{allocLives > 0 ? allocLives.toLocaleString() : '—'}</td>
                      <td className="px-4 py-3 tabular-nums">{planPremium != null ? fmt(planPremium) : '—'}</td>
                      <td className="px-4 py-3">
                        <CompletenessBar pct={plan.completeness} />
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-col gap-1 min-w-[150px]">
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-[10px] h-6 px-2"
                            onClick={() => router.push(`/rfqs/${rfqId}/plans/${plan.planId}`)}
                          >
                            Open detail
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-[10px] h-6 px-2"
                            onClick={() => router.push(`/rfqs/${rfqId}/plans/new?planId=${plan.planId}`)}
                          >
                            Edit in wizard
                          </Button>
                          {routing === 'STP' ? (
                            <span className="text-[10px] text-green-700 flex items-center gap-1 py-0.5">
                              <CheckCircle2 className="size-3" /> Pre-approved
                            </span>
                          ) : (
                            <>
                              {!actuaryTask && canRequestPricing && (
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="text-[10px] h-6 px-2 text-violet-700 hover:text-violet-800"
                                  onClick={() => handleRequestPricing(plan)}
                                >
                                  Request pricing
                                </Button>
                              )}
                              {actuaryTask && (
                                <>
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    className="text-[10px] h-6 px-2 text-destructive hover:text-destructive"
                                    onClick={() => handleCancelTask(plan, HandoffKind.ACTUARY)}
                                  >
                                    Cancel pricing req.
                                  </Button>
                                  <span className="text-[10px] text-muted-foreground underline cursor-pointer">
                                    Open in actuary queue
                                  </span>
                                </>
                              )}
                              {!uwTask && routing === 'NEEDS_UW' && (
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="text-[10px] h-6 px-2 text-amber-700 hover:text-amber-800"
                                  onClick={() => handleReferToUW(plan)}
                                >
                                  Refer to UW
                                </Button>
                              )}
                              {uwTask && (
                                <>
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    className="text-[10px] h-6 px-2 text-destructive hover:text-destructive"
                                    onClick={() => handleCancelTask(plan, HandoffKind.UW)}
                                  >
                                    Cancel UW referral
                                  </Button>
                                  <span className="text-[10px] text-muted-foreground underline cursor-pointer">
                                    Open in UW queue
                                  </span>
                                </>
                              )}
                            </>
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
    </div>
  );
}

