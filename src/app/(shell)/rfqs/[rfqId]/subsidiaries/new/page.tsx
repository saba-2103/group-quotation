'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { useRfqBundle } from '@/context/RfqBundleContext';
import { createSubsidiary } from '@/lib/api/quotation-client';

export default function NewSubsidiaryPage() {
  const { bundle, updateBundle } = useRfqBundle();
  const router = useRouter();
  if (!bundle) return null;

  const rfqId = bundle.rfqId;
  const [name, setName] = useState('');
  const [registrationNumber, setRegistrationNumber] = useState('');
  const [lives, setLives] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSave = async () => {
    if (!name.trim()) return;
    setSaving(true);
    setError(null);
    try {
      const sub = await createSubsidiary(rfqId, {
        name: name.trim(),
        registrationNumber: registrationNumber || undefined,
        lives: lives ? Number(lives) : 0,
      });
      updateBundle({ subsidiaries: [...(bundle.subsidiaries ?? []), sub] });
      router.push(`/rfqs/${rfqId}/subsidiaries`);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Save failed');
      setSaving(false);
    }
  };

  return (
    <div className="max-w-md mx-auto px-6 py-5">
      <h1 className="text-base font-semibold mb-1">Add Subsidiary</h1>
      <p className="text-xs text-muted-foreground mb-5">{bundle.employerName}</p>

      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <Label className="text-xs">Name<span className="text-destructive ml-0.5">*</span></Label>
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Acme West Region" className="text-sm" />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label className="text-xs">Registration number</Label>
          <Input value={registrationNumber} onChange={(e) => setRegistrationNumber(e.target.value)} placeholder="Optional" className="text-sm" />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label className="text-xs">Lives</Label>
          <Input type="number" min="0" value={lives} onChange={(e) => setLives(e.target.value)} placeholder="0" className="text-sm" />
        </div>
      </div>

      {error && <p className="mt-3 text-xs text-destructive">{error}</p>}

      <div className="flex items-center gap-2 mt-6 pt-4 border-t border-border/40">
        <Button variant="outline" size="sm" onClick={() => router.push(`/rfqs/${rfqId}/subsidiaries`)} disabled={saving}>Cancel</Button>
        <Button size="sm" onClick={handleSave} disabled={saving || !name.trim()} className="gap-1.5">
          {saving && <Loader2 className="size-3.5 animate-spin" />}
          Save
        </Button>
      </div>
    </div>
  );
}
