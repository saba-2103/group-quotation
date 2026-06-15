'use client';

import { useRouter } from 'next/navigation';
import { Download } from 'lucide-react';
import { useRfqBundle } from '@/context/RfqBundleContext';
import { useRole } from '@/hooks/useRole';
import { computeFreezeState } from '@/lib/computations';
import { Button } from '@/components/ui/button';

export default function QuoteLetterPage() {
  const router = useRouter();
  const { bundle } = useRfqBundle();
  const { userName } = useRole();

  if (!bundle) return null;

  const { frozenVersion } = computeFreezeState(bundle);
  const rfqId = bundle.rfqId;
  const today = new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' });
  const pricingForVersion = frozenVersion
    ? bundle.actuaryPricing.byVersion[frozenVersion.id]
    : null;
  const activePlans = bundle.plans.filter((p) => p.quoteVersionId === bundle.activeVersionId);

  const totalLives = bundle.members.length > 0
    ? bundle.members.length
    : bundle.censusSummary?.totalLives ?? 0;
  const totalPremium = pricingForVersion?.finalPremiumInclGst ?? 0;

  function handleDownload() {
    // TODO: not yet implemented
    alert('Download coming soon');
  }

  return (
    <div className="flex flex-col gap-6 p-6 max-w-[860px] mx-auto">
      {/* Toolbar */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight">Quote Letter</h1>
          <p className="text-sm text-muted-foreground mt-0.5">{bundle.employerName}</p>
        </div>
        <Button variant="outline" size="sm" onClick={handleDownload}>
          <Download className="size-4 mr-1.5" /> Download letter
        </Button>
      </div>

      {/* Letter */}
      <div className="relative rounded-2xl border border-border bg-card shadow-sm overflow-hidden">
        {/* Draft watermark */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 flex items-center justify-center rotate-[-30deg] opacity-[0.04] select-none"
        >
          <span className="text-[120px] font-black tracking-widest text-foreground">
            DRAFT
          </span>
        </div>
        <div className="pointer-events-none absolute top-4 right-4">
          <span className="text-[10px] font-semibold uppercase tracking-widest border border-amber-300 text-amber-600 bg-amber-50 rounded px-2 py-0.5">
            Draft — for internal review
          </span>
        </div>

        <div className="px-10 py-10 font-serif text-sm leading-relaxed space-y-6 text-foreground">
          {/* Date */}
          <p className="text-right text-xs text-muted-foreground">{today}</p>

          {/* Addressee */}
          <div className="space-y-0.5">
            <p className="font-semibold">{bundle.employerName}</p>
            {bundle.brokerName && <p>Attn: {bundle.brokerName}</p>}
          </div>

          {/* Subject */}
          <div className="border-l-2 border-primary pl-3">
            <p className="font-semibold text-base">
              Subject: Quote for Group Term Life Insurance
              {bundle.effectiveDate ? ` — Policy Effective ${bundle.effectiveDate}` : ''}
            </p>
          </div>

          {/* Body — Paragraph 1: Intro */}
          <p>
            Dear {bundle.brokerName ? bundle.brokerName : 'Sir / Madam'},
          </p>
          <p>
            We are pleased to present our quotation for a Group Term Life Insurance scheme for{' '}
            <strong>{bundle.employerName}</strong>, comprising{' '}
            <strong>{totalLives.toLocaleString('en-IN')} lives</strong> across{' '}
            {activePlans.length} plan{activePlans.length !== 1 ? 's' : ''}. This quote is prepared
            under reference <strong>{rfqId}</strong>
            {frozenVersion ? `, version ${frozenVersion.name}` : ''}, on the basis of the census
            data and underwriting information provided.
          </p>

          {/* Body — Paragraph 2: Coverage table */}
          <div className="space-y-3">
            <p>
              The proposed coverage structure and indicative premiums are summarised below:
            </p>
            {activePlans.length > 0 ? (
              <table className="w-full text-xs border border-border rounded overflow-hidden">
                <thead className="bg-muted/40">
                  <tr>
                    {['Plan Name', 'Product', 'Sum Assured Basis', 'Cover Pattern', 'Premium (₹)'].map((h) => (
                      <th key={h} className="text-left px-3 py-2 font-semibold border-b border-border">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {activePlans.map((plan) => {
                    const planPrice = pricingForVersion?.byPlan?.[plan.planId];
                    return (
                      <tr key={plan.planId} className="border-b border-border/30 last:border-0">
                        <td className="px-3 py-2 font-medium">{plan.name}</td>
                        <td className="px-3 py-2 text-muted-foreground">{plan.productCode ?? '—'}</td>
                        <td className="px-3 py-2">{plan.sumAssuredBasis}</td>
                        <td className="px-3 py-2">{plan.coverPattern}</td>
                        <td className="px-3 py-2">
                          {planPrice
                            ? `₹${planPrice.premium.toLocaleString('en-IN')}`
                            : 'Pricing pending'}
                        </td>
                      </tr>
                    );
                  })}
                  <tr className="bg-muted/20 font-semibold">
                    <td colSpan={4} className="px-3 py-2 text-right">Total Premium (incl. GST)</td>
                    <td className="px-3 py-2">
                      {totalPremium > 0 ? `₹${totalPremium.toLocaleString('en-IN')}` : 'Pending'}
                    </td>
                  </tr>
                </tbody>
              </table>
            ) : (
              <p className="text-muted-foreground italic text-xs">No plan data available.</p>
            )}
          </div>

          {/* Body — Paragraph 3: Terms & next steps */}
          <p>
            This quotation is valid for{' '}
            <strong>30 days</strong> from the date of this letter and is subject to satisfactory
            completion of underwriting requirements. The quoted premium is inclusive of applicable
            GST and is calculated on the census data provided as at the date of this letter.
            {bundle.policyConfig.billingFrequency && (
              <> Premium is payable on a <strong>{bundle.policyConfig.billingFrequency.toLowerCase().replace(/_/g, '-')}</strong> basis.</>
            )}
          </p>
          <p>
            To accept this quotation, please return a signed copy of the proposal form along with
            the required board resolution or authorisation. Upon receipt of signed documentation
            and first premium, we will proceed with policy issuance under master policy number
            to be issued. For any clarifications, please contact your relationship manager.
          </p>

          {/* Sign-off */}
          <div className="pt-4 space-y-1 border-t border-border/30">
            <p>Yours faithfully,</p>
            <p className="font-semibold">{userName ?? 'Sales Representative'}</p>
            <p className="text-xs text-muted-foreground">Group Business — Life Insurance</p>
          </div>
        </div>
      </div>

      <p className="text-[11px] text-center text-muted-foreground italic">
        This is a draft letter for internal review only. It has not been dispatched to the client.
      </p>
    </div>
  );
}
