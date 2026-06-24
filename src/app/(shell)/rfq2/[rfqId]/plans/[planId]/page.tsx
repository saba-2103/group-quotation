'use client';

import { Suspense } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  ChevronLeft,
  Pencil,
  Lock,
  Package,
  Layers,
  Users,
  ShieldCheck,
  CreditCard,
  GitMerge,
  Building2,
  CheckCircle2,
  Clock,
  AlertTriangle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { RfqBundleProvider, useRfqBundle } from '@/context/RfqBundleContext';
import { SumAssuredBasis, CoverPattern, PlanHandoffStatus, VersionStatus } from '@/lib/types';
import type { Plan } from '@/lib/types';
import { PRODUCT_CATALOG, RATE_CARDS } from '@/lib/constants';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmt(n: number | undefined, unit?: string): string {
  if (n === undefined || n === null) return '—';
  if (n >= 10_000_000) return `₹${(n / 10_000_000).toFixed(2)} Cr`;
  if (n >= 100_000)    return `₹${(n / 100_000).toFixed(2)} L`;
  return `₹${n.toLocaleString('en-IN')}${unit ? ' ' + unit : ''}`;
}

function SectionTitle({ icon: Icon, label }: { icon: React.ComponentType<{ className?: string }>; label: string }) {
  return (
    <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
      <Icon className="size-3.5" />
      {label}
    </div>
  );
}

function Row({ label, value, mono }: { label: string; value: React.ReactNode; mono?: boolean }) {
  return (
    <div className="flex items-start justify-between gap-4 py-2 border-b border-border/30 last:border-0">
      <span className="text-[11px] text-muted-foreground shrink-0 w-36">{label}</span>
      <span className={cn('text-xs text-right flex-1 leading-snug', mono && 'font-mono')}>{value ?? '—'}</span>
    </div>
  );
}

const HANDOFF_META: Record<PlanHandoffStatus, { label: string; cls: string; icon: React.ComponentType<{ className?: string }> }> = {
  [PlanHandoffStatus.DRAFT]:              { label: 'Draft',              cls: 'bg-zinc-100 text-zinc-600 border-zinc-200',     icon: Clock        },
  [PlanHandoffStatus.PRICING_REQUESTED]:  { label: 'Pricing Requested',  cls: 'bg-sky-50 text-sky-700 border-sky-200',         icon: Clock        },
  [PlanHandoffStatus.PRICING_RECEIVED]:   { label: 'Pricing Received',   cls: 'bg-emerald-50 text-emerald-700 border-emerald-200', icon: CheckCircle2 },
  [PlanHandoffStatus.UW_REFERRED]:        { label: 'UW Referred',        cls: 'bg-orange-50 text-orange-700 border-orange-200', icon: AlertTriangle },
  [PlanHandoffStatus.UW_APPROVED]:        { label: 'UW Approved',        cls: 'bg-emerald-50 text-emerald-700 border-emerald-200', icon: CheckCircle2 },
  [PlanHandoffStatus.UW_DECLINED]:        { label: 'UW Declined',        cls: 'bg-red-50 text-red-700 border-red-200',         icon: AlertTriangle },
};

// ─── Inner ────────────────────────────────────────────────────────────────────

function PlanDetailInner({ rfqId, planId }: { rfqId: string; planId: string }) {
  const router = useRouter();
  const { bundle } = useRfqBundle();

  if (!bundle) return null;

  const plan = bundle.plans.find((p: Plan) => p.planId === planId);

  if (!plan) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-3">
        <p className="text-sm font-semibold">Plan not found</p>
        <p className="text-xs text-muted-foreground">Plan ID: {planId}</p>
        <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => router.back()}>
          <ChevronLeft className="size-3 mr-1" />
          Back
        </Button>
      </div>
    );
  }

  const version     = bundle.quoteVersions.find((v) => v.id === plan.quoteVersionId);
  const isFrozen    = version?.status === VersionStatus.FROZEN;
  const product     = PRODUCT_CATALOG.find((p) => p.id === plan.productCode);
  const rateCard    = RATE_CARDS.find((c) => c.ref === plan.rateCardRef);
  const subsidiary  = (bundle.subsidiaries ?? []).find((s) => s.subsidiaryId === plan.subsidiaryScope);
  const handoff     = HANDOFF_META[plan.handoffStatus] ?? HANDOFF_META[PlanHandoffStatus.DRAFT];
  const HandoffIcon = handoff.icon;

  // Compute routed-SA display
  let saDisplay = '—';
  if (plan.sumAssuredBasis === SumAssuredBasis.FLAT) {
    saDisplay = fmt(plan.flatSi);
  } else if (plan.sumAssuredBasis === SumAssuredBasis.SALARY_MULTIPLE) {
    saDisplay = `${plan.salaryMultiple}× annual salary`;
  } else {
    saDisplay = 'By grade slab';
  }

  return (
    <div className="flex flex-col h-screen bg-background">
      {/* Header */}
      <div className="shrink-0 flex items-center gap-3 px-5 py-3 border-b border-border/40 bg-background">
        <button
          type="button"
          onClick={() => router.push(plan.quoteVersionId ? `/rfq2/${rfqId}/${plan.quoteVersionId}` : `/rfq2/${rfqId}`)}
          className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground"
        >
          <ChevronLeft className="size-4" />
        </button>

        <div className="flex-1">
          <p className="text-[10px] text-muted-foreground">{bundle.employerName}</p>
          <div className="flex items-center gap-2 mt-0.5">
            <p className="text-sm font-semibold">{plan.name}</p>
            <span className="text-[10px] font-mono text-muted-foreground">{plan.planNumber}</span>
            <span
              className={cn(
                'inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-medium',
                handoff.cls,
              )}
            >
              <HandoffIcon className="size-3" />
              {handoff.label}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {isFrozen ? (
            <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground bg-muted rounded-md px-2.5 py-1 border border-border/50">
              <Lock className="size-3" />
              Frozen
            </div>
          ) : (
            <Button
              size="sm"
              variant="outline"
              className="h-7 text-xs gap-1"
              onClick={() => router.push(`/rfq2/${rfqId}/plans/new?versionId=${plan.quoteVersionId}&planId=${planId}`)}
            >
              <Pencil className="size-3" />
              Edit
            </Button>
          )}
        </div>
      </div>

      {/* Completeness bar */}
      <div className="shrink-0 flex items-center gap-3 px-5 py-2 border-b border-border/30 bg-muted/10">
        <span className="text-[10px] text-muted-foreground w-24">Completeness</span>
        <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
          <div
            className={cn(
              'h-full rounded-full transition-all',
              (plan.completeness ?? 0) >= 80 ? 'bg-green-500' : (plan.completeness ?? 0) >= 40 ? 'bg-amber-400' : 'bg-red-400',
            )}
            style={{ width: `${plan.completeness ?? 0}%` }}
          />
        </div>
        <span
          className={cn(
            'text-xs font-medium w-10 text-right',
            (plan.completeness ?? 0) >= 80 ? 'text-green-600' : (plan.completeness ?? 0) >= 40 ? 'text-amber-600' : 'text-red-500',
          )}
        >
          {plan.completeness ?? 0}%
        </span>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-3xl mx-auto px-5 py-5 grid grid-cols-1 gap-6">

          {/* 1 — Identity */}
          <div className="rounded-xl border border-border bg-card px-5 py-4">
            <SectionTitle icon={Package} label="Product & Identity" />
            <Row label="Product code"  value={plan.productCode} mono />
            <Row label="Product name"  value={product?.name ?? '—'} />
            <Row label="Plan number"   value={plan.planNumber} mono />
            <Row label="Plan name"     value={plan.name} />
            <Row label="Effective from" value={plan.effectiveFrom ?? '—'} />
            <Row label="Effective to"  value={plan.effectiveTo   ?? '—'} />
            {subsidiary ? (
              <Row
                label="Subsidiary"
                value={
                  <span className="flex items-center gap-1.5 justify-end">
                    <Building2 className="size-3 text-muted-foreground" />
                    {subsidiary.name}
                    <span className="text-[10px] font-mono text-muted-foreground">({subsidiary.code})</span>
                  </span>
                }
              />
            ) : (
              <Row label="Subsidiary" value="Whole group" />
            )}
          </div>

          {/* 2 — Coverage */}
          <div className="rounded-xl border border-border bg-card px-5 py-4">
            <SectionTitle icon={Layers} label="Coverage & Benefits" />
            <Row label="Cover pattern"  value={plan.coverPattern} />
            <Row label="SA basis"       value={plan.sumAssuredBasis.replace(/_/g,' ')} />
            <Row label="Sum assured"    value={saDisplay} />
            <Row label="Benefits"
              value={
                plan.benefits?.length > 0
                  ? <span className="flex flex-wrap gap-1 justify-end">{plan.benefits.map((b) => (
                      <span key={b} className="text-[10px] bg-muted border border-border rounded-full px-2 py-0.5">{b}</span>
                    ))}</span>
                  : '—'
              }
            />
            {plan.excludedClauses?.length > 0 && (
              <Row label="Excluded clauses"
                value={
                  <span className="flex flex-wrap gap-1 justify-end">{plan.excludedClauses.map((ec) => (
                    <span key={ec.code} className="text-[10px] bg-red-50 border border-red-200 text-red-700 rounded-full px-2 py-0.5">{ec.code}</span>
                  ))}</span>
                }
              />
            )}
          </div>

          {/* 3 — Eligibility */}
          <div className="rounded-xl border border-border bg-card px-5 py-4">
            <SectionTitle icon={Users} label="Eligibility" />
            <Row label="Min entry age"   value={plan.minEntryAge  !== undefined ? `${plan.minEntryAge} yrs` : '—'} />
            <Row label="Max entry age"   value={plan.maxEntryAge  !== undefined ? `${plan.maxEntryAge} yrs` : '—'} />
            <Row label="Cessation age"   value={plan.cessationAge !== undefined ? `${plan.cessationAge} yrs` : '—'} />
            <Row label="Lives covered"   value={plan.livesCovered?.replace(/_/g,' ') ?? '—'} />
            <Row label="Employment"
              value={
                plan.allowedEmploymentTypes?.length
                  ? <span className="flex flex-wrap gap-1 justify-end">{plan.allowedEmploymentTypes.map((et) => (
                      <span key={et} className="text-[10px] bg-muted border border-border rounded-full px-2 py-0.5">{et}</span>
                    ))}</span>
                  : '—'
              }
            />
          </div>

          {/* 4 — UW & STP */}
          <div className="rounded-xl border border-border bg-card px-5 py-4">
            <SectionTitle icon={ShieldCheck} label="UW & STP" />
            <Row label="UW method"   value={plan.uwMethod     ?? '—'} />
            <Row label="FCL posture" value={plan.fclInherited ? 'Inherited' : (plan.fclPatternOverride?.replace(/_/g,' ') ?? '—')} />
            <Row label="Evidence pack" value={plan.evidencePack?.replace(/_/g,' ') ?? '—'} />
          </div>

          {/* 5 — Rate Card */}
          <div className="rounded-xl border border-border bg-card px-5 py-4">
            <SectionTitle icon={CreditCard} label="Rate Card" />
            {rateCard ? (
              <>
                <Row label="Card ref"     value={rateCard.ref} mono />
                <Row label="Card name"    value={rateCard.name} />
                <Row label="Insurer"      value={rateCard.insurer} />
                <Row label="Blended rate" value={`${rateCard.blendedRatePermille}‰`} />
                <Row label="Valid"        value={`${rateCard.effectiveFrom} → ${rateCard.effectiveTo}`} />
              </>
            ) : (
              <div className="text-xs text-muted-foreground py-2">
                {plan.rateCardRef ? `Card ref: ${plan.rateCardRef} (not found in catalog)` : 'No rate card bound'}
              </div>
            )}
          </div>

          {/* 6 — Deviations */}
          <div className="rounded-xl border border-border bg-card px-5 py-4">
            <SectionTitle icon={GitMerge} label="Deviations" />
            {plan.deviations?.length > 0 ? (
              <div className="flex flex-col divide-y divide-border/30">
                {plan.deviations.map((dev, i) => (
                  <div key={i} className="py-2.5 flex items-start justify-between gap-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="text-[10px] bg-muted text-muted-foreground rounded px-1.5 py-0.5">
                          {typeof dev.scope === 'string' ? dev.scope.replace(/_/g,' ') : dev.scope}
                        </span>
                        <span className="text-xs font-medium">{dev.what}</span>
                      </div>
                      <p className="text-[11px] text-muted-foreground">
                        {dev.baseline} → <span className="text-foreground">{dev.negotiated}</span>
                      </p>
                      {dev.reason && (
                        <p className="text-[11px] text-muted-foreground mt-0.5 italic">{dev.reason}</p>
                      )}
                    </div>
                    <span className={cn(
                      'text-[10px] rounded-full px-2 py-0.5 border shrink-0',
                      dev.status === 'APPROVED'
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                        : dev.status === 'DECLINED'
                        ? 'bg-red-50 text-red-700 border-red-200'
                        : 'bg-muted text-muted-foreground border-border',
                    )}>
                      {dev.status ?? 'Draft'}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground py-2">No deviations recorded.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

function PlanDetailPage() {
  const { rfqId, planId } = useParams<{ rfqId: string; planId: string }>();
  return (
    <RfqBundleProvider rfqId={rfqId}>
      <Suspense fallback={null}>
        <PlanDetailInner rfqId={rfqId} planId={planId} />
      </Suspense>
    </RfqBundleProvider>
  );
}

export default PlanDetailPage;
