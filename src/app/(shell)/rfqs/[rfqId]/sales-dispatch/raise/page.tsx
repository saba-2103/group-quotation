'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronLeft } from 'lucide-react';
import { useRfqBundle } from '@/context/RfqBundleContext';
import { useHandoffStore } from '@/stores/handoffStore';
import { updatePlan } from '@/lib/api/quotation-client';
import { HandoffKind, HandoffStatus, PlanHandoffStatus } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';

function localId() {
  return `task-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
}

export default function RaiseSalesDispatchPage() {
  const router = useRouter();
  const { bundle, refetch } = useRfqBundle();
  const { upsertTask } = useHandoffStore();

  const [planId, setPlanId] = useState('');
  const [desk, setDesk] = useState<HandoffKind>(HandoffKind.ACTUARY);
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);

  if (!bundle) return null;
  const rfqId = bundle.rfqId;

  async function handleSend() {
    if (!planId) return;
    setSaving(true);
    const handoffStatus = desk === HandoffKind.UW
      ? PlanHandoffStatus.UW_REFERRED
      : PlanHandoffStatus.PRICING_REQUESTED;
    const targetPlan = bundle!.plans.find((p) => p.planId === planId);
    upsertTask({
      taskId: localId(),
      rfqId,
      planId,
      versionId: targetPlan?.quoteVersionId ?? '',
      kind: desk,
      status: HandoffStatus.REQUESTED,
      reason: note.trim() || 'Ad-hoc request from sales dispatch',
      lives: bundle!.members.length,
      slaHours: desk === HandoffKind.UW ? 72 : 48,
      requestedAt: new Date().toISOString(),
    });
    try {
      await updatePlan(rfqId, planId, { handoffStatus });
      await refetch();
      router.push(`/rfqs/${rfqId}/sales-dispatch`);
    } catch {
      setSaving(false);
    }
  }

  return (
    <div className="min-h-screen bg-background flex items-start justify-center pt-16 px-4">
      <div className="w-full max-w-lg">
        <button
          className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground mb-6"
          onClick={() => router.push(`/rfqs/${rfqId}/sales-dispatch`)}
        >
          <ChevronLeft className="size-3.5" /> Back to sales dispatch
        </button>
        <div className="rounded-2xl border border-border bg-card shadow-sm p-6 space-y-5">
          <div>
            <h1 className="text-base font-bold">Ad-hoc Dispatch Request</h1>
            <p className="text-xs text-muted-foreground mt-1">
              Raise a pricing or UW request for any plan across all versions.
            </p>
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground">Plan *</label>
            <select
              className="w-full text-sm border border-border rounded-lg px-3 py-2 bg-background focus:outline-none focus:ring-1 focus:ring-primary/30"
              value={planId}
              onChange={(e) => setPlanId(e.target.value)}
            >
              <option value="">Select a plan…</option>
              {bundle.plans.map((p) => {
                const v = bundle.quoteVersions.find((v) => v.id === p.quoteVersionId);
                return (
                  <option key={p.planId} value={p.planId}>
                    {p.name} — {v?.name ?? 'Unknown version'}
                  </option>
                );
              })}
            </select>
          </div>
          <div className="space-y-2">
            <label className="text-xs font-medium text-muted-foreground">Desk *</label>
            <div className="flex gap-2">
              {[HandoffKind.ACTUARY, HandoffKind.UW].map((d) => (
                <button
                  key={d}
                  className={`flex-1 text-sm py-2 rounded-lg border transition-colors ${
                    desk === d
                      ? 'border-primary bg-primary/5 text-primary font-medium'
                      : 'border-border hover:bg-muted/30 text-foreground'
                  }`}
                  onClick={() => setDesk(d)}
                >
                  {d === HandoffKind.ACTUARY ? 'Actuary' : 'Underwriting'}
                </button>
              ))}
            </div>
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground">Note / Reason</label>
            <Textarea
              rows={3}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Reason for this request or context for the receiving desk…"
            />
          </div>
          <div className="flex gap-3 pt-1">
            <Button
              variant="outline" className="flex-1"
              onClick={() => router.push(`/rfqs/${rfqId}/sales-dispatch`)}
            >
              Cancel
            </Button>
            <Button
              className="flex-1" disabled={!planId || saving}
              onClick={handleSend}
            >
              {saving ? 'Sending…' : 'Send request'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
