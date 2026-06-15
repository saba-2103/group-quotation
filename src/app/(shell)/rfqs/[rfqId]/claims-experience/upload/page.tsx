'use client';

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { FileSpreadsheet, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useRfqBundle } from '@/context/RfqBundleContext';
import { updateClaimsExperience } from '@/lib/api/quotation-client';
import type { ClaimsYear } from '@/lib/types';

function parseClaimsCSV(text: string): ClaimsYear[] {
  const lines = text.split('\n').filter((l) => l.trim());
  // Skip header row if it looks like one
  const dataLines = lines[0]?.match(/^\d/) ? lines : lines.slice(1);
  return dataLines.map((line) => {
    const [year, lives, premium, claims] = line.split(',').map((c) => Number(c.trim()));
    const lossRatio = premium > 0 ? Math.round((claims / premium) * 1000) / 1000 : 0;
    return { year: year || 0, lives: lives || 0, premium: premium || 0, claims: claims || 0, lossRatio };
  }).filter((r) => r.year > 1900);
}

export default function ClaimsUploadPage() {
  const { bundle, updateBundle } = useRfqBundle();
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  if (!bundle) return null;

  const rfqId = bundle.rfqId;
  const [fileName, setFileName] = useState<string | null>(null);
  const [preview, setPreview] = useState<ClaimsYear[] | null>(null);
  const [importing, setImporting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFile = (file: File) => {
    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = (e.target?.result as string) ?? '';
      setPreview(parseClaimsCSV(text));
    };
    reader.readAsText(file);
  };

  const handleImport = async () => {
    if (!preview) return;
    setImporting(true);
    setError(null);
    try {
      const existing = bundle.claimsExperience;
      const updated = await updateClaimsExperience(rfqId, {
        years: preview,
        largeLosses: existing?.largeLosses ?? [],
      });
      updateBundle({ claimsExperience: updated });
      router.push(`/rfqs/${rfqId}/claims-experience`);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Import failed');
      setImporting(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto px-6 py-5">
      <h1 className="text-base font-semibold mb-1">Upload Claims File</h1>
      <p className="text-xs text-muted-foreground mb-4">
        Expected CSV columns: <span className="font-mono text-[10px]">year, lives, premium, claims</span>
      </p>

      <div
        className="flex flex-col items-center gap-3 rounded-lg border-2 border-dashed border-border p-8 cursor-pointer hover:border-primary/40 hover:bg-muted/20 transition-colors mb-4"
        onClick={() => fileRef.current?.click()}
      >
        <FileSpreadsheet className="size-8 text-muted-foreground/50" />
        <p className="text-sm text-muted-foreground">
          {fileName ?? 'Click to upload .csv or .xlsx'}
        </p>
        <input ref={fileRef} type="file" accept=".csv,.xlsx" className="hidden"
          onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }} />
      </div>

      {preview && preview.length > 0 && (
        <div className="mb-4">
          <p className="text-xs text-muted-foreground mb-2">{preview.length} year row{preview.length !== 1 ? 's' : ''} detected</p>
          <div className="rounded-lg border border-border overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-muted/30 border-b border-border">
                  {['Year', 'Lives', 'Premium (₹)', 'Claims (₹)', 'Loss Ratio'].map((h) => (
                    <th key={h} className="text-left px-3 py-2 text-xs font-medium text-muted-foreground">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {preview.map((r) => (
                  <tr key={r.year} className="border-b border-border/30 last:border-0">
                    <td className="px-3 py-2">{r.year}</td>
                    <td className="px-3 py-2 tabular-nums">{r.lives.toLocaleString()}</td>
                    <td className="px-3 py-2 tabular-nums">₹{r.premium.toLocaleString()}</td>
                    <td className="px-3 py-2 tabular-nums">₹{r.claims.toLocaleString()}</td>
                    <td className="px-3 py-2 tabular-nums">{(r.lossRatio * 100).toFixed(1)}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {error && <p className="mb-3 text-xs text-destructive">{error}</p>}

      <div className="flex items-center gap-2">
        <Button variant="outline" size="sm"
          onClick={() => router.push(`/rfqs/${rfqId}/claims-experience`)} disabled={importing}>
          Cancel
        </Button>
        {preview && preview.length > 0 && (
          <Button size="sm" onClick={handleImport} disabled={importing} className="gap-1.5">
            {importing && <Loader2 className="size-3.5 animate-spin" />}
            Import {preview.length} year{preview.length !== 1 ? 's' : ''}
          </Button>
        )}
      </div>
    </div>
  );
}
