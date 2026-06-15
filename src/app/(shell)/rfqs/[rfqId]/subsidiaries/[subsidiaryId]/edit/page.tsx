'use client';

import { useState, use } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { useRfqBundle } from '@/context/RfqBundleContext';
import { updateSubsidiary } from '@/lib/api/quotation-client';

export default function EditSubsidiaryPage({ params }: { params: Promise<{ rfqId: string; subsidiaryId: string }> }) {
  const { subsidiaryId } = use(params);
  const { bundle, updateBundle } = useRfqBundle();
  const router = useRouter();
  if (!bundle) return null;

  const rfqId = bundle.rfqId;
  const sub = (bundle.subsidiaries ?? []).find((s) => s.subsidiaryId === subsidiaryId);

  const [name, setName] = useState(sub?.name ?? '');
  const [registrationNumber, setRegistrationNumber] = useState(sub?.registrationNumber ?? '');
  const [lives, setLives] = useState(sub?.lives?.toString() ?? '0');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!sub) {
    return (
      <div className="flex flex-col items-center justify-center h-48 gap-3 text-muted-foreground text-sm">
        Subsidiary not found.
        <Button variant="outline" size="sm" onClick={() => router.push(`/rfqs/${rfqId}/subsidiaries`)}>Back</Button>
      </div>
    );
  }

  const handleSave = async () => {
    if (!name.trim()) return;
    setSaving(true);
    setError(null);
    try {
      const updated = await updateSubsidiary(rfqId, subsidiaryId, {
        name: name.trim(),
        registrationNumber: registrationNumber || undefined,
        lives: lives ? Number(lives) : 0,
      });
      updateBundle({
        subsidiaries: (bundle.subsidiaries ?? []).map((s) =>
          s.subsidiaryId === subsidiaryId ? updated : s
        ),
      });
      router.push(`/rfqs/${rfqId}/subsidiaries`);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Save failed');
      setSaving(false);
    }
  };

  return (
    <div className="max-w-md mx-auto px-6 py-5">
      <h1 className="text-base font-semibold mb-1">Edit Subsidiary</h1>
      <p className="text-xs text-muted-foreground mb-5">{bundle.employerName}</p>

      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <Label className="text-xs">Name<span className="text-destructive ml-0.5">*</span></Label>
          <Input value={name} onChange={(e) => setName(e.target.value)} className="text-sm" />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label className="text-xs">Registration number</Label>
          <Input value={registrationNumber} onChange={(e) => setRegistrationNumber(e.target.value)} placeholder="Optional" className="text-sm" />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label className="text-xs">Lives</Label>
          <Input type="number" min="0" value={lives} onChange={(e) => setLives(e.target.value)} className="text-sm" />
        </div>
      </div>

      {error && <p className="mt-3 text-xs text-destructive">{error}</p>}

      <div className="flex items-center gap-2 mt-6 pt-4 border-t border-border/40">
        <Button variant="outline" size="sm" onClick={() => router.push(`/rfqs/${rfqId}/subsidiaries`)} disabled={saving}>Cancel</Button>
        <Button size="sm" onClick={handleSave} disabled={saving || !name.trim()} className="gap-1.5">
          {saving && <Loader2 className="size-3.5 animate-spin" />}
          Save Changes
        </Button>
      </div>
    </div>
  );
}
