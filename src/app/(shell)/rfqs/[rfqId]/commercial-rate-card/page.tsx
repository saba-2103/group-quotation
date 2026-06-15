'use client';

import { useState } from 'react';
import { Zap, Download, Loader2, AlertTriangle, Info, CheckCircle2, Shield } from 'lucide-react';
import { useRfqBundle } from '@/context/RfqBundleContext';
import { useEscalationStore } from '@/stores/escalationStore';
import { useHandoffStore } from '@/stores/handoffStore';
import { useRole } from '@/hooks/useRole';
import { canAddClauseCarveout } from '@/lib/permissions';
import { RATE_CARDS, AVAILABLE_RIDERS } from '@/lib/constants';
import { runPricingMacro, updatePlan } from '@/lib/api/quotation-client';
import {
  EscalationKind, EscalationStatus, HandoffKind, HandoffStatus, PlanHandoffStatus,
  type ExcludedClause, type Plan,
} from '@/lib/types';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function localId() {
  return `id-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
}

function fmt(n: number) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency', currency: 'INR', maximumFractionDigits: 0,
  }).format(n);
}

const TABS = [
  'Rate Build-Up', 'Gross-up & Floor', 'Rate Grid', 'Riders', 'Model Factor', 'Per-Plan Allocation',
] as const;
type Tab = typeof TABS[number];

// ─── KPI Card ─────────────────────────────────────────────────────────────────

function KpiCard({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-lg border border-border bg-card p-3.5">
      <div className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground mb-1">{label}</div>
      <div className="text-base font-bold tabular-nums">{value}</div>
      {sub && <div className="text-[10px] text-muted-foreground mt-0.5">{sub}</div>}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function CommercialRateCardPage() {
  const { bundle, refetch } = useRfqBundle();
  const { role, userName } = useRole();
  const { raise, getForVersion } = useEscalationStore();
  const { upsertTask, getTaskForPlan } = useHandoffStore();

  const [tab, setTab] = useState<Tab>('Rate Build-Up');
  const [lever, setLever] = useState<number>(1.0);
  const [pricingLoading, setPricingLoading] = useState(false);
  const [addingClauseForPlanId, setAddingClauseForPlanId] = useState<string | null>(null);
  const [newClause, setNewClause] = useState({ code: '', label: '', reason: '' });

  if (!bundle) return null;

  const rfqId = bundle.rfqId;
  const activeVersionId = bundle.activeVersionId;
  const activeVersion = bundle.quoteVersions.find((v) => v.id === activeVersionId);
  const priceRun = bundle.actuaryPricing.byVersion[activeVersionId];
  const activePlans = bundle.plans.filter((p) => p.quoteVersionId === activeVersionId);

  const isSales = role === 'SALES';
  const isActuarial = canAddClauseCarveout(role);
  const canPriceAction = role === 'SALES' || role === 'ACTUARIAL' || role === 'ACTUARY';

  // Lever calculations
  const discountPct = Math.round((1 - lever) * 100 * 10) / 10;
  const appetite = bundle.mphAppetite;
  const versionEscalations = getForVersion(rfqId, activeVersionId).filter(
    (e) => e.kind === EscalationKind.EXTRA_DISCOUNT
  );
  const pendingOverride = versionEscalations.find((e) => e.status === EscalationStatus.PENDING);
  const approvedOverride = versionEscalations.find((e) => e.status === EscalationStatus.APPROVED);
  const rejectedOverride = versionEscalations.find((e) => e.status === EscalationStatus.REJECTED);

  const effectiveBuffer = appetite
    ? Math.max(appetite.maxDiscountPct, approvedOverride?.askedPct ?? 0)
    : 100;
  const isWithinAuthority = !appetite || discountPct <= effectiveBuffer;
  const overByPct = Math.max(0, discountPct - effectiveBuffer);

  const scaledFinal = priceRun
    ? priceRun.finalPremiumInclGst * (lever / Math.max(priceRun.modelFactor, 0.01))
    : 0;
  const belowFloor = priceRun ? scaledFinal < priceRun.breakEvenFloor : false;

  const rateCard = RATE_CARDS.find((r) => r.ref === bundle.finalRateCard?.ref) ?? RATE_CARDS[0];

  async function handlePriceWithActuary() {
    setPricingLoading(true);
    try { await runPricingMacro(rfqId); await refetch(); } catch { /* ignore */ }
    finally { setPricingLoading(false); }
  }

  async function handleExport() {
    try {
      const blob = await runPricingMacro(rfqId);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `pricing-macro-${rfqId}.xlsx`;
      a.click();
      URL.revokeObjectURL(url);
    } catch { /* ignore */ }
  }

  async function handleAddClause(plan: Plan) {
    if (!newClause.code || !newClause.label) return;
    const clause: ExcludedClause = { ...newClause, byDesk: userName };
    await updatePlan(rfqId, plan.planId, {
      excludedClauses: [...plan.excludedClauses, clause],
    });
    await refetch();
    setAddingClauseForPlanId(null);
    setNewClause({ code: '', label: '', reason: '' });
  }

  async function handleRemoveClause(plan: Plan, code: string) {
    await updatePlan(rfqId, plan.planId, {
      excludedClauses: plan.excludedClauses.filter((c) => c.code !== code),
    });
    await refetch();
  }

  async function handleRequestCarveOut(plan: Plan) {
    upsertTask({
      taskId: localId(),
      rfqId,
      planId: plan.planId,
      versionId: activeVersionId,
      kind: HandoffKind.ACTUARY,
      status: HandoffStatus.REQUESTED,
      reason: 'Clause carve-out request from rate card screen',
      lives: 0,
      slaHours: 24,
      requestedAt: new Date().toISOString(),
    });
    await updatePlan(rfqId, plan.planId, { handoffStatus: PlanHandoffStatus.PRICING_REQUESTED });
    await refetch();
  }

  // ── Tab renderers ─────────────────────────────────────────────────────────

  function renderRateBuildUp() {
    const base = rateCard?.blendedRatePermille ?? 2.5;
    const occupational = 0.20;
    const claims = 0.10;
    return (
      <div className="space-y-3">
        <p className="text-[11px] text-muted-foreground italic">FE-derived / Illustrative — based on allocated rate card</p>
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-border/50">
              <th className="text-left px-3 py-2 font-medium text-muted-foreground">Component</th>
              <th className="text-right px-3 py-2 font-medium text-muted-foreground">Rate (‰ of SA)</th>
            </tr>
          </thead>
          <tbody>
            {[
              ['Base blended rate', base.toFixed(2)],
              ['Occupational loading', occupational.toFixed(2)],
              ['Claims loading', claims.toFixed(2)],
              ['Technical rate', (base + occupational + claims).toFixed(2)],
            ].map(([label, val]) => (
              <tr key={label} className="border-b border-border/30 last:border-0">
                <td className="px-3 py-2 font-medium">{label}</td>
                <td className="px-3 py-2 text-right tabular-nums">{val}‰</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  function renderGrossupFloor() {
    return (
      <div className="space-y-3">
        <p className="text-[11px] text-muted-foreground italic">Gross-up factors and floor values — Illustrative</p>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {[
            { label: 'Gross-up Factor', val: `${rateCard?.grossUpFactor ?? 1.18}×` },
            { label: 'GST Rate', val: `${rateCard?.gstPct ?? 18}%` },
            { label: 'Technical Premium', val: priceRun ? fmt(priceRun.technicalPremium) : '—' },
            { label: 'Final (incl. GST)', val: priceRun ? fmt(priceRun.finalPremiumInclGst) : '—' },
            { label: 'Break-even Floor', val: priceRun ? fmt(priceRun.breakEvenFloor) : '—' },
            { label: 'Feasibility', val: priceRun ? (priceRun.feasible ? '✓ Feasible' : '✗ Not feasible') : '—' },
          ].map(({ label, val }) => (
            <div key={label} className="rounded-lg border border-border p-3">
              <div className="text-[10px] text-muted-foreground mb-1">{label}</div>
              <div className="text-sm font-semibold">{val}</div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  function renderRateGrid() {
    const base = rateCard?.blendedRatePermille ?? 2.5;
    const bands = ['18–25', '26–35', '36–45', '46–55', '56–65'];
    const factors = [0.70, 0.90, 1.00, 1.30, 1.80];
    return (
      <div className="space-y-3">
        <p className="text-[11px] text-muted-foreground italic">Illustrative rate grid — age band × gender (‰ per annum)</p>
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-border/50">
              <th className="text-left px-3 py-2 font-medium text-muted-foreground">Age Band</th>
              <th className="text-right px-3 py-2 font-medium text-muted-foreground">Male</th>
              <th className="text-right px-3 py-2 font-medium text-muted-foreground">Female</th>
            </tr>
          </thead>
          <tbody>
            {bands.map((band, i) => (
              <tr key={band} className="border-b border-border/30 last:border-0">
                <td className="px-3 py-2">{band}</td>
                <td className="px-3 py-2 text-right tabular-nums">{(base * factors[i]).toFixed(2)}‰</td>
                <td className="px-3 py-2 text-right tabular-nums">{(base * factors[i] * 0.78).toFixed(2)}‰</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  function renderRiders() {
    return (
      <div className="space-y-3">
        <p className="text-[11px] text-muted-foreground italic">Available rider rates — Illustrative</p>
        <div className="space-y-2">
          {AVAILABLE_RIDERS.map((r) => (
            <div key={r.id} className="rounded-lg border border-border px-4 py-3 flex items-center justify-between gap-4">
              <div>
                <p className="text-xs font-medium">{r.name}</p>
                <p className="text-[10px] text-muted-foreground mt-0.5">{r.description}</p>
              </div>
              <span className="text-xs tabular-nums font-mono shrink-0">
                {r.rateType === 'flat' ? `${r.defaultRate}‰` : `${r.defaultRate}% of base`}
              </span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  function renderModelFactor() {
    const steps = [0.70, 0.75, 0.80, 0.85, 0.90, 0.95, 1.00, 1.05, 1.10];
    const base = priceRun?.finalPremiumInclGst ?? 0;
    const modelBase = priceRun?.modelFactor ?? 1.0;
    return (
      <div className="space-y-3">
        <p className="text-[11px] text-muted-foreground italic">Model factor sensitivity — FE-derived</p>
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-border/50">
              <th className="text-left px-3 py-2 font-medium text-muted-foreground">Model Factor</th>
              <th className="text-right px-3 py-2 font-medium text-muted-foreground">Est. Final Premium</th>
              <th className="text-right px-3 py-2 font-medium text-muted-foreground">vs. Current</th>
            </tr>
          </thead>
          <tbody>
            {steps.map((f) => {
              const est = base > 0 ? base * (f / Math.max(modelBase, 0.01)) : 0;
              const diffNum = base > 0 ? (est - base) / base * 100 : 0;
              const isCurrent = Math.abs(f - modelBase) < 0.001;
              return (
                <tr key={f} className={cn('border-b border-border/30 last:border-0', isCurrent && 'bg-primary/5')}>
                  <td className="px-3 py-2 font-mono">
                    {f.toFixed(2)}
                    {isCurrent && (
                      <span className="ml-2 text-[9px] bg-primary/10 text-primary rounded-full px-1.5 py-0.5">current</span>
                    )}
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums">{est > 0 ? fmt(est) : '—'}</td>
                  <td className={cn(
                    'px-3 py-2 text-right tabular-nums',
                    base === 0 ? '' : diffNum > 0 ? 'text-red-600' : diffNum < 0 ? 'text-green-600' : ''
                  )}>
                    {base === 0 ? '—' : `${diffNum > 0 ? '+' : ''}${diffNum.toFixed(1)}%`}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    );
  }

  function renderPerPlanAllocation() {
    return (
      <div className="space-y-3">
        <p className="text-[11px] text-muted-foreground italic">Per-plan premium allocation — from actuary pricing run</p>
        {!priceRun ? (
          <p className="text-sm text-muted-foreground italic">No pricing run available for the active version.</p>
        ) : (
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-border/50">
                {['Plan', 'Lives', 'Premium', 'Eff. Discount'].map((h) => (
                  <th key={h} className="text-left px-3 py-2 font-medium text-muted-foreground">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {activePlans.map((plan) => {
                const pr = priceRun.byPlan?.[plan.planId];
                return (
                  <tr key={plan.planId} className="border-b border-border/30 last:border-0">
                    <td className="px-3 py-2 font-medium">{plan.name}</td>
                    <td className="px-3 py-2 tabular-nums">{pr?.lives?.toLocaleString() ?? '—'}</td>
                    <td className="px-3 py-2 tabular-nums">{pr ? fmt(pr.premium) : '—'}</td>
                    <td className="px-3 py-2 tabular-nums">{pr ? `${pr.effectiveDiscountPct.toFixed(1)}%` : '—'}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    );
  }

  function renderTabContent() {
    switch (tab) {
      case 'Rate Build-Up': return renderRateBuildUp();
      case 'Gross-up & Floor': return renderGrossupFloor();
      case 'Rate Grid': return renderRateGrid();
      case 'Riders': return renderRiders();
      case 'Model Factor': return renderModelFactor();
      case 'Per-Plan Allocation': return renderPerPlanAllocation();
      default: return null;
    }
  }

  return (
    <div className="flex flex-col gap-6 p-6 max-w-[1200px] mx-auto">
      {/* P-HEADER */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-xl font-bold tracking-tight">Commercial Rate Card</h1>
          <div className="flex items-center gap-2 mt-1 flex-wrap">
            <p className="text-sm text-muted-foreground">
              {bundle.employerName} · {activeVersion?.name ?? 'Active version'}
            </p>
            <span className={cn(
              'text-[10px] font-medium rounded-full px-2 py-0.5 border',
              priceRun
                ? 'bg-green-50 border-green-200 text-green-700'
                : 'bg-amber-50 border-amber-200 text-amber-700'
            )}>
              {priceRun ? 'Live actuary run' : 'Illustrative — not yet priced'}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button size="sm" variant="outline" disabled={!canPriceAction || pricingLoading} onClick={handlePriceWithActuary}>
            {pricingLoading
              ? <><Loader2 className="size-4 mr-1.5 animate-spin" /> Pricing…</>
              : <><Zap className="size-4 mr-1.5" /> Price with actuary</>}
          </Button>
          <Button size="sm" variant="outline" onClick={handleExport}>
            <Download className="size-4 mr-1.5" /> Export macro
          </Button>
        </div>
      </div>

      {/* P-BANNER — Allocated card notice */}
      {bundle.finalRateCard && (
        <div className="rounded-xl border border-blue-200 bg-blue-50 px-5 py-4">
          <div className="flex items-start gap-3">
            <Info className="size-4 text-blue-600 mt-0.5 shrink-0" />
            <div className="text-xs space-y-1">
              <p className="font-semibold text-blue-900">Allocated Rate Card: {bundle.finalRateCard.ref}</p>
              <div className="flex flex-wrap gap-4 text-blue-700">
                <span>{bundle.finalRateCard.insurer}</span>
                <span>Gross-up {bundle.finalRateCard.grossUpFactor}×</span>
                <span>GST {bundle.finalRateCard.gstPct}%</span>
                <span>{bundle.finalRateCard.blendedRatePermille}‰ blended</span>
                <span>{bundle.finalRateCard.scheduleCellCount} schedule cells</span>
                <span>Allocated {new Date(bundle.finalRateCard.allocatedAt).toLocaleDateString('en-IN')}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* P-DETAIL — Card provenance */}
      <div className="rounded-xl border border-border bg-card px-5 py-4">
        <h2 className="text-sm font-semibold mb-3">
          {bundle.finalRateCard ? 'Allocated Card' : 'Filed Standard Card'}
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
          <div>
            <span className="text-muted-foreground block mb-0.5">Ref</span>
            <span className="font-mono font-medium">{rateCard.ref}</span>
          </div>
          <div>
            <span className="text-muted-foreground block mb-0.5">Insurer</span>
            <span className="font-medium">{rateCard.insurer}</span>
          </div>
          <div>
            <span className="text-muted-foreground block mb-0.5">Effective Window</span>
            <span className="font-medium">{rateCard.effectiveFrom} → {rateCard.effectiveTo}</span>
          </div>
          <div>
            <span className="text-muted-foreground block mb-0.5">Rate Basis</span>
            <span className="font-medium">Annual per-mille of Sum Assured</span>
          </div>
        </div>
      </div>

      {/* P-KPI — Version roll-up */}
      {priceRun && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <KpiCard label="Technical Premium" value={fmt(priceRun.technicalPremium)} />
          <KpiCard label="Break-even Floor" value={fmt(priceRun.breakEvenFloor)} />
          <KpiCard label="Negotiated Premium" value={fmt(priceRun.negotiatedPremium)} />
          <KpiCard label="Model Factor" value={priceRun.modelFactor.toFixed(3)} sub={priceRun.feasible ? '✓ Feasible' : '✗ Not feasible'} />
          <KpiCard label="Final (incl. GST)" value={fmt(priceRun.finalPremiumInclGst)} />
          <KpiCard label="Per-Life Premium" value={fmt(priceRun.perLifePremium)} sub={`${priceRun.lives.toLocaleString()} lives`} />
          <KpiCard label="Gross-up Factor" value={`${rateCard.grossUpFactor}×`} sub={`${rateCard.gstPct}% GST`} />
          <KpiCard label="Blended Rate" value={`${rateCard.blendedRatePermille}‰`} sub="per annum of SA" />
        </div>
      )}

      {/* P-EDITOR — Discount what-if lever */}
      <div className="rounded-xl border border-border bg-card px-5 py-5 space-y-4">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <h2 className="text-sm font-semibold">Discount What-if Lever</h2>
          <span className="text-[10px] text-amber-700 bg-amber-50 border border-amber-200 rounded-full px-2 py-0.5">
            What-if tool — figures not governed
          </span>
        </div>
        <div className="flex items-center gap-4">
          <input
            type="range"
            min={0.80}
            max={1.00}
            step={0.01}
            value={lever}
            disabled={!isSales}
            className="flex-1 accent-primary disabled:opacity-50"
            onChange={(e) => setLever(Number(e.target.value))}
          />
          <span className="font-mono text-sm shrink-0 w-28 text-right">
            {lever.toFixed(2)} ({discountPct}% disc.)
          </span>
        </div>

        {priceRun && (
          <div className="grid grid-cols-3 gap-3 text-xs">
            <div className="rounded-lg border border-border p-3">
              <div className="text-muted-foreground mb-1">Adjusted Final (incl. GST)</div>
              <div className="font-bold tabular-nums">{fmt(scaledFinal)}</div>
            </div>
            <div className="rounded-lg border border-border p-3">
              <div className="text-muted-foreground mb-1">vs. Technical Premium</div>
              <div className={cn('font-bold tabular-nums', scaledFinal < priceRun.technicalPremium ? 'text-amber-600' : '')}>
                {priceRun.technicalPremium > 0
                  ? `${((scaledFinal / priceRun.technicalPremium - 1) * 100).toFixed(1)}%`
                  : '—'}
              </div>
            </div>
            <div className="rounded-lg border border-border p-3">
              <div className="text-muted-foreground mb-1">Per-Life (adj.)</div>
              <div className="font-bold tabular-nums">
                {priceRun.lives > 0 ? fmt(scaledFinal / priceRun.lives) : '—'}
              </div>
            </div>
          </div>
        )}

        {/* Appetite envelope */}
        {appetite && (
          <div className="rounded-lg bg-muted/30 border border-border px-4 py-3 space-y-2">
            <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              Appetite Envelope
            </div>
            <div className="grid grid-cols-3 gap-3 text-xs">
              <div>
                <span className="text-muted-foreground block mb-0.5">Category</span>
                {appetite.category}
              </div>
              <div>
                <span className="text-muted-foreground block mb-0.5">Pre-approved Buffer</span>
                {appetite.maxDiscountPct}%
              </div>
              <div>
                <span className="text-muted-foreground block mb-0.5">UW Authority Band</span>
                {appetite.uwAuthorityBand}
              </div>
            </div>
            {isWithinAuthority ? (
              <div className="flex items-center gap-1.5 text-xs text-green-700">
                <CheckCircle2 className="size-3.5 shrink-0" /> Within sales authority
              </div>
            ) : (
              <div className="flex items-center gap-1.5 text-xs text-destructive">
                <AlertTriangle className="size-3.5 shrink-0" />
                Beyond buffer by {overByPct.toFixed(1)}% — escalation required
              </div>
            )}
          </div>
        )}

        {/* Floor warning */}
        {belowFloor && priceRun && (
          <div className="flex items-start gap-2 rounded-lg bg-destructive/5 border border-destructive/20 px-4 py-3 text-xs text-destructive">
            <AlertTriangle className="size-4 shrink-0 mt-0.5" />
            Below break-even floor ({fmt(priceRun.breakEvenFloor)}) — requires actuary sign-off
          </div>
        )}

        {/* Override section — only for SALES when beyond buffer */}
        {isSales && appetite && !isWithinAuthority && (
          <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 space-y-2">
            <div className="text-xs font-semibold text-amber-800">Supervisor Override</div>
            {pendingOverride ? (
              <p className="text-xs text-amber-700">
                Override request pending with supervisor ({pendingOverride.askedPct}%)
              </p>
            ) : approvedOverride ? (
              <div className="flex items-center gap-1.5 text-xs text-green-700">
                <Shield className="size-3.5 shrink-0" />
                Override approved up to {approvedOverride.askedPct}% by {approvedOverride.decidedBy}
              </div>
            ) : rejectedOverride ? (
              <div className="space-y-2">
                <p className="text-xs text-destructive">{rejectedOverride.decisionNote ?? 'Request rejected'}</p>
                <Button
                  size="sm" variant="outline" className="text-xs"
                  onClick={() => raise({
                    kind: EscalationKind.EXTRA_DISCOUNT,
                    rfqId,
                    versionId: activeVersionId,
                    subject: `Discount override — ${discountPct}%`,
                    askedPct: discountPct,
                    bufferPct: appetite.maxDiscountPct,
                    requestedBy: userName,
                    requestedAt: new Date().toISOString(),
                  })}
                >
                  Request again
                </Button>
              </div>
            ) : (
              <Button
                size="sm" variant="outline"
                className="text-xs border-amber-300 text-amber-800 hover:bg-amber-100"
                onClick={() => raise({
                  kind: EscalationKind.EXTRA_DISCOUNT,
                  rfqId,
                  versionId: activeVersionId,
                  subject: `Discount override — ${discountPct}%`,
                  askedPct: discountPct,
                  bufferPct: appetite.maxDiscountPct,
                  requestedBy: userName,
                  requestedAt: new Date().toISOString(),
                })}
              >
                Request supervisor override for {discountPct}%
              </Button>
            )}
          </div>
        )}
      </div>

      {/* P-LIST — Clause carve-outs */}
      <div className="rounded-xl border border-border bg-card">
        <div className="px-5 py-4 border-b border-border/50">
          <h2 className="text-sm font-semibold">Clause Carve-outs</h2>
          <p className="text-xs text-muted-foreground mt-0.5">Exclusions grouped by plan for the active version</p>
        </div>
        {activePlans.length === 0 ? (
          <p className="px-5 py-8 text-sm text-muted-foreground italic text-center">No plans in active version.</p>
        ) : (
          <div className="divide-y divide-border/50">
            {activePlans.map((plan) => {
              const openTask = getTaskForPlan(plan.planId, HandoffKind.ACTUARY);
              return (
                <div key={plan.planId} className="px-5 py-4">
                  <div className="flex items-center justify-between mb-3 gap-2 flex-wrap">
                    <p className="text-xs font-semibold">{plan.name}</p>
                    <div className="flex items-center gap-2 flex-wrap">
                      {isActuarial && (
                        <Button
                          size="sm" variant="outline" className="text-[10px] h-6 px-2"
                          onClick={() => setAddingClauseForPlanId(
                            addingClauseForPlanId === plan.planId ? null : plan.planId
                          )}
                        >
                          {addingClauseForPlanId === plan.planId ? 'Cancel' : 'Add exclusion'}
                        </Button>
                      )}
                      {!isActuarial && isSales && !openTask && (
                        <Button
                          size="sm" variant="ghost"
                          className="text-[10px] h-6 px-2 text-violet-700 hover:text-violet-800"
                          onClick={() => handleRequestCarveOut(plan)}
                        >
                          Request clause carve-out
                        </Button>
                      )}
                      {!isActuarial && isSales && openTask && (
                        <span className="text-[10px] text-amber-700 bg-amber-50 border border-amber-200 rounded-full px-2 py-0.5">
                          Request open — {openTask.status}
                        </span>
                      )}
                    </div>
                  </div>
                  {plan.excludedClauses.length === 0 && addingClauseForPlanId !== plan.planId && (
                    <p className="text-[11px] text-muted-foreground italic">No exclusions applied.</p>
                  )}
                  {plan.excludedClauses.map((clause) => (
                    <div
                      key={clause.code}
                      className="flex items-start justify-between gap-3 text-xs py-1.5 border-b border-border/30 last:border-0"
                    >
                      <div>
                        <span className="font-mono font-medium">{clause.code}</span>
                        <span className="ml-2">{clause.label}</span>
                        <span className="ml-2 text-muted-foreground">by {clause.byDesk}</span>
                        {clause.reason && (
                          <p className="text-[10px] text-muted-foreground mt-0.5">{clause.reason}</p>
                        )}
                      </div>
                      {isActuarial && (
                        <Button
                          size="sm" variant="ghost"
                          className="text-[10px] h-5 px-1.5 shrink-0 text-destructive hover:text-destructive"
                          onClick={() => handleRemoveClause(plan, clause.code)}
                        >
                          Remove
                        </Button>
                      )}
                    </div>
                  ))}
                  {addingClauseForPlanId === plan.planId && (
                    <div className="mt-3 p-3 rounded-lg border border-dashed border-border space-y-2">
                      <div className="grid grid-cols-3 gap-2">
                        <input
                          className="text-xs border border-border rounded-md px-2 py-1.5 bg-background"
                          placeholder="Code (e.g. EXC-001)"
                          value={newClause.code}
                          onChange={(e) => setNewClause((s) => ({ ...s, code: e.target.value }))}
                        />
                        <input
                          className="text-xs border border-border rounded-md px-2 py-1.5 bg-background col-span-2"
                          placeholder="Label"
                          value={newClause.label}
                          onChange={(e) => setNewClause((s) => ({ ...s, label: e.target.value }))}
                        />
                      </div>
                      <input
                        className="w-full text-xs border border-border rounded-md px-2 py-1.5 bg-background"
                        placeholder="Reason"
                        value={newClause.reason}
                        onChange={(e) => setNewClause((s) => ({ ...s, reason: e.target.value }))}
                      />
                      <Button
                        size="sm" className="text-xs"
                        disabled={!newClause.code || !newClause.label}
                        onClick={() => handleAddClause(plan)}
                      >
                        Add exclusion
                      </Button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* P-TABS — 6-tab section */}
      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <div className="flex border-b border-border overflow-x-auto">
          {TABS.map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={cn(
                'px-4 py-3 text-xs font-medium whitespace-nowrap transition-colors',
                tab === t
                  ? 'border-b-2 border-primary text-primary'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              {t}
            </button>
          ))}
        </div>
        <div className="p-5">{renderTabContent()}</div>
      </div>
    </div>
  );
}

