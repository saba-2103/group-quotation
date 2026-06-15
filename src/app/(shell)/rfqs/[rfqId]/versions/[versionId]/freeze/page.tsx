'use client';

import { useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { ShieldCheck, AlertTriangle, ChevronLeft, Lock } from 'lucide-react';
import { useRfqBundle } from '@/context/RfqBundleContext';
import { updateRfq } from '@/lib/api/quotation-client';
import { generateValidationReceipt } from '@/lib/utils';
import { VersionStatus, type QuoteVersion, type PolicyConfig } from '@/lib/types';
import { Button } from '@/components/ui/button';

// ─── Policy config defaults ───────────────────────────────────────────────────

function seedPolicyDefaults(existing: PolicyConfig): PolicyConfig {
  return {
    gracePeriodDays: existing.gracePeriodDays || 30,
    billingFrequency: existing.billingFrequency || 'ANNUAL',
    collectionMethod: existing.collectionMethod || 'ECS',
    subsidiariesEnabled: existing.subsidiariesEnabled ?? false,
    policyYearStart: existing.policyYearStart,
    policyYearEnd: existing.policyYearEnd,
  };
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function FreezeVersionPage() {
  const router = useRouter();
  const params = useParams<{ rfqId: string; versionId: string }>();
  const { rfqId, versionId } = params;

  const { bundle, refetch } = useRfqBundle();
  const [confirming, setConfirming] = useState(false);
  const [done, setDone] = useState(false);

  if (!bundle) return null;

  const version = bundle.quoteVersions.find((v) => v.id === versionId);
  if (!version) {
    return (
      <div className="p-8 text-center text-muted-foreground text-sm">
        Version not found.{' '}
        <button
          className="underline"
          onClick={() => router.push(`/rfqs/${rfqId}/versions`)}
        >
          Back to versions
        </button>
      </div>
    );
  }

  const plansForVersion = bundle.plans.filter((p) => p.quoteVersionId === versionId);
  const productCodes = plansForVersion
    .map((p) => p.productCode)
    .filter((c): c is string => !!c);
  const uniqueCodes = [...new Set(productCodes)];

  // Pre-compute the receipt for display
  const previewReceipt = generateValidationReceipt(bundle, versionId);

  async function handleConfirm() {
    if (!bundle) return;
    setConfirming(true);
    try {
      const receipt = generateValidationReceipt(bundle, versionId);

      // Freeze this version; demote any other FROZEN → SELECTED
      const updatedVersions: QuoteVersion[] = bundle.quoteVersions.map((v) => {
        if (v.id === versionId) {
          return { ...v, status: VersionStatus.FROZEN, validationReceipt: receipt };
        }
        if (v.status === VersionStatus.FROZEN) {
          return { ...v, status: VersionStatus.SELECTED };
        }
        return v;
      });

      const policyConfig = seedPolicyDefaults(bundle.policyConfig);

      await updateRfq(rfqId, {
        quoteVersions: updatedVersions,
        activeVersionId: versionId,
        policyConfig,
      });
      await refetch();
      setDone(true);
      router.push(`/rfqs/${rfqId}/versions`);
    } catch {
      setConfirming(false);
    }
  }

  const isFrozen = version.status === VersionStatus.FROZEN;

  return (
    <div className="min-h-screen bg-background flex items-start justify-center pt-16 px-4">
      <div className="w-full max-w-lg">
        {/* Back link */}
        <button
          className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground mb-6"
          onClick={() => router.push(`/rfqs/${rfqId}/versions`)}
        >
          <ChevronLeft className="size-3.5" /> Back to versions
        </button>

        <div className="rounded-2xl border border-border bg-card shadow-lg overflow-hidden">
          {/* Header */}
          <div className="bg-violet-600 px-6 py-5 flex items-center gap-3">
            <div className="size-10 rounded-full bg-white/20 flex items-center justify-center">
              <ShieldCheck className="size-5 text-white" />
            </div>
            <div>
              <h1 className="text-base font-bold text-white">Freeze Version</h1>
              <p className="text-xs text-violet-200">
                This action locks the product configuration for issuance.
              </p>
            </div>
          </div>

          <div className="px-6 py-5 space-y-5">
            {/* What is being frozen */}
            <div className="rounded-lg bg-violet-50 border border-violet-200 px-4 py-3">
              <p className="text-sm text-violet-900">
                You are about to freeze:{' '}
                <span className="font-semibold">
                  V{version.versionNo} — {version.name}
                </span>
              </p>
            </div>

            {/* Already frozen warning */}
            {isFrozen && (
              <div className="flex items-start gap-2 rounded-lg bg-amber-50 border border-amber-200 px-4 py-3">
                <AlertTriangle className="size-4 text-amber-600 mt-0.5 shrink-0" />
                <p className="text-xs text-amber-800">
                  This version is already frozen. Re-confirming will re-stamp the validation receipt with the current configuration.
                </p>
              </div>
            )}

            {/* Consequences */}
            <div>
              <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
                Consequences
              </h2>
              <ul className="space-y-1.5 text-sm">
                {[
                  'This version will be marked FROZEN.',
                  'Any previously frozen version will be demoted to SELECTED.',
                  'The policy detail screens, quote pack, and issuance will unlock.',
                  'Plan configuration for this version cannot be changed while frozen.',
                ].map((c) => (
                  <li key={c} className="flex items-start gap-2">
                    <ShieldCheck className="size-3.5 text-violet-500 mt-0.5 shrink-0" />
                    <span className="text-xs text-foreground/80">{c}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Single-frozen-version invariant */}
            <div className="flex items-start gap-2 rounded-lg bg-muted/50 border border-border px-4 py-3">
              <Lock className="size-4 text-muted-foreground mt-0.5 shrink-0" />
              <p className="text-xs text-muted-foreground">
                <strong className="text-foreground">Single-frozen-version invariant:</strong>{' '}
                Only one version can be in FROZEN state at any time. Previous FROZEN versions become SELECTED automatically.
              </p>
            </div>

            {/* Validation receipt preview */}
            <div>
              <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
                Validation Receipt to be Stamped
              </h2>
              <div className="rounded-lg border border-border bg-muted/30 p-3 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">Config hash</span>
                  <span className="font-mono text-foreground">{previewReceipt.configHash}</span>
                </div>
                <div className="flex items-start justify-between text-xs gap-4">
                  <span className="text-muted-foreground shrink-0">Product codes</span>
                  <div className="flex flex-wrap gap-1 justify-end">
                    {uniqueCodes.length > 0 ? (
                      uniqueCodes.map((c) => (
                        <span
                          key={c}
                          className="font-mono bg-background border border-border rounded px-1.5 py-0.5 text-[10px]"
                        >
                          {c}
                        </span>
                      ))
                    ) : (
                      <span className="text-muted-foreground italic">No product codes set</span>
                    )}
                  </div>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">Product pins</span>
                  <span className="tabular-nums">{previewReceipt.productPins.length}</span>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-3 pt-1">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => router.push(`/rfqs/${rfqId}/versions`)}
                disabled={confirming}
              >
                Cancel
              </Button>
              <Button
                className="flex-1 bg-violet-600 hover:bg-violet-700"
                onClick={handleConfirm}
                disabled={confirming || done}
              >
                {confirming ? (
                  'Freezing…'
                ) : (
                  <>
                    <ShieldCheck className="size-4 mr-1.5" /> Confirm & Freeze
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
