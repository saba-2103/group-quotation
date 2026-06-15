'use client';

import { useState, useCallback } from 'react';
import { Plus, Trash2, Info, Loader2, Check } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useRfqBundle } from '@/context/RfqBundleContext';
import { updateHeadcount } from '@/lib/api/quotation-client';
import type { GradeRow } from '@/lib/types';

type SaveState = 'idle' | 'saving' | 'saved' | 'error';

export default function HeadcountPage() {
  const { bundle, updateBundle } = useRfqBundle();
  if (!bundle) return null;

  const rfqId = bundle.rfqId;
  const hasRoster = bundle.members.length > 0;
  const init = bundle.headcountData;

  const [totalLives, setTotalLives] = useState<string>(init?.totalLives?.toString() ?? '');
  const [grades, setGrades] = useState<GradeRow[]>(init?.grades ?? []);
  const [saveState, setSaveState] = useState<SaveState>('idle');
  const [saveError, setSaveError] = useState<string | null>(null);

  const addGrade = () =>
    setGrades((g) => [...g, { grade: '', lives: 0, avgSalary: 0, avgSumAssured: 0 }]);

  const removeGrade = (i: number) => setGrades((g) => g.filter((_, idx) => idx !== i));

  const setGradeField = <K extends keyof GradeRow>(i: number, key: K, value: GradeRow[K]) =>
    setGrades((g) => g.map((r, idx) => (idx === i ? { ...r, [key]: value } : r)));

  const save = useCallback(async () => {
    setSaveState('saving');
    setSaveError(null);
    try {
      const data = { totalLives: Number(totalLives), grades };
      const updated = await updateHeadcount(rfqId, data);
      updateBundle({ headcountData: updated.headcountData });
      setSaveState('saved');
      setTimeout(() => setSaveState('idle'), 1500);
    } catch (e) {
      setSaveState('error');
      setSaveError(e instanceof Error ? e.message : 'Save failed');
    }
  }, [rfqId, totalLives, grades, updateBundle]);

  return (
    <div className="max-w-3xl mx-auto px-6 py-5">
      <div className="mb-4">
        <h1 className="text-base font-semibold">Headcount</h1>
        <p className="text-xs text-muted-foreground mt-0.5">Step 6 of 21 · Population</p>
      </div>

      {/* Context notices */}
      {hasRoster ? (
        <div className="flex items-start gap-2 rounded-lg bg-blue-50 border border-blue-200 px-3 py-2.5 text-blue-800 text-xs mb-4">
          <Info className="size-3.5 shrink-0 mt-0.5" />
          A member roster is loaded — this headcount is supplementary and will be used as a fallback.
        </div>
      ) : (
        <div className="flex items-start gap-2 rounded-lg bg-amber-50 border border-amber-200 px-3 py-2.5 text-amber-800 text-xs mb-4">
          <Info className="size-3.5 shrink-0 mt-0.5" />
          No per-member roster loaded. Enter aggregate headcount by grade — the Plans screen will use these figures for premium calculation.
        </div>
      )}

      {/* Total lives */}
      <div className="flex items-center gap-3 mb-5">
        <label className="text-xs font-medium w-36 shrink-0">Total expected lives<span className="text-destructive ml-0.5">*</span></label>
        <Input
          type="number"
          min="0"
          value={totalLives}
          onChange={(e) => setTotalLives(e.target.value)}
          className="text-sm w-36"
          placeholder="0"
        />
      </div>

      {/* Grade breakdown table */}
      <div className="rounded-xl border border-border overflow-hidden mb-4">
        <div className="flex items-center justify-between px-4 py-2.5 bg-muted/30 border-b border-border">
          <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Grade breakdown</span>
          <Button variant="ghost" size="sm" className="h-7 gap-1.5 text-xs" onClick={addGrade}>
            <Plus className="size-3" /> Add grade
          </Button>
        </div>
        {grades.length === 0 ? (
          <div className="py-8 text-center text-xs text-muted-foreground">
            No grades added yet. Click “Add grade” to start.
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                {['Grade', 'Lives', 'Avg Salary (₹)', 'Avg Sum Assured (₹)', ''].map((h) => (
                  <th key={h} className="text-left px-3 py-2 text-xs font-medium text-muted-foreground">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {grades.map((row, i) => (
                <tr key={i} className="border-b border-border/30 last:border-0">
                  <td className="px-3 py-2">
                    <Input
                      value={row.grade}
                      onChange={(e) => setGradeField(i, 'grade', e.target.value)}
                      className="h-7 text-xs w-20"
                      placeholder="G1"
                    />
                  </td>
                  <td className="px-3 py-2">
                    <Input
                      type="number" min="0"
                      value={row.lives || ''}
                      onChange={(e) => setGradeField(i, 'lives', Number(e.target.value))}
                      className="h-7 text-xs w-24"
                    />
                  </td>
                  <td className="px-3 py-2">
                    <Input
                      type="number" min="0"
                      value={row.avgSalary || ''}
                      onChange={(e) => setGradeField(i, 'avgSalary', Number(e.target.value))}
                      className="h-7 text-xs w-32"
                    />
                  </td>
                  <td className="px-3 py-2">
                    <Input
                      type="number" min="0"
                      value={row.avgSumAssured || ''}
                      onChange={(e) => setGradeField(i, 'avgSumAssured', Number(e.target.value))}
                      className="h-7 text-xs w-32"
                    />
                  </td>
                  <td className="px-3 py-2">
                    <Button
                      variant="ghost" size="icon"
                      className="h-7 w-7 text-destructive hover:text-destructive"
                      onClick={() => removeGrade(i)}
                    >
                      <Trash2 className="size-3.5" />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {saveError && <p className="text-xs text-destructive mb-2">{saveError}</p>}

      {/* Footer */}
      <div className="flex items-center gap-3 pt-4 border-t border-border/40">
        {saveState === 'saved' && (
          <span className="text-xs text-green-600 flex items-center gap-1">
            <Check className="size-3.5" /> Saved
          </span>
        )}
        <div className="ml-auto flex gap-2">
          <Button variant="outline" size="sm"
            onClick={() => { setTotalLives(init?.totalLives?.toString() ?? ''); setGrades(init?.grades ?? []); }}>
            Reset
          </Button>
          <Button size="sm" onClick={save} disabled={saveState === 'saving' || !totalLives} className="gap-1.5">
            {saveState === 'saving' && <Loader2 className="size-3.5 animate-spin" />}
            Save Changes
          </Button>
        </div>
      </div>
    </div>
  );
}
