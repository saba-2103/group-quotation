'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronLeft, CheckCircle2 } from 'lucide-react';
import { useRfqBundle } from '@/context/RfqBundleContext';
import { useRole } from '@/hooks/useRole';
import { updateRfq, advanceRfqStatus } from '@/lib/api/quotation-client';
import {
  NegotiationParty, NegotiationKind, RfqStatus, VersionStatus,
  type NegotiationRound,
} from '@/lib/types';
import { Button } from '@/components/ui/button';

export default function AcceptNegotiationPage() {
  const router = useRouter();
  const { bundle, refetch } = useRfqBundle();
  const { userName } = useRole();
  const [confirming, setConfirming] = useState(false);

  if (!bundle) return null;
  const rfqId = bundle.rfqId;

  const latestBrokerRound = [...bundle.negotiationLog]
    .reverse()
    .find((r) => r.party === NegotiationParty.BROKER);

  const activeVersion = bundle.quoteVersions.find(
    (v) => v.id === bundle.activeVersionId
  );

  async function handleConfirm() {
    setConfirming(true);
    try {
      // Append ACCEPT round
      const nextRoundNo = (bundle!.negotiationLog[bundle!.negotiationLog.length - 1]?.roundNo ?? 0) + 1;
      const acceptRound: NegotiationRound = {
        roundNo: nextRoundNo,
        party: NegotiationParty.INSURER,
        kind: NegotiationKind.ACCEPT,
        versionId: bundle!.activeVersionId,
        note: 'Deal accepted — aligned with broker',
        by: userName,
        at: new Date().toISOString(),
      };

      // Mark active version as SELECTED (ready to freeze)
      const updatedVersions = bundle!.quoteVersions.map((v) =>
        v.id === bundle!.activeVersionId
          ? { ...v, status: VersionStatus.SELECTED }
          : v
      );

      await updateRfq(rfqId, {
        negotiationLog: [...bundle!.negotiationLog, acceptRound],
        quoteVersions: updatedVersions,
      });
      await advanceRfqStatus(rfqId, RfqStatus.FINAL);
      await refetch();
      router.push(`/rfqs/${rfqId}/negotiation`);
    } catch {
      setConfirming(false);
    }
  }

  return (
    <div className="min-h-screen bg-background flex items-start justify-center pt-16 px-4">
      <div className="w-full max-w-lg">
        <button
          className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground mb-6"
          onClick={() => router.push(`/rfqs/${rfqId}/negotiation`)}
        >
          <ChevronLeft className="size-3.5" /> Back to negotiation
        </button>

        <div className="rounded-2xl border border-green-200 bg-card shadow-lg overflow-hidden">
          <div className="bg-green-600 px-6 py-5 flex items-center gap-3">
            <div className="size-10 rounded-full bg-white/20 flex items-center justify-center">
              <CheckCircle2 className="size-5 text-white" />
            </div>
            <div>
              <h1 className="text-base font-bold text-white">Accept &amp; Align</h1>
              <p className="text-xs text-green-100">Record agreement with the broker</p>
            </div>
          </div>

          <div className="px-6 py-5 space-y-5">
            {activeVersion && (
              <div className="rounded-lg bg-green-50 border border-green-200 px-4 py-3">
                <p className="text-sm text-green-900">
                  Accepting deal on{' '}
                  <span className="font-semibold">
                    V{activeVersion.versionNo} — {activeVersion.name}
                  </span>
                  {latestBrokerRound?.askDiscountPct != null && (
                    <> at <span className="font-semibold">{latestBrokerRound.askDiscountPct}% discount</span></>
                  )}
                  .
                </p>
              </div>
            )}

            <div>
              <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
                Consequences
              </h2>
              <ul className="space-y-1.5">
                {[
                  'An ACCEPT round will be appended to the negotiation log.',
                  'The active version will be marked SELECTED.',
                  'The deal status will advance to FINAL.',
                  'The version still needs to be frozen on Quote Versions before policy creation can begin.',
                ].map((c) => (
                  <li key={c} className="flex items-start gap-2 text-xs">
                    <CheckCircle2 className="size-3.5 text-green-500 mt-0.5 shrink-0" />
                    <span className="text-foreground/80">{c}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="flex gap-3 pt-1">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => router.push(`/rfqs/${rfqId}/negotiation`)}
                disabled={confirming}
              >
                Cancel
              </Button>
              <Button
                className="flex-1 bg-green-600 hover:bg-green-700"
                onClick={handleConfirm}
                disabled={confirming}
              >
                {confirming ? 'Confirming…' : 'Confirm acceptance'}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
