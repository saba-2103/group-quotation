'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Lock, ArrowRight, CheckCircle2 } from 'lucide-react';
import { useRfqBundle } from '@/context/RfqBundleContext';
import { useRole } from '@/hooks/useRole';
import { computeFreezeState } from '@/lib/computations';
import { updateRfq } from '@/lib/api/quotation-client';
import { BusinessType, type PolicyDetails } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';

function FieldLabel({ children }: { children: React.ReactNode }) {
  return <label className="text-xs font-medium text-muted-foreground block mb-1">{children}</label>;
}

const EMPTY: PolicyDetails = {
  endorsementSchedule: '',
  reinsuranceMethod: 'NONE',
  specialTerms: '',
  renewalTerms: '',
  signingDate: '',
};

export default function PolicyDetailsPage() {
  const router = useRouter();
  const { bundle, refetch } = useRfqBundle();
  const { role } = useRole();

  const [form, setForm] = useState<PolicyDetails>(EMPTY);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (bundle?.policyDetails) {
      setForm({ ...EMPTY, ...bundle.policyDetails });
    }
  }, [bundle]);

  if (!bundle) return null;

  const { isFrozen } = computeFreezeState(bundle);
  if (!isFrozen) {
    return (
      <div className="p-8 max-w-lg mx-auto">
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-6 py-5 space-y-3">
          <div className="flex items-center gap-2 text-amber-800 font-semibold">
            <Lock className="size-4" /> Freeze required
          </div>
          <p className="text-sm text-amber-700">
            Freeze the broker-aligned version first to access policy details.
          </p>
          <Button
            variant="outline" size="sm"
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
  const isRenewal = bundle.businessType === BusinessType.RENEWAL;

  function patch(p: Partial<PolicyDetails>) {
    setForm((s) => ({ ...s, ...p }));
    setSaved(false);
  }

  async function handleSave() {
    setSaving(true);
    try {
      await updateRfq(rfqId, { policyDetails: form } as Parameters<typeof updateRfq>[1]);
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
          <h1 className="text-xl font-bold tracking-tight">Policy Details</h1>
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

      <div className="rounded-xl border border-border bg-card px-6 py-5 space-y-5">
        <div className="space-y-1">
          <FieldLabel>Endorsement Schedule</FieldLabel>
          <Textarea
            rows={4}
            value={form.endorsementSchedule ?? ''}
            disabled={!isSales}
            placeholder="List endorsements to be included…"
            onChange={(e) => patch({ endorsementSchedule: e.target.value })}
          />
        </div>

        <div className="space-y-1">
          <FieldLabel>Reinsurance Method</FieldLabel>
          <select
            className="w-full text-sm border border-border rounded-lg px-3 py-2 bg-background focus:outline-none focus:ring-1 focus:ring-primary/30 disabled:opacity-50 disabled:cursor-not-allowed"
            value={form.reinsuranceMethod ?? 'NONE'}
            disabled={!isSales}
            onChange={(e) => patch({ reinsuranceMethod: e.target.value as PolicyDetails['reinsuranceMethod'] })}
          >
            {['NONE', 'PROPORTIONAL', 'NON_PROPORTIONAL'].map((m) => (
              <option key={m} value={m}>{m.replace(/_/g, ' ')}</option>
            ))}
          </select>
        </div>

        <div className="space-y-1">
          <FieldLabel>Special Terms</FieldLabel>
          <Textarea
            rows={3}
            value={form.specialTerms ?? ''}
            disabled={!isSales}
            placeholder="Any negotiated special terms…"
            onChange={(e) => patch({ specialTerms: e.target.value })}
          />
        </div>

        {isRenewal && (
          <div className="space-y-1">
            <FieldLabel>Renewal Terms</FieldLabel>
            <Textarea
              rows={3}
              value={form.renewalTerms ?? ''}
              disabled={!isSales}
              placeholder="Applicable renewal terms…"
              onChange={(e) => patch({ renewalTerms: e.target.value })}
            />
          </div>
        )}

        <div className="space-y-1">
          <FieldLabel>Signing Date</FieldLabel>
          <Input
            type="date"
            value={form.signingDate ?? ''}
            disabled={!isSales}
            onChange={(e) => patch({ signingDate: e.target.value })}
          />
        </div>

        {!isSales && (
          <p className="text-[11px] text-muted-foreground italic">
            Read-only — only SALES can edit policy details.
          </p>
        )}
      </div>
    </div>
  );
}
