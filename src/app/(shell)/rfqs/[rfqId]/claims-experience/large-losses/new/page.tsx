'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useRfqBundle } from '@/context/RfqBundleContext';
import { updateClaimsExperience } from '@/lib/api/quotation-client';

export default function NewLargeLossPage() {
  const { bundle, updateBundle } = useRfqBundle();
  const router = useRouter();
  if (!bundle) return null;

  const rfqId = bundle.rfqId;
  const [year, setYear] = useState<string>(new Date().getFullYear().toString());
  const [amount, setAmount] = useState('');
  const [cause, setCause] = useState('');
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canSave = amount.trim() && cause.trim() && year;

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    try {
      const existing = bundle.claimsExperience;
      const newLoss = {
        id: `ll-${Math.random().toString(36).slice(2, 9)}`,
        year: Number(year),
        amount: Number(amount),
        cause: cause.trim(),
        note: note.trim() || undefined,
      };
      const updated = await updateClaimsExperience(rfqId, {
        years: existing?.years ?? [],
        largeLosses: [...(existing?.largeLosses ?? []), newLoss],
      });
      updateBundle({ claimsExperience: updated });
      router.push(`/rfqs/${rfqId}/claims-experience`);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Save failed');
      setSaving(false);
    }
  };

  return (
    <div className="max-w-md mx-auto px-6 py-5">
      <h1 className="text-base font-semibold mb-1">Add Large Loss</h1>
      <p className="text-xs text-muted-foreground mb-5">{bundle.employerName}</p>

      <div className="flex flex-col gap-4">
        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-1.5">
            <Label className="text-xs">Year</Label>
            <Input type="number" value={year} onChange={(e) => setYear(e.target.value)} className="text-sm" />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label className="text-xs">Amount (₹)<span className="text-destructive ml-0.5">*</span></Label>
            <Input type="number" min="0" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0" className="text-sm" />
          </div>
        </div>
        <div className="flex flex-col gap-1.5">
          <Label className="text-xs">Cause<span className="text-destructive ml-0.5">*</span></Label>
          <Input value={cause} onChange={(e) => setCause(e.target.value)} placeholder="e.g. Cardiac arrest" className="text-sm" />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label className="text-xs">Note</Label>
          <Textarea value={note} onChange={(e) => setNote(e.target.value)} placeholder="Optional details" className="text-sm min-h-[72px]" />
        </div>
      </div>

      {error && <p className="mt-3 text-xs text-destructive">{error}</p>}

      <div className="flex items-center gap-2 mt-6 pt-4 border-t border-border/40">
        <Button variant="outline" size="sm"
          onClick={() => router.push(`/rfqs/${rfqId}/claims-experience`)} disabled={saving}>
          Cancel
        </Button>
        <Button size="sm" onClick={handleSave} disabled={saving || !canSave} className="gap-1.5">
          {saving && <Loader2 className="size-3.5 animate-spin" />}
          Save
        </Button>
      </div>
    </div>
  );
}
