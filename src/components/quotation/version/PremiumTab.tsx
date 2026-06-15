'use client';

/**
 * PremiumTab
 *
 * Calculates and displays the premium for a RATED version.
 * Shows total premium figure, itemised breakup table, and per-plan toggle.
 */

import { useState } from 'react';
import { AlertTriangle, Calculator, RefreshCw } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import type {
  PlanV2,
  PremiumBreakupItemV2,
  QuotePremiumV2,
  QuoteVersion,
} from '@/types/group-pas/quotation-v2';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

interface PremiumTabProps {
  version: QuoteVersion;
  premiumType: 'ANNUAL' | 'SINGLE';
  onPremiumCalculated: (premium: QuotePremiumV2) => void;
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function fmtINR(amount: number): string {
  return `₹${amount.toLocaleString('en-IN')}`;
}

function PremiumTypeChip({ type }: { type: string }) {
  const variant =
    type === 'BASE'
      ? ('info' as const)
      : type === 'RIDER'
      ? ('teal' as const)
      : type === 'LOADING'
      ? ('warning' as const)
      : ('secondary' as const); // DISCOUNT or other
  return (
    <Badge variant={variant} className="text-[10px] font-normal">
      {type}
    </Badge>
  );
}

function itemType(item: PremiumBreakupItemV2): 'BASE' | 'RIDER' | 'LOADING' | 'DISCOUNT' {
  if (item.loadingFactor && item.loadingFactor > 0) return 'LOADING';
  if (item.discountFactor && item.discountFactor < 0) return 'DISCOUNT';
  if (item.benefitCode) return 'RIDER';
  return 'BASE';
}

// ─────────────────────────────────────────────────────────────────────────────
// Mock premium calculation
// ─────────────────────────────────────────────────────────────────────────────

function buildMockPremium(plans: PlanV2[], headcount: number): QuotePremiumV2 {
  // Build one breakup item per plan product
  const breakup: PremiumBreakupItemV2[] = [];

  for (const plan of plans) {
    for (const product of plan.plan_definition.plan_product) {
      const baseRate = 0.025; // 2.5% of SI as mock
      // Use the plan's FCL as proxy for avg SI
      const fclAmt = plan.plan_definition.fcl.amount?.amount ?? 500_000;
      const rawPremium = Math.round(fclAmt * baseRate * headcount);
      breakup.push({
        productCode: product.productCode,
        productName: product.productName,
        premium: { amount: rawPremium, currency: 'INR' },
      });
    }
  }

  // Add a loading item (5% of gross)
  const grossAmount = breakup.reduce((s, b) => s + b.premium.amount, 0);
  const loadingAmount = Math.round(grossAmount * 0.05);
  if (loadingAmount > 0) {
    breakup.push({
      productCode: 'LOADING',
      productName: 'Hazard Loading (5%)',
      premium: { amount: loadingAmount, currency: 'INR' },
      loadingFactor: 0.05,
    });
  }

  const netAmount = grossAmount + loadingAmount;
  const gstAmount = Math.round(netAmount * 0.18);
  const totalAmount = netAmount + gstAmount;

  return {
    grossPremium: { amount: grossAmount, currency: 'INR' },
    netPremium: { amount: netAmount, currency: 'INR' },
    gst: { amount: gstAmount, currency: 'INR' },
    totalPremium: { amount: totalAmount, currency: 'INR' },
    breakup,
  };
}

/** Build per-plan premium breakdown (proportional split by headcount). */
function buildPerPlanPremium(
  premium: QuotePremiumV2,
  plans: PlanV2[],
  planBreakdown: Array<{ planId: string; headcount: number }>,
): Array<{ plan: PlanV2; breakup: PremiumBreakupItemV2[]; total: number }> {
  const totalHC = planBreakdown.reduce((s, p) => s + p.headcount, 0) || 1;

  return plans.map((plan) => {
    const ph = planBreakdown.find((p) => p.planId === plan.plan_id)?.headcount ?? 0;
    const ratio = ph / totalHC;
    const adjustedBreakup: PremiumBreakupItemV2[] = premium.breakup.map((item) => ({
      ...item,
      premium: {
        ...item.premium,
        amount: Math.round(item.premium.amount * ratio),
      },
    }));
    const planTotal = adjustedBreakup.reduce((s, b) => s + b.premium.amount, 0);
    return { plan, breakup: adjustedBreakup, total: planTotal };
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Sub-components
// ─────────────────────────────────────────────────────────────────────────────

function PremiumHero({
  premium,
  premiumType,
}: {
  premium: QuotePremiumV2;
  premiumType: 'ANNUAL' | 'SINGLE';
}) {
  const label = premiumType === 'ANNUAL' ? '/ year' : '(single)';
  return (
    <div className="rounded-xl border bg-gradient-to-br from-slate-50 to-white p-6">
      <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
        Total Premium (incl. GST)
      </p>
      <p className="mt-1 font-mono text-4xl font-bold tracking-tight">
        {fmtINR(premium.totalPremium.amount)}
        <span className="ml-2 text-base font-normal text-muted-foreground">{label}</span>
      </p>
      <div className="mt-4 flex flex-wrap gap-4 text-xs text-muted-foreground">
        <span>
          Gross:{' '}
          <span className="font-medium text-foreground">
            {fmtINR(premium.grossPremium.amount)}
          </span>
        </span>
        <span>
          Net:{' '}
          <span className="font-medium text-foreground">{fmtINR(premium.netPremium.amount)}</span>
        </span>
        {premium.gst && (
          <span>
            GST (18%):{' '}
            <span className="font-medium text-foreground">{fmtINR(premium.gst.amount)}</span>
          </span>
        )}
      </div>
    </div>
  );
}

function BreakupTable({ breakup }: { breakup: PremiumBreakupItemV2[] }) {
  const total = breakup.reduce((s, b) => s + b.premium.amount, 0);
  return (
    <div className="overflow-hidden rounded-lg border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-1/2">Item</TableHead>
            <TableHead>Type</TableHead>
            <TableHead className="text-right">Amount</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {breakup.map((item, i) => (
            <TableRow key={`${item.productCode}-${i}`}>
              <TableCell>
                <div>
                  <p className="text-sm font-medium">{item.productName}</p>
                  <p className="font-mono text-xs text-muted-foreground">{item.productCode}</p>
                </div>
              </TableCell>
              <TableCell>
                <PremiumTypeChip type={itemType(item)} />
              </TableCell>
              <TableCell className="text-right tabular-nums">
                {fmtINR(item.premium.amount)}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
        <TableFooter>
          <TableRow>
            <TableCell colSpan={2} className="font-semibold text-sm">
              Total
            </TableCell>
            <TableCell className="text-right font-semibold tabular-nums">
              {fmtINR(total)}
            </TableCell>
          </TableRow>
        </TableFooter>
      </Table>
    </div>
  );
}

type ViewMode = 'total' | 'per-plan';

function PremiumBreakdown({
  premium,
  plans,
  planBreakdown,
  premiumType,
}: {
  premium: QuotePremiumV2;
  plans: PlanV2[];
  planBreakdown: Array<{ planId: string; headcount: number }>;
  premiumType: 'ANNUAL' | 'SINGLE';
}) {
  const [view, setView] = useState<ViewMode>('total');
  const showToggle = plans.length > 1;
  const perPlanData = buildPerPlanPremium(premium, plans, planBreakdown);

  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <p className="text-sm font-semibold">Premium Breakdown</p>
        {showToggle && (
          <div className="flex rounded-lg border p-0.5 text-xs">
            <button
              className={`rounded-md px-3 py-1 transition-colors ${
                view === 'total' ? 'bg-background shadow-sm font-medium' : 'text-muted-foreground'
              }`}
              onClick={() => setView('total')}
            >
              Total
            </button>
            <button
              className={`rounded-md px-3 py-1 transition-colors ${
                view === 'per-plan'
                  ? 'bg-background shadow-sm font-medium'
                  : 'text-muted-foreground'
              }`}
              onClick={() => setView('per-plan')}
            >
              Per Plan
            </button>
          </div>
        )}
      </div>

      {view === 'total' ? (
        <BreakupTable breakup={premium.breakup} />
      ) : (
        <div className="flex flex-col gap-4">
          {perPlanData.map(({ plan, breakup, total }) => (
            <div key={plan.plan_id}>
              <div className="mb-2 flex items-center gap-2">
                <span className="font-mono text-xs text-muted-foreground">
                  {plan.plan_number}
                </span>
                <span className="text-sm font-semibold">{plan.plan_name}</span>
                <span className="ml-auto font-mono text-xs font-medium">
                  {fmtINR(total)}
                </span>
              </div>
              <BreakupTable breakup={breakup} />
            </div>
          ))}
        </div>
      )}

      {/* Footnote */}
      <p className="mt-4 text-[11px] leading-relaxed text-muted-foreground/70">
        Premium figures are indicative estimates based on aggregate census. Final premiums are
        reconciled at policy issuance.
      </p>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Stale premium banner
// ─────────────────────────────────────────────────────────────────────────────

function StalePremiumBanner() {
  return (
    <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3">
      <AlertTriangle className="mt-0.5 size-4 shrink-0 text-amber-600" />
      <p className="text-xs text-amber-800">
        <span className="font-semibold">Premium is stale</span> — the rate card has changed
        since the last calculation. Recalculate to update the premium figures.
      </p>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Empty / locked state
// ─────────────────────────────────────────────────────────────────────────────

function NotReadyState({ status }: { status: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed py-16">
      <Calculator className="size-9 text-muted-foreground/30" />
      <div className="text-center">
        <p className="text-sm font-medium text-muted-foreground">Premium not yet calculated</p>
        <p className="mt-0.5 text-xs text-muted-foreground/70">
          {status === 'RATED'
            ? 'Click "Calculate Premium" to generate the premium estimate.'
            : 'The version must be in "Rated" status before calculating premium.'}
        </p>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// PremiumTab (exported)
// ─────────────────────────────────────="────────────────────────────────────
// ─────────────────────────────────────────────────────────────────────────────

export function PremiumTab({ version, premiumType, onPremiumCalculated }: PremiumTabProps) {
  const [calculating, setCalculating] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const isRated = version.status === 'RATED';
  const hasPremium = !!version.premium;
  // Stale if no pricing_path set (indicates rate card was reset after premium calc)
  const isStale = hasPremium && !version.pricing_path;

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(null), 3500);
  }

  async function handleCalculate() {
    setCalculating(true);
    await new Promise((r) => setTimeout(r, 1500));
    const premium = buildMockPremium(version.plans, version.aggregate_census.headcount || 1);
    setCalculating(false);
    onPremiumCalculated(premium);
    showToast('Premium calculated successfully.');
  }

  return (
    <div className="flex flex-col gap-6 px-6 py-5">
      {/* Toast */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 rounded-lg bg-emerald-600 px-4 py-3 text-sm text-white shadow-lg">
          {toast}
        </div>
      )}

      {/* Header row */}
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold text-muted-foreground">
          {hasPremium ? 'Initial Premium' : 'Premium'}
        </p>
        <Button
          size="sm"
          disabled={!isRated || calculating}
          onClick={handleCalculate}
          title={!isRated ? 'Version must be Rated before calculating premium' : undefined}
          variant={hasPremium ? 'outline' : 'default'}
        >
          {calculating ? (
            <>
              <RefreshCw className="mr-2 size-4 animate-spin" />
              Calculating…
            </>
          ) : (
            <>
              <Calculator className="mr-2 size-4" />
              {hasPremium ? 'Recalculate' : 'Calculate Premium'}
            </>
          )}
        </Button>
      </div>

      {/* Stale banner */}
      {isStale && <StalePremiumBanner />}

      {/* Content */}
      {!hasPremium ? (
        <NotReadyState status={version.status} />
      ) : (
        <>
          <PremiumHero premium={version.premium!} premiumType={premiumType} />
          <Separator />
          <PremiumBreakdown
            premium={version.premium!}
            plans={version.plans}
            planBreakdown={version.aggregate_census.planBreakdown}
            premiumType={premiumType}
          />
        </>
      )}
    </div>
  );
}
