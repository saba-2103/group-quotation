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
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [location, setLocation] = useState('');
  const [splitRule, setSplitRule] = useState<'HEADCOUNT' | 'SI' | 'PREMIUM'>('HEADCOUNT');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSave = async () => {
    if (!code.trim() || !name.trim()) return;
    setSaving(true);
    setError(null);
    try {
      const today = new Date().toISOString().split('T')[0];
      const sub = await createSubsidiary(rfqId, {
        code: code.trim().toUpperCase(),
        name: name.trim(),
        locationMapping: location.trim() || undefined,
        billingSplitRule: splitRule,
        startDate: today,
        endDate: new Date(Date.now() + 365 * 86400000).toISOString().split('T')[0],
        status: 'ACTIVE',
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
          <Label className="text-xs">Code<span className="text-destructive ml-0.5">*</span></Label>
          <Input value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} placeholder="e.g. TCSBPS" className="text-sm font-mono" maxLength={12} />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label className="text-xs">Name<span className="text-destructive ml-0.5">*</span></Label>
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Legal entity name" className="text-sm" />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label className="text-xs">Location</Label>
          <Input value={location} onChange={(e) => setLocation(e.target.value)} placeholder="Optional" className="text-sm" />
        </div>
      </div>

      {error && <p className="mt-3 text-xs text-destructive">{error}</p>}

      <div className="flex items-center gap-2 mt-6 pt-4 border-t border-border/40">
        <Button variant="outline" size="sm" onClick={() => router.push(`/rfqs/${rfqId}/subsidiaries`)} disabled={saving}>Cancel</Button>
        <Button size="sm" onClick={handleSave} disabled={saving || !code.trim() || !name.trim()} className="gap-1.5">
          {saving && <Loader2 className="size-3.5 animate-spin" />}
          Save
        </Button>
      </div>
    </div>
  );
}
