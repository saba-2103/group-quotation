'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Lock, ArrowRight, Clock, Shield, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { useRfqBundle } from '@/context/RfqBundleContext';
import { useEscalationStore } from '@/stores/escalationStore';
import { useRole } from '@/hooks/useRole';
import { computeFreezeState } from '@/lib/computations';
import { canEditPolicyFlags } from '@/lib/permissions';
import { updateRfq } from '@/lib/api/quotation-client';
import { POLICY_FLAG_SEEDS } from '@/lib/constants';
import {
  EscalationKind, EscalationStatus,
  type PolicyFlag,
} from '@/lib/types';
import { Button } from '@/components/ui/button';

export default function PolicyFlagsPage() {
  const router = useRouter();
  const { bundle, refetch } = useRfqBundle();
  const { role, salesLevel, userName } = useRole();
  const { escalations, raise } = useEscalationStore();
  const [flags, setFlags] = useState<PolicyFlag[]>([]);
  const [saving, setSaving] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (bundle) {
      // Merge seed flags with any saved values from bundle
      const saved = bundle.policyFlags ?? [];
      const merged = POLICY_FLAG_SEEDS.map((seed) => {
        const existing = saved.find((f) => f.id === seed.id);
        return existing ? { ...seed, value: existing.value } : { ...seed };
      });
      setFlags(merged);
    }
  }, [bundle]);

  if (!bundle) return null;

  const { isFrozen } = computeFreezeState(bundle);
  if (!isFrozen) {
    return (
      <div className="p-8 max-w-lg mx-auto">
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-6 py-5 space-y-3">
          <div className="flex items-center gap-2 text-amber-800 font-semibold">
            <Lock className="size-4" /> Freeze required
          </div>
          <p className="text-sm text-amber-700">
            Freeze the broker-aligned version first to access policy flags.
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
  const canEditDirectly = canEditPolicyFlags(role, salesLevel);
  const canEditEscalated = canEditPolicyFlags(role, salesLevel);

  async function handleToggle(flag: PolicyFlag, newValue: boolean) {
    const updated = flags.map((f) => f.id === flag.id ? { ...f, value: newValue } : f);
    setFlags(updated);
    setSaving((s) => ({ ...s, [flag.id]: true }));
    try {
      await updateRfq(rfqId, { policyFlags: updated } as Parameters<typeof updateRfq>[1]);
      await refetch();
    } finally {
      setSaving((s) => ({ ...s, [flag.id]: false }));
    }
  }

  function handleRaiseEscalation(flag: PolicyFlag) {
    raise({
      kind: EscalationKind.POLICY_FLAG,
      rfqId,
      versionId: bundle!.activeVersionId,
      subject: `Enable policy flag: ${flag.label}`,
      requestedBy: userName,
      requestedAt: new Date().toISOString(),
    });
  }

  function getFlagEscalations(flagId: string) {
    return escalations.filter(
      (e) =>
        e.rfqId === rfqId &&
        e.kind === EscalationKind.POLICY_FLAG &&
        e.subject.includes(flagId)
    );
  }

  return (
    <div className="flex flex-col gap-6 p-6 max-w-[720px] mx-auto">
      <div>
        <h1 className="text-xl font-bold tracking-tight">Policy Flags</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          {bundle.employerName} — coverage flags and exclusions
        </p>
      </div>

      <div className="rounded-xl border border-border bg-card divide-y divide-border/50">
        {flags.map((flag) => {
          const isSimpleEditable = !flag.requiresEscalation && canEditDirectly;
          const isEscalationEditable = flag.requiresEscalation && canEditEscalated;
          const canToggle = isSimpleEditable || isEscalationEditable;

          const flagEscs = getFlagEscalations(flag.id);
          const pendingEsc = flagEscs.find((e) => e.status === EscalationStatus.PENDING);
          const approvedEsc = flagEscs.find((e) => e.status === EscalationStatus.APPROVED);
          const rejectedEsc = !pendingEsc && !approvedEsc
            ? flagEscs.find((e) => e.status === EscalationStatus.REJECTED)
            : null;

          // For non-L2 SALES with escalation flag: can toggle only if approved
          const needsEscalationGate = flag.requiresEscalation && role === 'SALES' && (salesLevel ?? 0) < 2;
          const effectiveCanToggle = needsEscalationGate ? !!approvedEsc : canToggle;

          return (
            <div key={flag.id} className="px-5 py-4 space-y-3">
              <div className="flex items-start gap-4">
                {/* Toggle */}
                <label className="relative shrink-0 mt-0.5">
                  <input
                    type="checkbox"
                    checked={flag.value}
                    disabled={!effectiveCanToggle || !!saving[flag.id]}
                    onChange={(e) => handleToggle(flag, e.target.checked)}
                    className="peer sr-only"
                  />
                  <div className="h-5 w-9 rounded-full bg-muted border border-border peer-checked:bg-primary peer-checked:border-primary transition-colors peer-disabled:opacity-50 cursor-pointer" />
                  <div className="absolute top-0.5 left-0.5 h-4 w-4 rounded-full bg-white border border-border shadow-sm peer-checked:translate-x-4 peer-checked:border-primary transition-transform" />
                </label>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm font-medium">{flag.label}</p>
                    {flag.requiresEscalation && (
                      <span className="text-[10px] bg-amber-50 border border-amber-200 text-amber-700 rounded-full px-1.5 py-0.5">
                        Requires approval
                      </span>
                    )}
                    {flag.value && (
                      <span className="text-[10px] bg-primary/10 border border-primary/20 text-primary rounded-full px-1.5 py-0.5">
                        Enabled
                      </span>
                    )}
                    {saving[flag.id] && (
                      <span className="text-[10px] text-muted-foreground">Saving…</span>
                    )}
                  </div>

                  {/* Escalation section for flags needing approval when user is below L2 */}
                  {needsEscalationGate && (
                    <div className="mt-2">
                      {pendingEsc ? (
                        <div className="flex items-center gap-1.5 text-xs text-amber-700">
                          <Clock className="size-3.5 shrink-0" /> Pending with supervisor
                        </div>
                      ) : approvedEsc ? (
                        <div className="flex items-center gap-1.5 text-xs text-green-700">
                          <Shield className="size-3.5 shrink-0" />
                          Approved by {approvedEsc.decidedBy} — toggle is now editable
                        </div>
                      ) : rejectedEsc ? (
                        <div className="space-y-1.5">
                          <div className="flex items-center gap-1.5 text-xs text-destructive">
                            <AlertTriangle className="size-3.5 shrink-0" />
                            {rejectedEsc.decisionNote ?? 'Request rejected'}
                          </div>
                          <Button
                            size="sm" variant="outline" className="text-[10px] h-6 px-2"
                            onClick={() => handleRaiseEscalation(flag)}
                          >
                            Request again
                          </Button>
                        </div>
                      ) : (
                        <Button
                          size="sm" variant="outline"
                          className="text-[10px] h-6 px-2 mt-1 border-amber-300 text-amber-800 hover:bg-amber-50"
                          onClick={() => handleRaiseEscalation(flag)}
                        >
                          Request supervisor approval to enable this flag
                        </Button>
                      )}
                    </div>
                  )}

                  {/* Read-only notice for non-SALES */}
                  {!canEditDirectly && !needsEscalationGate && (
                    <p className="text-[10px] text-muted-foreground mt-1 italic">Read-only</p>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

