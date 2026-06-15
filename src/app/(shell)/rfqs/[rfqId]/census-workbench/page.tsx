'use client';

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import {
  Upload, CheckCircle2, AlertTriangle, XCircle,
  Loader2, Wrench, FileSpreadsheet,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useRfqBundle } from '@/context/RfqBundleContext';
import { updateCensusSummary } from '@/lib/api/quotation-client';
import { CensusQuality } from '@/lib/types';

interface ParsedPreview {
  headers: string[];
  rows: string[][];
  errorCount: number;
}

function qualityColor(q: CensusQuality) {
  if (q === CensusQuality.G) return 'text-green-700 bg-green-50 border-green-200';
  if (q === CensusQuality.A) return 'text-amber-700 bg-amber-50 border-amber-200';
  return 'text-destructive bg-destructive/5 border-destructive/20';
}

function qualityLabel(q: CensusQuality) {
  if (q === CensusQuality.G) return 'Good';
  if (q === CensusQuality.A) return 'Average';
  return 'Poor';
}

function qualityIcon(q: CensusQuality) {
  if (q === CensusQuality.G) return <CheckCircle2 className="size-4" />;
  if (q === CensusQuality.A) return <AlertTriangle className="size-4" />;
  return <XCircle className="size-4" />;
}

export default function CensusWorkbenchPage() {
  const { bundle, updateBundle } = useRfqBundle();
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);

  const [preview, setPreview] = useState<ParsedPreview | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [accepting, setAccepting] = useState(false);
  const [acceptError, setAcceptError] = useState<string | null>(null);

  if (!bundle) return null;
  const rfqId = bundle.rfqId;
  const quality = bundle.censusSummary;

  const parseFile = (file: File) => {
    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = (e.target?.result as string) ?? '';
      const lines = text.split('\n').filter((l) => l.trim());
      const headers = lines[0]?.split(',').map((h) => h.trim()) ?? [];
      const rows = lines.slice(1, 6).map((l) => l.split(',').map((c) => c.trim()));
      // Naive error count: rows missing grade or empty cells
      const errorCount = rows.filter((r) => r.some((c) => !c)).length;
      setPreview({ headers, rows, errorCount });
    };
    reader.readAsText(file);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) parseFile(file);
  };

  const handleAccept = async () => {
    setAccepting(true);
    setAcceptError(null);
    try {
      const totalLives = bundle.members.length || (preview?.rows.length ?? 0);
      const patch = {
        totalLives,
        quality: { trafficLight: CensusQuality.G },
      };
      await updateCensusSummary(rfqId, patch);
      updateBundle({ censusSummary: patch });
    } catch (e) {
      setAcceptError(e instanceof Error ? e.message : 'Failed to accept');
    } finally {
      setAccepting(false);
    }
  };

  const canAccept = quality &&
    (quality.quality.trafficLight === CensusQuality.G ||
     quality.quality.trafficLight === CensusQuality.A);

  return (
    <div className="max-w-3xl mx-auto px-6 py-5">
      <div className="mb-5">
        <h1 className="text-base font-semibold">Census Workbench</h1>
        <p className="text-xs text-muted-foreground mt-0.5">Step 4 of 21 · Population</p>
      </div>

      {/* Upload panel */}
      <div className="rounded-xl border border-border bg-card p-5 mb-4">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
          Upload Census File
        </h2>
        <div
          className="flex flex-col items-center justify-center gap-3 rounded-lg border-2 border-dashed border-border p-8 cursor-pointer hover:border-primary/40 hover:bg-muted/20 transition-colors"
          onClick={() => fileRef.current?.click()}
        >
          <FileSpreadsheet className="size-8 text-muted-foreground/50" />
          <p className="text-sm text-muted-foreground">
            {fileName ? fileName : 'Click to upload .csv or .xlsx'}
          </p>
          <input
            ref={fileRef}
            type="file"
            accept=".csv,.xlsx"
            className="hidden"
            onChange={handleFileChange}
          />
        </div>

        {preview && (
          <div className="mt-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-medium">
                Detected columns ({preview.headers.length}):
                <span className="text-muted-foreground font-normal ml-1">
                  {preview.headers.join(', ')}
                </span>
              </p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => router.push(`/rfqs/${rfqId}/census-workbench/mapping`)}
              >
                Map columns
              </Button>
            </div>
            <div className="overflow-x-auto rounded-md border border-border">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-muted/30 border-b border-border">
                    {preview.headers.map((h) => (
                      <th key={h} className="px-3 py-2 text-left font-medium text-muted-foreground">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {preview.rows.map((row, i) => (
                    <tr key={i} className="border-b border-border/30 last:border-0">
                      {row.map((cell, j) => (
                        <td key={j} className={`px-3 py-2 ${!cell ? 'text-destructive' : ''}`}>
                          {cell || '(empty)'}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="text-[10px] text-muted-foreground mt-1.5">Showing first 5 rows</p>
          </div>
        )}
      </div>

      {/* Quality summary */}
      {quality && (
        <div className="rounded-xl border border-border bg-card p-5">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
            Census Quality
          </h2>
          <div className={`flex items-center gap-3 rounded-lg border px-4 py-3 mb-4 ${qualityColor(quality.quality.trafficLight)}`}>
            {qualityIcon(quality.quality.trafficLight)}
            <div>
              <p className="text-sm font-semibold">
                {qualityLabel(quality.quality.trafficLight)} quality
              </p>
              <p className="text-xs opacity-80">{quality.totalLives.toLocaleString()} lives loaded</p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {quality.quality.trafficLight === CensusQuality.R && (
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5"
                onClick={() => router.push(`/rfqs/${rfqId}/census-workbench/bulk-repair`)}
              >
                <Wrench className="size-3.5" /> Bulk repair
              </Button>
            )}
            <Button
              size="sm"
              disabled={!canAccept || accepting}
              className="gap-1.5"
              onClick={handleAccept}
            >
              {accepting
                ? <Loader2 className="size-3.5 animate-spin" />
                : <CheckCircle2 className="size-3.5" />}
              Accept census
            </Button>
          </div>
          {acceptError && <p className="mt-2 text-xs text-destructive">{acceptError}</p>}
        </div>
      )}

      {/* Upload prompt if no quality yet */}
      {!quality && (
        <div className="flex flex-col items-center gap-2 py-8 text-muted-foreground">
          <Upload className="size-6 opacity-30" />
          <p className="text-xs">Upload a file above to see quality summary</p>
        </div>
      )}
    </div>
  );
}
