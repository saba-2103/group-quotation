'use client';

import { useState, use } from 'react';
import { useRouter } from 'next/navigation';
import { Pencil, Check, X, Loader2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { useRfqBundle } from '@/context/RfqBundleContext';
import { updateMember } from '@/lib/api/quotation-client';

export default function MemberMasterPage({ params }: { params: Promise<{ memberNumber: string }> }) {
  const { memberNumber } = use(params);
  const { bundle, updateBundle } = useRfqBundle();
  const router = useRouter();
  if (!bundle) return null;

  const rfqId = bundle.rfqId;
  const member = bundle.members.find((m) => m.memberNumber === memberNumber);

  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState({
    name: member?.name ?? '',
    grade: member?.grade ?? '',
    salary: member?.salary?.toString() ?? '',
    sumAssured: member?.sumAssured?.toString() ?? '',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!member) {
    return (
      <div className="flex flex-col items-center justify-center h-48 gap-3 text-muted-foreground text-sm">
        Member not found.
        <Button variant="outline" size="sm" onClick={() => router.push(`/rfqs/${rfqId}/members`)}>Back</Button>
      </div>
    );
  }

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    try {
      const updated = await updateMember(rfqId, memberNumber, {
        name: draft.name,
        grade: draft.grade,
        salary: Number(draft.salary),
        sumAssured: Number(draft.sumAssured),
      });
      updateBundle({
        members: bundle.members.map((m) => m.memberNumber === memberNumber ? updated : m),
      });
      setEditing(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  const Row = ({ label, value }: { label: string; value: string }) => (
    <div className="flex justify-between py-2 border-b border-border/30 last:border-0 text-sm">
      <span className="text-xs text-muted-foreground w-36 shrink-0">{label}</span>
      <span className="font-medium text-xs text-right">{value || '—'}</span>
    </div>
  );

  return (
    <div className="max-w-xl mx-auto px-6 py-5">
      <div className="flex items-start justify-between mb-5">
        <div>
          <h1 className="text-base font-semibold">{member.name}</h1>
          <p className="text-xs text-muted-foreground mt-0.5">{member.memberNumber} · {bundle.employerName}</p>
        </div>
        {!editing && (
          <Button variant="outline" size="sm" className="gap-1.5" onClick={() => setEditing(true)}>
            <Pencil className="size-3.5" /> Edit
          </Button>
        )}
      </div>

      <div className="rounded-xl border border-border bg-card px-4 py-2 mb-4">
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mt-2 mb-1">Identity</p>
        {editing ? (
          <div className="grid grid-cols-1 gap-3 pb-3">
            <div className="flex flex-col gap-1.5">
              <Label className="text-xs">Name</Label>
              <Input value={draft.name} onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))} className="text-sm" />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label className="text-xs">Grade</Label>
              <Input value={draft.grade} onChange={(e) => setDraft((d) => ({ ...d, grade: e.target.value }))} className="text-sm" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <Label className="text-xs">Salary (₹)</Label>
                <Input type="number" value={draft.salary} onChange={(e) => setDraft((d) => ({ ...d, salary: e.target.value }))} className="text-sm" />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label className="text-xs">Sum assured (₹)</Label>
                <Input type="number" value={draft.sumAssured} onChange={(e) => setDraft((d) => ({ ...d, sumAssured: e.target.value }))} className="text-sm" />
              </div>
            </div>
          </div>
        ) : (
          <>
            <Row label="Member No" value={member.memberNumber} />
            <Row label="RFQ" value={member.rfqId} />
            <Row label="Status" value="Active" />
            <Row label="Date of birth" value={member.dateOfBirth} />
            <Row label="Gender" value={member.gender} />
            <Row label="Grade" value={member.grade} />
            <Row label="Salary" value={member.salary > 0 ? `₹${member.salary.toLocaleString()}` : '—'} />
            <Row label="Sum assured" value={member.sumAssured > 0 ? `₹${member.sumAssured.toLocaleString()}` : '—'} />
            <Row label="Coverages" value={member.coverages.length.toString()} />
            <Row label="Open referrals" value="None" />
          </>
        )}
      </div>

      {error && <p className="mb-3 text-xs text-destructive">{error}</p>}

      {editing && (
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="gap-1.5"
            onClick={() => setEditing(false)} disabled={saving}>
            <X className="size-3.5" /> Cancel
          </Button>
          <Button size="sm" className="gap-1.5" onClick={handleSave} disabled={saving}>
            {saving ? <Loader2 className="size-3.5 animate-spin" /> : <Check className="size-3.5" />}
            Save
          </Button>
        </div>
      )}

      {!editing && (
        <Button variant="outline" size="sm" onClick={() => router.push(`/rfqs/${rfqId}/members`)}>
          ← Back to members
        </Button>
      )}
    </div>
  );
}
