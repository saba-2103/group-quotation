'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Trash2, Upload, AlertTriangle, Loader2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useRfqBundle } from '@/context/RfqBundleContext';
import { updateClaimsExperience } from '@/lib/api/quotation-client';
import type { ClaimsYear, LargeLoss } from '@/lib/types';

export default function ClaimsExperiencePage() {
  const { bundle, updateBundle } = useRfqBundle();
  const router = useRouter();
  if (!bundle) return null;

  const rfqId = bundle.rfqId;
  const exp = bundle.claimsExperience;

  const [years, setYears] = useState<ClaimsYear[]>(exp?.years ?? []);
  const [largeLosses] = useState<LargeLoss[]>(exp?.largeLosses ?? []);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const addYear = () =>
    setYears((y) => [...y, { year: new Date().getFullYear(), lives: 0, premium: 0, claims: 0, lossRatio: 0 }]);

  const removeYear = (i: number) => setYears((y) => y.filter((_, idx) => idx !== i));

  const setYearField = <K extends keyof ClaimsYear>(i: number, k: K, v: ClaimsYear[K]) =>
    setYears((y) => y.map((r, idx) => {
      if (idx !== i) return r;
      const updated = { ...r, [k]: v };
      // auto-compute loss ratio
      if ((k === 'claims' || k === 'premium') && updated.premium > 0)
        updated.lossRatio = Math.round((updated.claims / updated.premium) * 1000) / 1000;
      return updated;
    }));

  const handleSave = async () => {
    setSaving(true);
    setSaveError(null);
    try {
      const updated = await updateClaimsExperience(rfqId, { years, largeLosses });
      updateBundle({ claimsExperience: updated });
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-6 py-5">
      <div className="flex items-start justify-between mb-5">
        <div>
          <h1 className="text-base font-semibold">Claims Experience</h1>
          <p className="text-xs text-muted-foreground mt-0.5">Step 7 of 21 · Population</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="gap-1.5"
            onClick={() => router.push(`/rfqs/${rfqId}/claims-experience/upload`)}>
            <Upload className="size-3.5" /> Upload claims file
          </Button>
          <Button size="sm" className="gap-1.5"
            onClick={() => router.push(`/rfqs/${rfqId}/claims-experience/large-losses/new`)}>
            <Plus className="size-3.5" /> Add large loss
          </Button>
        </div>
      </div>

      {/* Claims years */}
      <div className="rounded-xl border border-border overflow-hidden mb-5">
        <div className="flex items-center justify-between px-4 py-2.5 bg-muted/30 border-b border-border">
          <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Claims Years</span>
          <Button variant="ghost" size="sm" className="h-7 gap-1.5 text-xs" onClick={addYear}>
            <Plus className="size-3" /> Add year
          </Button>
        </div>
        {years.length === 0 ? (
          <div className="py-8 text-center text-xs text-muted-foreground">No claims years added</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  {['Year', 'Lives (at risk)', 'Premium (₹)', 'Claims (₹)', 'Loss Ratio (%)', ''].map((h) => (
                    <th key={h} className="text-left px-3 py-2 text-xs font-medium text-muted-foreground">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {years.map((row, i) => (
                  <tr key={i} className="border-b border-border/30 last:border-0">
                    <td className="px-3 py-2">
                      <Input type="number" value={row.year || ''}
                        onChange={(e) => setYearField(i, 'year', Number(e.target.value))}
                        className="h-7 text-xs w-20" />
                    </td>
                    <td className="px-3 py-2">
                      <Input type="number" min="0" value={row.lives || ''}
                        onChange={(e) => setYearField(i, 'lives', Number(e.target.value))}
                        className="h-7 text-xs w-24" />
                    </td>
                    <td className="px-3 py-2">
                      <Input type="number" min="0" value={row.premium || ''}
                        onChange={(e) => setYearField(i, 'premium', Number(e.target.value))}
                        className="h-7 text-xs w-28" />
                    </td>
                    <td className="px-3 py-2">
                      <Input type="number" min="0" value={row.claims || ''}
                        onChange={(e) => setYearField(i, 'claims', Number(e.target.value))}
                        className="h-7 text-xs w-28" />
                    </td>
                    <td className="px-3 py-2 tabular-nums text-muted-foreground text-xs">
                      {(row.lossRatio * 100).toFixed(1)}%
                    </td>
                    <td className="px-3 py-2">
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive"
                        onClick={() => removeYear(i)}>
                        <Trash2 className="size-3.5" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Large losses */}
      <div className="rounded-xl border border-border overflow-hidden mb-5">
        <div className="flex items-center justify-between px-4 py-2.5 bg-muted/30 border-b border-border">
          <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Large Losses</span>
        </div>
        {largeLosses.length === 0 ? (
          <div className="py-8 text-center text-xs text-muted-foreground">No large losses recorded</div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                {['Year', 'Amount (₹)', 'Cause', 'Note', 'Actions'].map((h) => (
                  <th key={h} className="text-left px-3 py-2 text-xs font-medium text-muted-foreground">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {largeLosses.map((ll) => (
                <tr key={ll.id} className="border-b border-border/30 last:border-0">
                  <td className="px-3 py-3">{ll.year}</td>
                  <td className="px-3 py-3 tabular-nums">₹{ll.amount.toLocaleString()}</td>
                  <td className="px-3 py-3">{ll.cause}</td>
                  <td className="px-3 py-3 text-muted-foreground">{ll.note ?? '—'}</td>
                  <td className="px-3 py-3">
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive"
                      onClick={async () => {
                        const updated = { ...exp, rfqId, years, largeLosses: largeLosses.filter((l) => l.id !== ll.id) };
                        const res = await updateClaimsExperience(rfqId, updated);
                        updateBundle({ claimsExperience: res });
                      }}>
                      <Trash2 className="size-3.5" />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {saveError && (
        <div className="flex items-center gap-2 mb-3 text-xs text-destructive">
          <AlertTriangle className="size-3.5" />{saveError}
        </div>
      )}

      <div className="flex justify-end pt-4 border-t border-border/40">
        <Button size="sm" onClick={handleSave} disabled={saving} className="gap-1.5">
          {saving && <Loader2 className="size-3.5 animate-spin" />}
          Save claims data
        </Button>
      </div>
    </div>
  );
}
