'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, AlertTriangle } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useRfqBundle } from '@/context/RfqBundleContext';
import { updateMember } from '@/lib/api/quotation-client';
import type { Member } from '@/lib/types';

type EditMap = Record<string, Partial<Member>>;

export default function BulkRepairPage() {
  const { bundle, updateBundle } = useRfqBundle();
  const router = useRouter();
  if (!bundle) return null;

  const rfqId = bundle.rfqId;
  // Error rows: members with missing grade, salary, or dateOfBirth
  const errorMembers = bundle.members.filter(
    (m) => !m.grade || !m.salary || !m.dateOfBirth
  );

  const [edits, setEdits] = useState<EditMap>({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const setField = (memberNumber: string, field: keyof Member, value: string | number) => {
    setEdits((e) => ({
      ...e,
      [memberNumber]: { ...e[memberNumber], [field]: value },
    }));
  };

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    try {
      const updates = await Promise.all(
        Object.entries(edits).map(([mn, patch]) => updateMember(rfqId, mn, patch))
      );
      const updatedMap = new Map(updates.map((m) => [m.memberNumber, m]));
      updateBundle({
        members: bundle.members.map((m) => updatedMap.get(m.memberNumber) ?? m),
      });
      router.push(`/rfqs/${rfqId}/census-workbench`);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Save failed');
      setSaving(false);
    }
  };

  if (errorMembers.length === 0) {
    return (
      <div className="max-w-3xl mx-auto px-6 py-5">
        <h1 className="text-base font-semibold mb-2">Bulk Repair</h1>
        <div className="flex items-center gap-2 rounded-lg bg-green-50 border border-green-200 px-4 py-3 text-green-700 text-sm">
          No records with errors found.
        </div>
        <Button variant="outline" size="sm" className="mt-4"
          onClick={() => router.push(`/rfqs/${rfqId}/census-workbench`)}>
          Back
        </Button>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-6 py-5">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-base font-semibold">Bulk Repair</h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            {errorMembers.length} record{errorMembers.length !== 1 ? 's' : ''} with errors
          </p>
        </div>
      </div>

      <div className="flex items-start gap-2 rounded-lg bg-amber-50 border border-amber-200 px-3 py-2.5 text-amber-800 text-xs mb-4">
        <AlertTriangle className="size-3.5 shrink-0 mt-0.5" />
        Edit fields inline below. Empty cells indicate missing required data.
      </div>

      <div className="rounded-xl border border-border overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-muted/30 border-b border-border">
              <th className="text-left px-3 py-2.5 text-xs font-medium text-muted-foreground">Member No</th>
              <th className="text-left px-3 py-2.5 text-xs font-medium text-muted-foreground">Name</th>
              <th className="text-left px-3 py-2.5 text-xs font-medium text-muted-foreground">Date of Birth</th>
              <th className="text-left px-3 py-2.5 text-xs font-medium text-muted-foreground">Grade</th>
              <th className="text-left px-3 py-2.5 text-xs font-medium text-muted-foreground">Salary</th>
            </tr>
          </thead>
          <tbody>
            {errorMembers.map((m) => {
              const edit = edits[m.memberNumber] ?? {};
              return (
                <tr key={m.memberNumber} className="border-b border-border/30 last:border-0">
                  <td className="px-3 py-2 font-mono text-xs text-muted-foreground">{m.memberNumber}</td>
                  <td className="px-3 py-2">{m.name}</td>
                  <td className="px-3 py-2">
                    <Input
                      type="date"
                      defaultValue={edit.dateOfBirth ?? m.dateOfBirth}
                      className={`h-7 text-xs w-36 ${!m.dateOfBirth ? 'border-destructive' : ''}`}
                      onChange={(e) => setField(m.memberNumber, 'dateOfBirth', e.target.value)}
                    />
                  </td>
                  <td className="px-3 py-2">
                    <Input
                      defaultValue={edit.grade ?? m.grade}
                      className={`h-7 text-xs w-24 ${!m.grade ? 'border-destructive' : ''}`}
                      onChange={(e) => setField(m.memberNumber, 'grade', e.target.value)}
                    />
                  </td>
                  <td className="px-3 py-2">
                    <Input
                      type="number"
                      defaultValue={edit.salary ?? m.salary}
                      className={`h-7 text-xs w-28 ${!m.salary ? 'border-destructive' : ''}`}
                      onChange={(e) => setField(m.memberNumber, 'salary', Number(e.target.value))}
                    />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {error && <p className="mt-3 text-xs text-destructive">{error}</p>}

      <div className="flex items-center gap-2 mt-5 pt-4 border-t border-border/40">
        <Button variant="outline" size="sm"
          onClick={() => router.push(`/rfqs/${rfqId}/census-workbench`)} disabled={saving}>
          Cancel
        </Button>
        <Button size="sm" onClick={handleSave}
          disabled={saving || Object.keys(edits).length === 0} className="gap-1.5">
          {saving && <Loader2 className="size-3.5 animate-spin" />}
          Save repairs
        </Button>
      </div>
    </div>
  );
}
