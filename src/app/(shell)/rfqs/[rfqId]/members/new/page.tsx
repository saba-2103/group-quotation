'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { useRfqBundle } from '@/context/RfqBundleContext';
import { createMember } from '@/lib/api/quotation-client';

export default function NewMemberPage() {
  const { bundle, updateBundle } = useRfqBundle();
  const router = useRouter();
  if (!bundle) return null;

  const rfqId = bundle.rfqId;
  const [form, setForm] = useState({
    name: '', dateOfBirth: '', gender: 'M', grade: '',
    salary: '', sumAssured: '',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const set = (k: keyof typeof form, v: string) => setForm((f) => ({ ...f, [k]: v }));
  const canSave = form.name.trim() && form.dateOfBirth && form.grade.trim();

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    try {
      const member = await createMember(rfqId, {
        name: form.name.trim(),
        dateOfBirth: form.dateOfBirth,
        gender: form.gender,
        grade: form.grade.trim(),
        salary: form.salary ? Number(form.salary) : 0,
        sumAssured: form.sumAssured ? Number(form.sumAssured) : 0,
      });
      updateBundle({ members: [...bundle.members, member] });
      router.push(`/rfqs/${rfqId}/members`);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Save failed');
      setSaving(false);
    }
  };

  return (
    <div className="max-w-md mx-auto px-6 py-5">
      <h1 className="text-base font-semibold mb-1">Add Member</h1>
      <p className="text-xs text-muted-foreground mb-5">{bundle.employerName}</p>

      <div className="grid grid-cols-1 gap-4">
        <div className="flex flex-col gap-1.5">
          <Label className="text-xs">Name<span className="text-destructive ml-0.5">*</span></Label>
          <Input value={form.name} onChange={(e) => set('name', e.target.value)} className="text-sm" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-1.5">
            <Label className="text-xs">Date of birth<span className="text-destructive ml-0.5">*</span></Label>
            <Input type="date" value={form.dateOfBirth} onChange={(e) => set('dateOfBirth', e.target.value)} className="text-sm" />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label className="text-xs">Gender</Label>
            <Select value={form.gender} onValueChange={(v) => set('gender', v)}>
              <SelectTrigger className="text-sm"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="M">Male</SelectItem>
                <SelectItem value="F">Female</SelectItem>
                <SelectItem value="OTHER">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="flex flex-col gap-1.5">
          <Label className="text-xs">Grade<span className="text-destructive ml-0.5">*</span></Label>
          <Input value={form.grade} onChange={(e) => set('grade', e.target.value)} placeholder="e.g. G1" className="text-sm" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-1.5">
            <Label className="text-xs">Salary (₹)</Label>
            <Input type="number" value={form.salary} onChange={(e) => set('salary', e.target.value)} placeholder="0" className="text-sm" />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label className="text-xs">Sum assured (₹)</Label>
            <Input type="number" value={form.sumAssured} onChange={(e) => set('sumAssured', e.target.value)} placeholder="0" className="text-sm" />
          </div>
        </div>
      </div>

      {error && <p className="mt-3 text-xs text-destructive">{error}</p>}

      <div className="flex items-center gap-2 mt-6 pt-4 border-t border-border/40">
        <Button variant="outline" size="sm" onClick={() => router.push(`/rfqs/${rfqId}/members`)} disabled={saving}>Cancel</Button>
        <Button size="sm" onClick={handleSave} disabled={saving || !canSave} className="gap-1.5">
          {saving && <Loader2 className="size-3.5 animate-spin" />}
          Save
        </Button>
      </div>
    </div>
  );
}
