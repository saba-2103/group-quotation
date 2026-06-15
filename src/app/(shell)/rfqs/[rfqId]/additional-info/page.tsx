'use client';

import { useState } from 'react';
import { Check, Loader2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { useRfqBundle } from '@/context/RfqBundleContext';
import { updateRfq } from '@/lib/api/quotation-client';
import { MpCategory } from '@/lib/types';
import { CATEGORY_MAX_DISCOUNT, CATEGORY_UW_BAND, SEGMENT_LABELS } from '@/lib/constants';

// ─── Types ────────────────────────────────────────────────────────────────────

interface FormState {
  industry: string;
  mpCategory: MpCategory | '';
  employeeCount: string;
  annualPremium: string;
  appetiteNotes: string;
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function AdditionalInfoPage() {
  const { bundle, updateBundle } = useRfqBundle();
  if (!bundle) return null;

  const [form, setForm] = useState<FormState>({
    industry: bundle.industry ?? '',
    mpCategory: (bundle.mphAppetite?.category as MpCategory | undefined) ?? '',
    employeeCount: bundle.censusSummary?.totalLives?.toString() ?? '',
    annualPremium: '',
    appetiteNotes: bundle.mphAppetite?.preapprovedCardRef ?? '',
  });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const uwBand = form.mpCategory ? CATEGORY_UW_BAND[form.mpCategory] : '—';

  const handleSave = async () => {
    setSaving(true);
    setSaved(false);
    setError(null);
    try {
      const mphAppetite = form.mpCategory
        ? {
            category: form.mpCategory,
            maxDiscountPct: CATEGORY_MAX_DISCOUNT[form.mpCategory],
            uwAuthorityBand: CATEGORY_UW_BAND[form.mpCategory],
          }
        : bundle.mphAppetite;

      const patch = {
        industry: form.industry || undefined,
        mphAppetite,
      };

      const updated = await updateRfq(bundle.rfqId, patch);
      updateBundle({ ...updated, mphAppetite });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto px-6 py-5">
      <div className="mb-4">
        <h1 className="text-base font-semibold">Additional Info — MPH Categorisation</h1>
        <p className="text-xs text-muted-foreground mt-0.5">Step 2 of 21 · Intake</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Industry */}
        <div className="flex flex-col gap-1.5">
          <Label className="text-xs">Industry</Label>
          <Input
            value={form.industry}
            onChange={(e) => setForm((f) => ({ ...f, industry: e.target.value }))}
            placeholder="e.g. Manufacturing"
            className="text-sm"
          />
        </div>

        {/* MP Category */}
        <div className="flex flex-col gap-1.5">
          <Label className="text-xs">MP Category</Label>
          <Select
            value={form.mpCategory}
            onValueChange={(v) => setForm((f) => ({ ...f, mpCategory: v as MpCategory }))}
          >
            <SelectTrigger className="text-sm"><SelectValue placeholder="Select…" /></SelectTrigger>
            <SelectContent>
              {Object.values(MpCategory).map((cat) => (
                <SelectItem key={cat} value={cat}>{SEGMENT_LABELS[cat]}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Employee count */}
        <div className="flex flex-col gap-1.5">
          <Label className="text-xs">Employee count</Label>
          <Input
            type="number"
            value={form.employeeCount}
            onChange={(e) => setForm((f) => ({ ...f, employeeCount: e.target.value }))}
            placeholder="0"
            className="text-sm"
          />
        </div>

        {/* Annual premium */}
        <div className="flex flex-col gap-1.5">
          <Label className="text-xs">Expected annual premium (₹)</Label>
          <Input
            type="number"
            value={form.annualPremium}
            onChange={(e) => setForm((f) => ({ ...f, annualPremium: e.target.value }))}
            placeholder="Optional"
            className="text-sm"
          />
        </div>

        {/* UW Band — read-only derived */}
        <div className="flex flex-col gap-1.5">
          <Label className="text-xs">UW authority band</Label>
          <div className="flex h-9 items-center px-3 rounded-md border border-border bg-muted/30 text-sm text-muted-foreground">
            {uwBand}
          </div>
          <p className="text-[10px] text-muted-foreground">Derived from MP Category</p>
        </div>

        {/* Max discount */}
        {form.mpCategory && (
          <div className="flex flex-col gap-1.5">
            <Label className="text-xs">Max discount authority</Label>
            <div className="flex h-9 items-center px-3 rounded-md border border-border bg-muted/30 text-sm text-muted-foreground">
              {CATEGORY_MAX_DISCOUNT[form.mpCategory]}%
            </div>
            <p className="text-[10px] text-muted-foreground">Stamped onto mphAppetite on save</p>
          </div>
        )}

        {/* Appetite notes */}
        <div className="col-span-full flex flex-col gap-1.5">
          <Label className="text-xs">Appetite notes</Label>
          <Textarea
            value={form.appetiteNotes}
            onChange={(e) => setForm((f) => ({ ...f, appetiteNotes: e.target.value }))}
            placeholder="Optional notes on appetite or pre-approved card reference"
            className="text-sm min-h-[80px]"
          />
        </div>
      </div>

      {/* Current appetite stamp */}
      {bundle.mphAppetite && (
        <div className="mt-4 rounded-lg bg-muted/30 border border-border px-4 py-3 text-xs text-muted-foreground">
          <span className="font-medium text-foreground">Current appetite stamp: </span>
          Category {bundle.mphAppetite.category} · Max discount {bundle.mphAppetite.maxDiscountPct}% · Band {bundle.mphAppetite.uwAuthorityBand}
        </div>
      )}

      {error && (
        <p className="mt-3 text-xs text-destructive">{error}</p>
      )}

      <div className="flex items-center gap-2 mt-6 pt-4 border-t border-border/40">
        {saved && (
          <span className="text-xs text-green-600 flex items-center gap-1">
            <Check className="size-3.5" /> Saved — rule engine stamped mphAppetite
          </span>
        )}
        <div className="ml-auto flex gap-2">
          <Button
            size="sm"
            onClick={handleSave}
            disabled={saving || !form.mpCategory}
            className="gap-1.5"
          >
            {saving && <Loader2 className="size-3.5 animate-spin" />}
            Save
          </Button>
        </div>
      </div>
    </div>
  );
}

