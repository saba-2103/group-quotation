'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useRfqBundle } from '@/context/RfqBundleContext';
import { bulkImportMembers } from '@/lib/api/quotation-client';
import type { Member } from '@/lib/types';

// Expected columns (tab or comma delimited):
// name, dateOfBirth, gender, grade, salary, sumAssured

function parsePaste(text: string): Partial<Member>[] {
  const lines = text.trim().split('\n').filter((l) => l.trim());
  return lines.map((line) => {
    const cells = line.split(/[\t,]/).map((c) => c.trim());
    return {
      name: cells[0],
      dateOfBirth: cells[1],
      gender: cells[2] || 'M',
      grade: cells[3],
      salary: cells[4] ? Number(cells[4]) : 0,
      sumAssured: cells[5] ? Number(cells[5]) : 0,
    };
  });
}

export default function PasteMembersPage() {
  const { bundle, updateBundle } = useRfqBundle();
  const router = useRouter();
  if (!bundle) return null;

  const rfqId = bundle.rfqId;
  const [text, setText] = useState('');
  const [preview, setPreview] = useState<Partial<Member>[] | null>(null);
  const [importing, setImporting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handlePreview = () => {
    const parsed = parsePaste(text);
    setPreview(parsed);
  };

  const handleImport = async () => {
    if (!preview) return;
    setImporting(true);
    setError(null);
    try {
      const result = await bulkImportMembers(rfqId, preview);
      // Optimistically add parsed members to context (memberNumbers assigned by server)
      const newMembers = preview.map((m, i) => ({
        ...m,
        memberNumber: `MBR-PASTE-${String(i + 1).padStart(3, '0')}`,
        rfqId,
        name: m.name ?? '',
        dateOfBirth: m.dateOfBirth ?? '',
        gender: m.gender ?? 'M',
        grade: m.grade ?? '',
        salary: m.salary ?? 0,
        sumAssured: m.sumAssured ?? 0,
        coverages: [] as never[],
      })) as Member[];
      updateBundle({ members: [...bundle.members, ...newMembers] });
      void result;
      router.push(`/rfqs/${rfqId}/members`);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Import failed');
      setImporting(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto px-6 py-5">
      <h1 className="text-base font-semibold mb-1">Paste Members</h1>
      <p className="text-xs text-muted-foreground mb-4">
        Paste tab- or comma-delimited data. Expected columns:
        <span className="font-mono text-[10px] ml-1">name, dateOfBirth, gender, grade, salary, sumAssured</span>
      </p>

      <Textarea
        value={text}
        onChange={(e) => { setText(e.target.value); setPreview(null); }}
        placeholder="John Doe\t1980-01-01\tM\tG1\t800000\t1600000"
        className="font-mono text-xs min-h-[120px] mb-3"
      />

      <Button variant="outline" size="sm" onClick={handlePreview} disabled={!text.trim()}>
        Preview
      </Button>

      {preview && (
        <div className="mt-4">
          <p className="text-xs text-muted-foreground mb-2">
            {preview.length} row{preview.length !== 1 ? 's' : ''} parsed (showing up to 10)
          </p>
          <div className="overflow-x-auto rounded-lg border border-border">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-muted/30 border-b border-border">
                  {['Name', 'DoB', 'Gender', 'Grade', 'Salary', 'Sum Assured'].map((h) => (
                    <th key={h} className="text-left px-3 py-2 font-medium text-muted-foreground">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {preview.slice(0, 10).map((m, i) => (
                  <tr key={i} className="border-b border-border/30 last:border-0">
                    <td className="px-3 py-2">{m.name || <span className="text-destructive">(empty)</span>}</td>
                    <td className="px-3 py-2">{m.dateOfBirth}</td>
                    <td className="px-3 py-2">{m.gender}</td>
                    <td className="px-3 py-2">{m.grade || <span className="text-destructive">(empty)</span>}</td>
                    <td className="px-3 py-2 tabular-nums">{m.salary?.toLocaleString()}</td>
                    <td className="px-3 py-2 tabular-nums">{m.sumAssured?.toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {error && <p className="mt-3 text-xs text-destructive">{error}</p>}

      <div className="flex items-center gap-2 mt-5 pt-4 border-t border-border/40">
        <Button variant="outline" size="sm"
          onClick={() => router.push(`/rfqs/${rfqId}/members`)} disabled={importing}>
          Cancel
        </Button>
        {preview && (
          <Button size="sm" onClick={handleImport} disabled={importing || preview.length === 0} className="gap-1.5">
            {importing && <Loader2 className="size-3.5 animate-spin" />}
            Import {preview.length} member{preview.length !== 1 ? 's' : ''}
          </Button>
        )}
      </div>
    </div>
  );
}
