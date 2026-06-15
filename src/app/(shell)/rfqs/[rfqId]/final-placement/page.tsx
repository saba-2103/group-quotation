'use client';

import { useState, useEffect } from 'react';
import { CheckCircle2 } from 'lucide-react';
import { useRfqBundle } from '@/context/RfqBundleContext';
import { updateRfq } from '@/lib/api/quotation-client';
import { type FinalPlacement } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';

const EMPTY: FinalPlacement = {
  placementDate: '',
  broker: '',
  commissionPct: undefined,
  placementNotes: '',
  finalPremiumConfirmed: undefined,
  policyDeliveredDate: '',
};

function FieldLabel({ children }: { children: React.ReactNode }) {
  return <label className="text-xs font-medium text-muted-foreground block mb-1">{children}</label>;
}

export default function FinalPlacementPage() {
  const { bundle, refetch } = useRfqBundle();
  const [form, setForm] = useState<FinalPlacement>(EMPTY);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  useEffect(() => {
    if (bundle?.finalPlacement) {
      setForm({ ...EMPTY, ...bundle.finalPlacement });
    }
  }, [bundle]);

  if (!bundle) return null;
  const rfqId = bundle.rfqId;

  function patch(p: Partial<FinalPlacement>) {
    setForm((s) => ({ ...s, ...p }));
    setSaved(false);
    setSaveError(null);
  }

  async function handleSave() {
    setSaving(true);
    setSaveError(null);
    try {
      await updateRfq(rfqId, { finalPlacement: form } as Parameters<typeof updateRfq>[1]);
      await refetch();
      setSaved(true);
    } catch (e: unknown) {
      setSaveError(e instanceof Error ? e.message : 'Save failed — please retry');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex flex-col gap-6 p-6 max-w-[720px] mx-auto">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight">Final Placement</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {bundle.employerName}
            {bundle.masterPolicyNumber && (
              <> · <span className="font-medium">{bundle.masterPolicyNumber}</span></>
            )}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {saved && (
            <span className="text-xs text-green-600 flex items-center gap-1">
              <CheckCircle2 className="size-3.5" /> Saved
            </span>
          )}
          {saveError && (
            <p className="text-xs text-destructive">{saveError}</p>
          )}
          <Button size="sm" disabled={saving} onClick={handleSave}>
            {saving ? 'Saving…' : 'Save'}
          </Button>
        </div>
      </div>

      <div className="rounded-xl border border-border bg-card px-6 py-5 space-y-5">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <FieldLabel>Placement Date</FieldLabel>
            <Input
              type="date"
              value={form.placementDate ?? ''}
              onChange={(e) => patch({ placementDate: e.target.value })}
            />
          </div>
          <div className="space-y-1">
            <FieldLabel>Policy Delivered Date</FieldLabel>
            <Input
              type="date"
              value={form.policyDeliveredDate ?? ''}
              onChange={(e) => patch({ policyDeliveredDate: e.target.value })}
            />
          </div>
        </div>

        <div className="space-y-1">
          <FieldLabel>Placing Broker</FieldLabel>
          <Input
            value={form.broker ?? ''}
            placeholder="Confirming broker name…"
            onChange={(e) => patch({ broker: e.target.value })}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <FieldLabel>Commission %</FieldLabel>
            <Input
              type="number"
              min={0}
              max={100}
              step={0.01}
              value={form.commissionPct ?? ''}
              placeholder="e.g. 7.5"
              onChange={(e) => patch({ commissionPct: e.target.value ? Number(e.target.value) : undefined })}
            />
          </div>
          <div className="space-y-1">
            <FieldLabel>Final Agreed Premium (₹)</FieldLabel>
            <Input
              type="number"
              min={0}
              value={form.finalPremiumConfirmed ?? ''}
              placeholder="e.g. 1200000"
              onChange={(e) => patch({ finalPremiumConfirmed: e.target.value ? Number(e.target.value) : undefined })}
            />
          </div>
        </div>

        <div className="space-y-1">
          <FieldLabel>Placement Notes</FieldLabel>
          <Textarea
            rows={4}
            value={form.placementNotes ?? ''}
            placeholder="Any notes about the final placement arrangement…"
            onChange={(e) => patch({ placementNotes: e.target.value })}
          />
        </div>
      </div>
    </div>
  );
}
