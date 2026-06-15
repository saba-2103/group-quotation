'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Lock, ArrowRight, CheckCircle2 } from 'lucide-react';
import { useRfqBundle } from '@/context/RfqBundleContext';
import { useRole } from '@/hooks/useRole';
import { computeFreezeState } from '@/lib/computations';
import { updateRfq } from '@/lib/api/quotation-client';
import { type PolicyConfig } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function FieldLabel({ children }: { children: React.ReactNode }) {
  return <label className="text-xs font-medium text-muted-foreground block mb-1">{children}</label>;
}

function SectionHeading({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground border-b border-border/40 pb-1.5 mb-3">
      {children}
    </h2>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function PolicyConfigPage() {
  const router = useRouter();
  const { bundle, refetch } = useRfqBundle();
  const { role } = useRole();

  const [form, setForm] = useState<PolicyConfig | null>(null);
  const [multiCurrency, setMultiCurrency] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (bundle) {
      setForm({ ...bundle.policyConfig });
    }
  }, [bundle]);

  if (!bundle || !form) return null;

  const { isFrozen } = computeFreezeState(bundle);
  if (!isFrozen) {
    return (
      <div className="p-8 max-w-lg mx-auto">
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-6 py-5 space-y-3">
          <div className="flex items-center gap-2 text-amber-800 font-semibold">
            <Lock className="size-4" /> Freeze required
          </div>
          <p className="text-sm text-amber-700">
            Freeze the broker-aligned version first to access policy configuration.
          </p>
          <Button
            variant="outline"
            size="sm"
            className="border-amber-300 text-amber-800 hover:bg-amber-100"
            onClick={() => router.push(`/rfqs/${bundle.rfqId}/versions`)}
          >
            Go to Versions <ArrowRight className="size-3.5 ml-1" />
          </Button>
        </div>
      </div>
    );
  }

  const isSales = role === 'SALES';
  const rfqId = bundle.rfqId;

  function patch(p: Partial<PolicyConfig>) {
    setForm((s) => s ? ({ ...s, ...p }) : s);
    setSaved(false);
  }

  async function handleSave() {
    if (!form) return;
    setSaving(true);
    try {
      await updateRfq(rfqId, { policyConfig: form });
      await refetch();
      setSaved(true);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex flex-col gap-6 p-6 max-w-[720px] mx-auto">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight">Policy Config</h1>
          <p className="text-sm text-muted-foreground mt-0.5">{bundle.employerName}</p>
        </div>
        <div className="flex items-center gap-2">
          {saved && (
            <span className="text-xs text-green-600 flex items-center gap-1">
              <CheckCircle2 className="size-3.5" /> Saved
            </span>
          )}
          {isSales && (
            <Button size="sm" disabled={saving} onClick={handleSave}>
              {saving ? 'Saving…' : 'Save'}
            </Button>
          )}
        </div>
      </div>

      <div className="rounded-xl border border-border bg-card px-6 py-5 space-y-6">
        {/* Policy Period */}
        <div>
          <SectionHeading>Policy Period</SectionHeading>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <FieldLabel>Policy Year Start</FieldLabel>
              <Input
                type="date"
                value={form.policyYearStart ?? ''}
                disabled={!isSales}
                onChange={(e) => patch({ policyYearStart: e.target.value })}
              />
            </div>
            <div className="space-y-1">
              <FieldLabel>Policy Year End</FieldLabel>
              <Input
                type="date"
                value={form.policyYearEnd ?? ''}
                disabled={!isSales}
                onChange={(e) => patch({ policyYearEnd: e.target.value })}
              />
            </div>
          </div>
        </div>

        {/* Billing & Collection */}
        <div>
          <SectionHeading>Billing &amp; Collection</SectionHeading>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <FieldLabel>Billing Frequency</FieldLabel>
              <select
                className="w-full text-sm border border-border rounded-lg px-3 py-2 bg-background focus:outline-none focus:ring-1 focus:ring-primary/30 disabled:opacity-50 disabled:cursor-not-allowed"
                value={form.billingFrequency}
                disabled={!isSales}
                onChange={(e) => patch({ billingFrequency: e.target.value })}
              >
                {['MONTHLY', 'QUARTERLY', 'HALF_YEARLY', 'ANNUAL'].map((f) => (
                  <option key={f} value={f}>{f.replace(/_/g, ' ')}</option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <FieldLabel>Collection Method</FieldLabel>
              <select
                className="w-full text-sm border border-border rounded-lg px-3 py-2 bg-background focus:outline-none focus:ring-1 focus:ring-primary/30 disabled:opacity-50 disabled:cursor-not-allowed"
                value={form.collectionMethod}
                disabled={!isSales}
                onChange={(e) => patch({ collectionMethod: e.target.value })}
              >
                {['DIRECT', 'BROKER', 'BANCASSURANCE', 'ECS'].map((m) => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <FieldLabel>Grace Period (days)</FieldLabel>
              <Input
                type="number"
                value={form.gracePeriodDays}
                disabled={!isSales}
                onChange={(e) => patch({ gracePeriodDays: Number(e.target.value) })}
              />
            </div>
          </div>
        </div>

        {/* Structure */}
        <div>
          <SectionHeading>Structure</SectionHeading>
          <div className="space-y-3">
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={form.subsidiariesEnabled}
                disabled={!isSales}
                onChange={(e) => patch({ subsidiariesEnabled: e.target.checked })}
                className="size-4 rounded border-border accent-primary"
              />
              <span className="text-sm">Subsidiaries enabled</span>
              <span className="text-[11px] text-muted-foreground">(makes the subsidiaries step required)</span>
            </label>
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={multiCurrency}
                disabled={!isSales}
                onChange={(e) => setMultiCurrency(e.target.checked)}
                className="size-4 rounded border-border accent-primary"
              />
              <span className="text-sm">Multi-currency</span>
              <span className="text-[11px] text-muted-foreground">(optional)</span>
            </label>
          </div>
        </div>

        {!isSales && (
          <p className="text-[11px] text-muted-foreground italic">
            Read-only — only SALES can edit policy configuration.
          </p>
        )}
      </div>
    </div>
  );
}
