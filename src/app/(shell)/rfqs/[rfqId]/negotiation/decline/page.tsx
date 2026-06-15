'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronLeft, XCircle } from 'lucide-react';
import { useRfqBundle } from '@/context/RfqBundleContext';
import { useRole } from '@/hooks/useRole';
import { updateRfq, advanceRfqStatus } from '@/lib/api/quotation-client';
import {
  NegotiationParty, NegotiationKind, RfqStatus,
  type NegotiationRound,
} from '@/lib/types';
import { Button } from '@/components/ui/button';

export default function DeclineNegotiationPage() {
  const router = useRouter();
  const { bundle, refetch } = useRfqBundle();
  const { userName } = useRole();
  const [confirming, setConfirming] = useState(false);

  if (!bundle) return null;
  const rfqId = bundle.rfqId;

  async function handleConfirm() {
    setConfirming(true);
    try {
      const nextRoundNo =
        (bundle!.negotiationLog[bundle!.negotiationLog.length - 1]?.roundNo ?? 0) + 1;
      const declineRound: NegotiationRound = {
        roundNo: nextRoundNo,
        party: NegotiationParty.INSURER,
        kind: NegotiationKind.DECLINE,
        versionId: bundle!.activeVersionId,
        note: 'Broker declined — deal closed',
        by: userName,
        at: new Date().toISOString(),
      };
      await updateRfq(rfqId, {
        negotiationLog: [...bundle!.negotiationLog, declineRound],
      });
      await advanceRfqStatus(rfqId, RfqStatus.REJECTED);
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

        <div className="rounded-2xl border border-destructive/30 bg-card shadow-lg overflow-hidden">
          <div className="bg-destructive px-6 py-5 flex items-center gap-3">
            <div className="size-10 rounded-full bg-white/20 flex items-center justify-center">
              <XCircle className="size-5 text-white" />
            </div>
            <div>
              <h1 className="text-base font-bold text-white">Broker Declined</h1>
              <p className="text-xs text-destructive-foreground/80">Close out this negotiation</p>
            </div>
          </div>

          <div className="px-6 py-5 space-y-5">
            <div className="rounded-lg bg-destructive/5 border border-destructive/20 px-4 py-3">
              <p className="text-sm text-destructive">
                This will record a DECLINE round and mark the deal REJECTED.
              </p>
            </div>

            <div>
              <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
                Consequences
              </h2>
              <ul className="space-y-1.5">
                {[
                  'A DECLINE round will be appended to the negotiation log.',
                  'The deal status will advance to REJECTED.',
                  'The negotiation loop will be closed — no further counters can be logged.',
                  'The RFQ will remain accessible in read-only mode for audit purposes.',
                ].map((c) => (
                  <li key={c} className="flex items-start gap-2 text-xs">
                    <XCircle className="size-3.5 text-destructive mt-0.5 shrink-0" />
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
                variant="destructive"
                className="flex-1"
                onClick={handleConfirm}
                disabled={confirming}
              >
                {confirming ? 'Confirming…' : 'Confirm decline'}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
