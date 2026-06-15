'use client';

import { AlertTriangle, CheckCircle2, XCircle, Info } from 'lucide-react';
import { useRfqBundle } from '@/context/RfqBundleContext';
import { CensusQuality, PlanHandoffStatus } from '@/lib/types';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function SectionHeading({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3 border-b border-border/40 pb-1.5">
      {children}
    </h2>
  );
}

function DetailRow({ label, value }: { label: string; value: string | undefined | null }) {
  return (
    <div className="flex justify-between py-1.5 border-b border-border/20 last:border-0 text-sm">
      <span className="text-xs text-muted-foreground w-40 shrink-0">{label}</span>
      <span className="text-xs font-medium text-right">{value || '—'}</span>
    </div>
  );
}

function QualityChip({ q }: { q: CensusQuality }) {
  if (q === CensusQuality.G) return (
    <span className="inline-flex items-center gap-1 text-[10px] font-medium text-green-700 bg-green-50 border border-green-200 rounded-full px-2 py-0.5">
      <CheckCircle2 className="size-3" /> Good
    </span>
  );
  if (q === CensusQuality.A) return (
    <span className="inline-flex items-center gap-1 text-[10px] font-medium text-amber-700 bg-amber-50 border border-amber-200 rounded-full px-2 py-0.5">
      <AlertTriangle className="size-3" /> Average
    </span>
  );
  return (
    <span className="inline-flex items-center gap-1 text-[10px] font-medium text-destructive bg-destructive/5 border border-destructive/20 rounded-full px-2 py-0.5">
      <XCircle className="size-3" /> Poor
    </span>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ProfilePage() {
  const { bundle } = useRfqBundle();
  if (!bundle) return null;

  const plans = bundle.plans;
  const exp = bundle.claimsExperience;
  const grades = new Set(bundle.members.map((m) => m.grade));
  const pricedVersions = Object.keys(bundle.actuaryPricing.byVersion);
  const totalSA = plans.reduce((s, p) => {
    const byPlan = Object.values(bundle.actuaryPricing.byVersion)
      .flatMap((v) => Object.values(v.byPlan))
      .find((bp) => bp.planId === p.planId);
    return s + (byPlan?.premium ?? 0);
  }, 0);
  const latestLR = exp?.years?.length
    ? exp.years[exp.years.length - 1].lossRatio
    : null;

  return (
    <div className="max-w-2xl mx-auto px-6 py-5 flex flex-col gap-6">
      <div>
        <h1 className="text-base font-semibold">Deal Profile</h1>
        <p className="text-xs text-muted-foreground mt-0.5">Step 8 of 21 · Read-only risk cockpit</p>
      </div>

      {/* ── MPH Profile ───────────────────────────────────────────────────── */}
      <div className="rounded-xl border border-border bg-card px-4 py-4">
        <SectionHeading>MPH Profile</SectionHeading>
        <DetailRow label="Employer" value={bundle.employerName} />
        <DetailRow label="Industry" value={bundle.industry} />
        <DetailRow label="Quote segment" value={bundle.quoteSegment} />
        <DetailRow label="MP category" value={bundle.mphAppetite?.category} />
        <DetailRow label="Employee count" value={bundle.censusSummary?.totalLives?.toString()} />
        <DetailRow label="Scheme type" value={bundle.schemeType} />
        <DetailRow label="Scheme usage" value={bundle.schemeUsage} />
      </div>

      {/* ── Appetite Envelope ─────────────────────────────────────────────── */}
      <div className="rounded-xl border border-border bg-card px-4 py-4">
        <SectionHeading>Appetite Envelope</SectionHeading>
        {bundle.mphAppetite ? (
          <>
            <DetailRow label="Category" value={bundle.mphAppetite.category} />
            <DetailRow label="Pre-approved buffer" value={`${bundle.mphAppetite.maxDiscountPct}%`} />
            <DetailRow label="UW authority band" value={bundle.mphAppetite.uwAuthorityBand} />
          </>
        ) : (
          <div className="flex items-start gap-2 rounded-lg bg-amber-50 border border-amber-200 px-3 py-2.5 text-amber-800 text-xs">
            <AlertTriangle className="size-3.5 shrink-0 mt-0.5" />
            No appetite profiled — every pricing ask will require escalation.
          </div>
        )}
      </div>

      {/* ── Census Summary ────────────────────────────────────────────────── */}
      <div className="rounded-xl border border-border bg-card px-4 py-4">
        <SectionHeading>Census Summary</SectionHeading>
        {bundle.censusSummary ? (
          <>
            <div className="flex justify-between py-1.5 border-b border-border/20 text-sm">
              <span className="text-xs text-muted-foreground w-40 shrink-0">Quality</span>
              <QualityChip q={bundle.censusSummary.quality.trafficLight} />
            </div>
            <DetailRow label="Total lives" value={bundle.censusSummary.totalLives.toLocaleString()} />
            <DetailRow label="Grade count" value={grades.size > 0 ? grades.size.toString() : '—'} />
            <DetailRow label="Roster loaded" value={bundle.members.length > 0 ? `${bundle.members.length} members` : 'Aggregate only'} />
          </>
        ) : (
          <div className="flex items-start gap-2 rounded-lg bg-muted/30 border border-border px-3 py-2.5 text-muted-foreground text-xs">
            <Info className="size-3.5 shrink-0 mt-0.5" />
            Census not yet loaded.
          </div>
        )}
      </div>

      {/* ── Claims Summary ────────────────────────────────────────────────── */}
      <div className="rounded-xl border border-border bg-card px-4 py-4">
        <SectionHeading>Claims Summary</SectionHeading>
        {exp ? (
          <>
            <DetailRow label="Years of data" value={exp.years.length.toString()} />
            <DetailRow label="Latest loss ratio" value={latestLR !== null ? `${(latestLR * 100).toFixed(1)}%` : '—'} />
            <DetailRow label="Large losses" value={exp.largeLosses.length.toString()} />
            <DetailRow label="Data source" value={bundle.businessType === 'RENEWAL' || bundle.businessType === 'TAKEOVER' ? 'Prior insurer' : 'Not applicable'} />
          </>
        ) : (
          <div className="flex items-start gap-2 rounded-lg bg-muted/30 border border-border px-3 py-2.5 text-muted-foreground text-xs">
            <Info className="size-3.5 shrink-0 mt-0.5" />
            No claims experience data entered.
          </div>
        )}
      </div>

      {/* ── Plan Summary ──────────────────────────────────────────────────── */}
      <div className="rounded-xl border border-border bg-card px-4 py-4">
        <SectionHeading>Plan Summary</SectionHeading>
        {plans.length > 0 ? (
          <>
            <DetailRow label="Plan count" value={plans.length.toString()} />
            <DetailRow
              label="Product codes"
              value={[...new Set(plans.map((p) => p.productCode ?? '—'))].join(', ')}
            />
            <DetailRow
              label="Total premium (GST incl.)"
              value={totalSA > 0 ? `₹${totalSA.toLocaleString()}` : '—'}
            />
            <DetailRow
              label="Pricing status"
              value={
                pricedVersions.length > 0
                  ? `${pricedVersions.length} version(s) priced`
                  : 'Not yet priced'
              }
            />
            <DetailRow
              label="UW status"
              value={
                plans.some((p) => p.handoffStatus === PlanHandoffStatus.UW_REFERRED)
                  ? 'Plans in UW review'
                  : plans.every((p) => p.handoffStatus === PlanHandoffStatus.PRICED)
                  ? 'All priced'
                  : 'In progress'
              }
            />
          </>
        ) : (
          <div className="flex items-start gap-2 rounded-lg bg-muted/30 border border-border px-3 py-2.5 text-muted-foreground text-xs">
            <Info className="size-3.5 shrink-0 mt-0.5" />
            No plans defined yet.
          </div>
        )}
      </div>
    </div>
  );
}

