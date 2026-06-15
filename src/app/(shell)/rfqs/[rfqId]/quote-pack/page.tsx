'use client';

import { useRouter } from 'next/navigation';
import { Lock, ArrowRight, AlertTriangle, CheckCircle2, XCircle, FileCheck } from 'lucide-react';
import { useRfqBundle } from '@/context/RfqBundleContext';
import { computeFreezeState, computeReadinessGates } from '@/lib/computations';
import { DocumentStatus, GateStatus, PlanHandoffStatus, type Plan } from '@/lib/types';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function SectionHeading({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground border-b border-border/40 pb-1.5 mb-3">
      {children}
    </h2>
  );
}

function DetailRow({ label, value }: { label: string; value?: string | number | null }) {
  return (
    <div className="flex items-start justify-between gap-4 py-1.5 border-b border-border/20 last:border-0">
      <span className="text-xs text-muted-foreground whitespace-nowrap">{label}</span>
      <span className="text-xs font-medium text-right">{value ?? '—'}</span>
    </div>
  );
}

function Card({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={cn('rounded-xl border border-border bg-card px-5 py-4', className)}>
      {children}
    </div>
  );
}

const UW_STATUS_LABELS: Record<string, string> = {
  [PlanHandoffStatus.DRAFT]: 'Draft',
  [PlanHandoffStatus.PRICING_REQUESTED]: 'Pricing requested',
  [PlanHandoffStatus.UW_REFERRED]: 'Referred to UW',
  [PlanHandoffStatus.PRICED]: 'Priced',
  [PlanHandoffStatus.RETURNED]: 'Returned',
};

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function QuotePackPage() {
  const router = useRouter();
  const { bundle } = useRfqBundle();

  if (!bundle) return null;

  const { isFrozen, frozenVersion } = computeFreezeState(bundle);

  if (!isFrozen || !frozenVersion) {
    return (
      <div className="p-8 max-w-lg mx-auto">
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-6 py-5 space-y-3">
          <div className="flex items-center gap-2 text-amber-800 font-semibold">
            <Lock className="size-4" /> Freeze required
          </div>
          <p className="text-sm text-amber-700">
            Freeze the broker-aligned version to generate the Quote Pack.
          </p>
          <Button
            variant="outline" size="sm"
            className="border-amber-300 text-amber-800 hover:bg-amber-100"
            onClick={() => router.push(`/rfqs/${bundle.rfqId}/versions`)}
          >
            Go to Versions <ArrowRight className="size-3.5 ml-1" />
          </Button>
        </div>
      </div>
    );
  }

  const rfqId = bundle.rfqId;
  const readinessReport = computeReadinessGates(bundle);
  const pricingForVersion = bundle.actuaryPricing.byVersion[frozenVersion.id];
  const activePlans = bundle.plans.filter((p) => p.quoteVersionId === bundle.activeVersionId);
  const signedDocs = bundle.documents.filter((d) => d.status === DocumentStatus.SIGNED);
  const fclOverride = bundle.fclPolicy.byVersion[frozenVersion.id] ?? bundle.fclPolicy.quoteDefault;

  const totalLives = bundle.members.length > 0
    ? bundle.members.length
    : bundle.censusSummary?.totalLives ?? 0;
  const gradeCount = bundle.headcountData?.grades.length ?? 0;
  const totalSI = bundle.members.reduce((sum, m) => sum + m.sumAssured, 0);
  const avgSA = totalLives > 0 ? Math.round(totalSI / totalLives) : 0;

  const openUwPlans = activePlans.filter((p) => p.handoffStatus === PlanHandoffStatus.UW_REFERRED);
  const allExcludedClauses = activePlans.flatMap((p) =>
    p.excludedClauses.map((c) => ({ ...c, planName: p.name }))
  );

  return (
    <div className="flex flex-col gap-6 p-6 max-w-[920px] mx-auto">
      {/* ─── Pack Header ─────────────────────────────────────────────────── */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="text-xs font-medium text-muted-foreground mb-0.5">QUOTE PACK</div>
          <h1 className="text-2xl font-bold tracking-tight">{bundle.employerName}</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {rfqId} · {frozenVersion.name} · {bundle.lob}
          </p>
        </div>
        <Button
          disabled={!readinessReport.issuanceReady}
          onClick={() => router.push(`/rfqs/${rfqId}/issuance`)}
        >
          Proceed to issuance <ArrowRight className="size-4 ml-1.5" />
        </Button>
      </div>

      {/* Blocker notice */}
      {!readinessReport.issuanceReady && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 flex items-center gap-3">
          <AlertTriangle className="size-4 text-amber-600 shrink-0" />
          <span className="text-sm text-amber-800">
            {readinessReport.failingCount} readiness gate{readinessReport.failingCount !== 1 ? 's' : ''} failing —{' '}
            <button
              className="underline font-medium"
              onClick={() => router.push(`/rfqs/${rfqId}/workspace`)}
            >
              view checklist
            </button>
          </span>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* ─── Pack Header Details ─────────────────────────────────────── */}
        <Card>
          <SectionHeading>Quote Details</SectionHeading>
          <DetailRow label="RFQ ID" value={rfqId} />
          <DetailRow label="Employer" value={bundle.employerName} />
          <DetailRow label="Frozen version" value={frozenVersion.name} />
          <DetailRow label="Effective date" value={bundle.effectiveDate} />
          <DetailRow label="Segment" value={bundle.quoteSegment} />
          <DetailRow label="Line of business" value={bundle.lob} />
          <DetailRow label="Business type" value={bundle.businessType} />
          <DetailRow label="Broker" value={bundle.brokerName} />
        </Card>

        {/* ─── Member Summary ───────────────────────────────────────────── */}
        <Card>
          <SectionHeading>Member Summary</SectionHeading>
          <DetailRow label="Total lives" value={totalLives.toLocaleString('en-IN')} />
          <DetailRow label="Grade count" value={gradeCount} />
          <DetailRow label="Average sum assured" value={`₹${avgSA.toLocaleString('en-IN')}`} />
          <DetailRow label="Total sum insured" value={`₹${totalSI.toLocaleString('en-IN')}`} />
        </Card>

        {/* ─── Coverage Summary ─────────────────────────────────────────── */}
        <Card className="md:col-span-2">
          <SectionHeading>Coverage Summary</SectionHeading>
          {activePlans.length === 0 ? (
            <p className="text-xs text-muted-foreground italic">No plans defined for active version.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-border/50">
                    {['Plan', 'Product', 'SA Basis', 'Cover Pattern', 'Key Benefits', 'Priced Premium'].map((h) => (
                      <th key={h} className="text-left px-3 py-2 font-medium text-muted-foreground">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {activePlans.map((plan: Plan) => {
                    const planPrice = pricingForVersion?.byPlan?.[plan.planId];
                    return (
                      <tr key={plan.planId} className="border-b border-border/30 last:border-0 hover:bg-muted/20">
                        <td className="px-3 py-2.5 font-medium">{plan.name}</td>
                        <td className="px-3 py-2.5 text-muted-foreground">{plan.productCode ?? '—'}</td>
                        <td className="px-3 py-2.5">{plan.sumAssuredBasis}</td>
                        <td className="px-3 py-2.5">{plan.coverPattern}</td>
                        <td className="px-3 py-2.5 max-w-[160px]">
                          {plan.benefits.length > 0
                            ? plan.benefits.slice(0, 3).join(', ')
                            : '—'}
                        </td>
                        <td className="px-3 py-2.5 font-medium">
                          {planPrice ? `₹${planPrice.premium.toLocaleString('en-IN')}` : '—'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </Card>

        {/* ─── Commercial Terms ─────────────────────────────────────────── */}
        <Card>
          <SectionHeading>Commercial Terms</SectionHeading>
          {pricingForVersion ? (
            <>
              <DetailRow label="Final premium (incl. GST)" value={`₹${pricingForVersion.finalPremiumInclGst.toLocaleString('en-IN')}`} />
              <DetailRow label="Per-life premium" value={`₹${pricingForVersion.perLifePremium.toLocaleString('en-IN')}`} />
              <DetailRow label="Model factor" value={pricingForVersion.modelFactor.toFixed(2)} />
              <DetailRow label="Break-even floor" value={`₹${pricingForVersion.breakEvenFloor.toLocaleString('en-IN')}`} />
              <DetailRow label="Technical premium" value={`₹${pricingForVersion.technicalPremium.toLocaleString('en-IN')}`} />
            </>
          ) : (
            <p className="text-xs text-muted-foreground italic">No pricing for this version.</p>
          )}
        </Card>

        {/* ─── Rate Card ────────────────────────────────────────────────── */}
        <Card>
          <SectionHeading>Rate Card</SectionHeading>
          {bundle.finalRateCard ? (
            <>
              <DetailRow label="Ref" value={bundle.finalRateCard.ref} />
              <DetailRow label="Insurer" value={bundle.finalRateCard.insurer} />
              <DetailRow label="Blended rate (‰)" value={bundle.finalRateCard.blendedRatePermille.toFixed(3)} />
              <DetailRow label="Gross-up factor" value={bundle.finalRateCard.grossUpFactor.toFixed(4)} />
              <DetailRow label="GST %" value={`${bundle.finalRateCard.gstPct}%`} />
            </>
          ) : (
            <p className="text-xs text-muted-foreground italic">Filed card ref — no final rate card allocated.</p>
          )}
        </Card>

        {/* ─── Reinsurance ──────────────────────────────────────────────── */}
        <Card>
          <SectionHeading>Reinsurance (FCL)</SectionHeading>
          <DetailRow label="Quote default FCL" value={bundle.fclPolicy.quoteDefault} />
          <DetailRow label="This version FCL" value={fclOverride} />
          {bundle.policyDetails?.reinsuranceMethod && (
            <DetailRow label="RI method" value={bundle.policyDetails.reinsuranceMethod.replace(/_/g, ' ')} />
          )}
        </Card>

        {/* ─── UW Decisions ─────────────────────────────────────────────── */}
        <Card>
          <SectionHeading>UW Decisions</SectionHeading>
          {openUwPlans.length === 0 ? (
            <div className="flex items-center gap-2 text-xs text-green-700">
              <CheckCircle2 className="size-3.5" /> No open UW decisions
            </div>
          ) : (
            <div className="space-y-2">
              {openUwPlans.map((p) => (
                <div key={p.planId} className="flex items-center gap-2 text-xs text-amber-700">
                  <AlertTriangle className="size-3.5 shrink-0" />
                  <span>{p.name} — {UW_STATUS_LABELS[p.handoffStatus]}</span>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* ─── Clause Exclusions ────────────────────────────────────────── */}
        <Card className="md:col-span-2">
          <SectionHeading>Clause Exclusions</SectionHeading>
          {allExcludedClauses.length === 0 ? (
            <p className="text-xs text-muted-foreground italic">No clause carve-outs on this quote.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-border/50">
                    {['Plan', 'Code', 'Label', 'By Desk', 'Reason'].map((h) => (
                      <th key={h} className="text-left px-3 py-2 font-medium text-muted-foreground">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {allExcludedClauses.map((c, i) => (
                    <tr key={i} className="border-b border-border/30 last:border-0 hover:bg-muted/20">
                      <td className="px-3 py-2">{c.planName}</td>
                      <td className="px-3 py-2 font-mono">{c.code}</td>
                      <td className="px-3 py-2">{c.label}</td>
                      <td className="px-3 py-2 text-muted-foreground">{c.byDesk}</td>
                      <td className="px-3 py-2 text-muted-foreground">{c.reason}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>

        {/* ─── Signed Acceptance ────────────────────────────────────────── */}
        <Card className="md:col-span-2">
          <SectionHeading>Signed Acceptance</SectionHeading>
          {signedDocs.length === 0 ? (
            <div className="flex items-center gap-2 text-xs text-amber-700">
              <AlertTriangle className="size-3.5 shrink-0" />
              No signed documents on file — attach a signed proposal or acceptance letter before issuance.
              <button
                className="underline font-medium ml-1"
                onClick={() => router.push(`/rfqs/${rfqId}/documents/new`)}
              >
                Add document
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              {signedDocs.map((d) => (
                <div key={d.documentId} className="flex items-center gap-3 text-xs">
                  <FileCheck className="size-3.5 text-green-600 shrink-0" />
                  <span className="font-medium">{d.name}</span>
                  <span className="text-muted-foreground">{d.type}</span>
                  <span className="text-muted-foreground">{new Date(d.uploadedAt).toLocaleDateString('en-IN')}</span>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* ─── Readiness Summary ───────────────────────────────────────── */}
        <Card className="md:col-span-2">
          <SectionHeading>Issuance Readiness</SectionHeading>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
            {readinessReport.buckets.map((b) => (
              <div
                key={b.bucketNo}
                className={cn(
                  'rounded-lg border px-3 py-2.5 flex items-start gap-2',
                  b.overall === GateStatus.PASS && 'bg-green-50 border-green-200',
                  b.overall === GateStatus.WARN && 'bg-amber-50 border-amber-200',
                  b.overall === GateStatus.FAIL && 'bg-red-50 border-red-200',
                )}
              >
                {b.overall === GateStatus.PASS
                  ? <CheckCircle2 className="size-3.5 text-green-600 shrink-0 mt-0.5" />
                  : b.overall === GateStatus.WARN
                  ? <AlertTriangle className="size-3.5 text-amber-600 shrink-0 mt-0.5" />
                  : <XCircle className="size-3.5 text-red-600 shrink-0 mt-0.5" />}
                <span className="text-[11px] font-medium leading-tight">{b.label}</span>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}
