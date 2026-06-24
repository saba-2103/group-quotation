'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronLeft, ChevronRight, Check, AlertCircle, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { createRfq } from '@/lib/api/quotation-client';
import {
  BusinessType, QuoteSegment, PricingBasis, PlanStructure,
  SumAssuredBasis, LobType, SchemeType, CoverPattern, LivesCovered, TermBasis,
} from '@/lib/types';

import { useRole } from '@/hooks/useRole';
import { canCreateRfq } from '@/lib/permissions';

// ─── Wizard state ─────────────────────────────────────────────────────────────

interface WizardState {
  // Step 1
  clientName: string;
  industry: string;
  quoteSegment: QuoteSegment | '';
  brokerName: string;
  intermediaryCode: string;
  channel: string;
  // Step 2
  businessType: BusinessType | '';
  priorInsurer: string;
  priorPremium: string;
  priorLossRatio: string;
  // Step 3
  effectiveDate: string;
  policyPeriodEnd: string;
  pricingBasis: PricingBasis | '';
  // Step 4
  planStructure: PlanStructure | '';
  sumAssuredBasis: SumAssuredBasis | '';
  gradeMapping: boolean;
  defaultPlanCount: string;
}

const INITIAL: WizardState = {
  clientName: '', industry: '', quoteSegment: '', brokerName: '', intermediaryCode: '', channel: '',
  businessType: '', priorInsurer: '', priorPremium: '', priorLossRatio: '',
  effectiveDate: '', policyPeriodEnd: '', pricingBasis: '',
  planStructure: '', sumAssuredBasis: '', gradeMapping: false, defaultPlanCount: '1',
};

// ─── Step indicator ───────────────────────────────────────────────────────────

const STEPS = ['Client & Segment', 'Business Type', 'Dates & Basis', 'Plan Structure', 'Confirm'];

function StepIndicator({ current }: { current: number }) {
  return (
    <div className="flex items-center gap-0 shrink-0">
      {STEPS.map((label, idx) => {
        const done = idx < current;
        const active = idx === current;
        return (
          <div key={idx} className="flex items-center">
            <div className="flex flex-col items-center gap-1">
              <div className={`flex h-7 w-7 items-center justify-center rounded-full border-2 text-xs font-semibold transition-colors ${
                done ? 'bg-primary border-primary text-primary-foreground' :
                active ? 'border-primary text-primary' :
                'border-muted-foreground/30 text-muted-foreground/50'
              }`}>
                {done ? <Check className="size-3.5" /> : idx + 1}
              </div>
              <span className={`text-[10px] whitespace-nowrap ${active ? 'text-foreground font-medium' : 'text-muted-foreground'}`}>
                {label}
              </span>
            </div>
            {idx < STEPS.length - 1 && (
              <div className={`h-px w-10 mx-1 mb-4 transition-colors ${done ? 'bg-primary' : 'bg-border'}`} />
            )}
          </div>
        );
      })}
    </div>
  );
}

// ─── Field wrapper ────────────────────────────────────────────────────────────

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label className="text-xs">
        {label}{required && <span className="text-destructive ml-0.5">*</span>}
      </Label>
      {children}
    </div>
  );
}

// ─── Summary row ──────────────────────────────────────────────────────────────

function SummaryRow({ label, value }: { label: string; value: string | undefined }) {
  return (
    <div className="flex justify-between py-1.5 border-b border-border/30 last:border-0 text-sm">
      <span className="text-muted-foreground text-xs">{label}</span>
      <span className="font-medium text-xs text-right max-w-[60%]">{value || '—'}</span>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function NewRfqPage() {
  const router = useRouter();
  const { role } = useRole();
  const [step, setStep] = useState(0);
  const [form, setForm] = useState<WizardState>(INITIAL);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Route guard: only SALES and ADMIN can create RFQs
  if (!canCreateRfq(role)) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 h-64">
        <p className="text-sm text-muted-foreground">
          You do not have permission to create RFQs.
        </p>
        <button className="text-sm underline text-primary" onClick={() => router.push('/rfqs')}>
          Back to RFQs
        </button>
      </div>
    );
  }

  const set = (patch: Partial<WizardState>) => setForm((f) => ({ ...f, ...patch }));

  const canNext = () => {
    if (step === 0) return form.clientName.trim().length > 0;
    if (step === 1) return form.businessType !== '';
    if (step === 2) return form.effectiveDate !== '' && form.policyPeriodEnd !== '';
    if (step === 3) return form.planStructure !== '' && form.sumAssuredBasis !== '';
    return true;
  };

  const handleSubmit = async (seedDemo = false) => {
    setSubmitting(true);
    setSubmitError(null);
    try {
      // TODO: seedDemo flag is accepted but currently ignored — wire to seed endpoint when available
      const payload = {
        employerName: form.clientName,
        industry: form.industry || undefined,
        quoteSegment: (form.quoteSegment as QuoteSegment) || undefined,
        brokerName: form.brokerName || undefined,
        intermediaryCode: form.intermediaryCode || undefined,
        channel: form.channel || undefined,
        businessType: form.businessType as BusinessType,
        priorPolicy: (['RENEWAL', 'TAKEOVER'] as BusinessType[]).includes(form.businessType as BusinessType)
          ? {
              insurer: form.priorInsurer || undefined,
              premium: form.priorPremium ? Number(form.priorPremium) : undefined,
              lossRatio: form.priorLossRatio ? Number(form.priorLossRatio) : undefined,
            }
          : undefined,
        effectiveDate: form.effectiveDate,
        policyConfig: {
          policyYearEnd: form.policyPeriodEnd,
          gracePeriodDays: 30,
          billingFrequency: 'ANNUAL',
          collectionMethod: 'DIRECT',
          subsidiariesEnabled: false,
        },
        defaultPlanStructure: {
          planStructure: form.planStructure as PlanStructure,
          sumAssuredBasis: form.sumAssuredBasis as SumAssuredBasis,
          gradeMapping: form.gradeMapping,
          defaultPlanCount: form.planStructure === PlanStructure.MULTI_PLAN ? Number(form.defaultPlanCount) : undefined,
          pricingBasis: (form.pricingBasis as PricingBasis) || PricingBasis.MANUAL,
        },
        // Fixed seeds
        lob: LobType.GTL,
        schemeType: SchemeType.EMPLOYER_OBLIGATORY,
        coverPattern: CoverPattern.LEVEL,
        livesCovered: LivesCovered.MEMBER_ONLY,
        termBasis: TermBasis.POLICY_YEAR,
        sumAssuredBasis: form.sumAssuredBasis as SumAssuredBasis,
      };
      const { rfqId } = await createRfq(payload);
      router.push(`/rfqs/${rfqId}`);
    } catch (e) {
      setSubmitError(e instanceof Error ? e.message : 'Failed to create RFQ.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="shrink-0 px-6 py-4 border-b border-border/40">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-base font-semibold">Create RFQ</h1>
            <p className="text-xs text-muted-foreground mt-0.5">New group quotation request</p>
          </div>
          <Button variant="ghost" size="sm" onClick={() => router.push('/rfqs')}>Cancel</Button>
        </div>
        <div className="mt-5">
          <StepIndicator current={step} />
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 min-h-0 overflow-auto px-6 py-5">
        {step === 0 && (
          <div className="max-w-lg flex flex-col gap-4">
            <h2 className="text-sm font-semibold">Client & Segment</h2>
            <Field label="Client name" required>
              <Input value={form.clientName} onChange={(e) => set({ clientName: e.target.value })} placeholder="e.g. Acme Manufacturing Pvt Ltd" className="text-sm" />
            </Field>
            <Field label="Industry">
              <Input value={form.industry} onChange={(e) => set({ industry: e.target.value })} placeholder="e.g. Manufacturing" className="text-sm" />
            </Field>
            <Field label="Quote segment">
              <Select value={form.quoteSegment} onValueChange={(v) => set({ quoteSegment: v as QuoteSegment })}>
                <SelectTrigger className="text-sm"><SelectValue placeholder="Select…" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value={QuoteSegment.SME}>SME</SelectItem>
                  <SelectItem value={QuoteSegment.MID}>Mid Market</SelectItem>
                  <SelectItem value={QuoteSegment.LARGE}>Large</SelectItem>
                </SelectContent>
              </Select>
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Broker name">
                <Input value={form.brokerName} onChange={(e) => set({ brokerName: e.target.value })} placeholder="e.g. Marsh India" className="text-sm" />
              </Field>
              <Field label="Broker code">
                <Input value={form.intermediaryCode} onChange={(e) => set({ intermediaryCode: e.target.value })} placeholder="e.g. BRK-001" className="text-sm" />
              </Field>
            </div>
            <Field label="Channel">
              <Select value={form.channel} onValueChange={(v) => set({ channel: v })}>
                <SelectTrigger className="text-sm"><SelectValue placeholder="Select…" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="BROKER">Broker</SelectItem>
                  <SelectItem value="CORPORATE_AGENT">Corporate Agent</SelectItem>
                  <SelectItem value="DIRECT">Direct</SelectItem>
                  <SelectItem value="OTHER">Other</SelectItem>
                </SelectContent>
              </Select>
            </Field>
          </div>
        )}

        {step === 1 && (
          <div className="max-w-lg flex flex-col gap-4">
            <h2 className="text-sm font-semibold">Business Type</h2>
            <Field label="Business type" required>
              <Select value={form.businessType} onValueChange={(v) => set({ businessType: v as BusinessType })}>
                <SelectTrigger className="text-sm"><SelectValue placeholder="Select…" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value={BusinessType.NEW}>New</SelectItem>
                  <SelectItem value={BusinessType.RENEWAL}>Renewal</SelectItem>
                  <SelectItem value={BusinessType.TAKEOVER}>Takeover</SelectItem>
                </SelectContent>
              </Select>
            </Field>
            {(form.businessType === BusinessType.RENEWAL || form.businessType === BusinessType.TAKEOVER) && (
              <>
                <p className="text-xs text-muted-foreground -mb-1">Prior policy details</p>
                <Field label="Prior insurer">
                  <Input value={form.priorInsurer} onChange={(e) => set({ priorInsurer: e.target.value })} placeholder="e.g. LIC of India" className="text-sm" />
                </Field>
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Prior premium (₹)">
                    <Input type="number" value={form.priorPremium} onChange={(e) => set({ priorPremium: e.target.value })} placeholder="0" className="text-sm" />
                  </Field>
                  <Field label="Prior loss ratio">
                    <Input type="number" step="0.01" min="0" max="5" value={form.priorLossRatio} onChange={(e) => set({ priorLossRatio: e.target.value })} placeholder="e.g. 0.72" className="text-sm" />
                  </Field>
                </div>
              </>
            )}
          </div>
        )}

        {step === 2 && (
          <div className="max-w-lg flex flex-col gap-4">
            <h2 className="text-sm font-semibold">Dates & Pricing Basis</h2>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Effective date" required>
                <Input type="date" value={form.effectiveDate} onChange={(e) => set({ effectiveDate: e.target.value })} className="text-sm" />
              </Field>
              <Field label="Policy period end" required>
                <Input type="date" value={form.policyPeriodEnd} onChange={(e) => set({ policyPeriodEnd: e.target.value })} className="text-sm" />
              </Field>
            </div>
            <Field label="Pricing basis">
              <Select value={form.pricingBasis} onValueChange={(v) => set({ pricingBasis: v as PricingBasis })}>
                <SelectTrigger className="text-sm"><SelectValue placeholder="Select…" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value={PricingBasis.MANUAL}>Manual</SelectItem>
                  <SelectItem value={PricingBasis.EXPERIENCE}>Experience</SelectItem>
                  <SelectItem value={PricingBasis.BLEND}>Blend</SelectItem>
                </SelectContent>
              </Select>
            </Field>
          </div>
        )}

        {step === 3 && (
          <div className="max-w-lg flex flex-col gap-4">
            <h2 className="text-sm font-semibold">Plan Structure</h2>
            <Field label="Plan structure" required>
              <Select value={form.planStructure} onValueChange={(v) => set({ planStructure: v as PlanStructure })}>
                <SelectTrigger className="text-sm"><SelectValue placeholder="Select…" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value={PlanStructure.SINGLE_PLAN}>Single Plan</SelectItem>
                  <SelectItem value={PlanStructure.MULTI_PLAN}>Multi Plan</SelectItem>
                </SelectContent>
              </Select>
            </Field>
            <Field label="Sum assured basis" required>
              <Select value={form.sumAssuredBasis} onValueChange={(v) => set({ sumAssuredBasis: v as SumAssuredBasis })}>
                <SelectTrigger className="text-sm"><SelectValue placeholder="Select…" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value={SumAssuredBasis.FLAT}>Flat</SelectItem>
                  <SelectItem value={SumAssuredBasis.SALARY_MULTIPLE}>Salary Multiple</SelectItem>
                  <SelectItem value={SumAssuredBasis.GRADE_SLAB}>Grade Slab</SelectItem>
                </SelectContent>
              </Select>
            </Field>
            <Field label="Grade mapping">
              <button
                type="button"
                onClick={() => set({ gradeMapping: !form.gradeMapping })}
                className={`flex h-8 w-14 items-center rounded-full border-2 transition-colors px-0.5 ${
                  form.gradeMapping ? 'bg-primary border-primary justify-end' : 'bg-muted border-border justify-start'
                }`}
                aria-pressed={form.gradeMapping}
              >
                <span className="h-6 w-6 rounded-full bg-white shadow-sm block" />
              </button>
            </Field>
            {form.planStructure === PlanStructure.MULTI_PLAN && (
              <Field label="Default plan count">
                <Input
                  type="number" min="2" max="10"
                  value={form.defaultPlanCount}
                  onChange={(e) => set({ defaultPlanCount: e.target.value })}
                  className="text-sm w-28"
                />
              </Field>
            )}
          </div>
        )}

        {step === 4 && (
          <div className="max-w-lg flex flex-col gap-4">
            <h2 className="text-sm font-semibold">Confirm & Create</h2>
            <div className="rounded-lg border border-border bg-muted/20 px-4 py-2">
              <p className="text-xs font-medium text-muted-foreground mb-1 mt-1">Client</p>
              <SummaryRow label="Client name" value={form.clientName} />
              <SummaryRow label="Industry" value={form.industry} />
              <SummaryRow label="Segment" value={form.quoteSegment || undefined} />
              <SummaryRow label="Broker" value={form.brokerName} />
              <SummaryRow label="Broker code" value={form.intermediaryCode} />
              <SummaryRow label="Channel" value={form.channel} />
              <p className="text-xs font-medium text-muted-foreground mb-1 mt-3">Business</p>
              <SummaryRow label="Business type" value={form.businessType || undefined} />
              {form.priorInsurer && <SummaryRow label="Prior insurer" value={form.priorInsurer} />}
              {form.priorPremium && <SummaryRow label="Prior premium" value={`₹${Number(form.priorPremium).toLocaleString()}`} />}
              {form.priorLossRatio && <SummaryRow label="Prior loss ratio" value={form.priorLossRatio} />}
              <p className="text-xs font-medium text-muted-foreground mb-1 mt-3">Dates & Pricing</p>
              <SummaryRow label="Effective date" value={form.effectiveDate} />
              <SummaryRow label="Policy period end" value={form.policyPeriodEnd} />
              <SummaryRow label="Pricing basis" value={form.pricingBasis || undefined} />
              <p className="text-xs font-medium text-muted-foreground mb-1 mt-3">Plan Structure</p>
              <SummaryRow label="Plan structure" value={form.planStructure || undefined} />
              <SummaryRow label="Sum assured basis" value={form.sumAssuredBasis || undefined} />
              <SummaryRow label="Grade mapping" value={form.gradeMapping ? 'Yes' : 'No'} />
              {form.planStructure === PlanStructure.MULTI_PLAN && (
                <SummaryRow label="Default plan count" value={form.defaultPlanCount} />
              )}
              <p className="text-xs font-medium text-muted-foreground mb-1 mt-3">Fixed seeds</p>
              <SummaryRow label="LoB" value="GTL" />
              <SummaryRow label="Scheme type" value="EMPLOYER_OBLIGATORY" />
              <SummaryRow label="Cover pattern" value="LEVEL" />
              <SummaryRow label="Lives covered" value="MEMBER_ONLY" />
            </div>

            {submitError && (
              <div className="flex items-start gap-2 rounded-md bg-destructive/10 border border-destructive/20 px-3 py-2.5 text-destructive text-xs">
                <AlertCircle className="size-4 shrink-0 mt-0.5" />
                {submitError}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Footer actions */}
      <div className="shrink-0 flex items-center justify-between px-6 py-3.5 border-t border-border/40 bg-muted/20">
        <Button
          variant="outline" size="sm"
          onClick={() => setStep((s) => s - 1)}
          disabled={step === 0 || submitting}
          className="gap-1.5"
        >
          <ChevronLeft className="size-3.5" /> Previous
        </Button>

        <div className="flex items-center gap-2">
          {step < 4 ? (
            <Button
              size="sm"
              onClick={() => setStep((s) => s + 1)}
              disabled={!canNext()}
              className="gap-1.5"
            >
              Next <ChevronRight className="size-3.5" />
            </Button>
          ) : (
            <>
              <Button
                variant="outline" size="sm"
                onClick={() => handleSubmit(true)}
                disabled={submitting}
                className="gap-1.5"
              >
                {submitting ? <Loader2 className="size-3.5 animate-spin" /> : null}
                Create &amp; Seed Demo Data
              </Button>
              <Button
                size="sm"
                onClick={() => handleSubmit(false)}
                disabled={submitting}
                className="gap-1.5"
              >
                {submitting ? <Loader2 className="size-3.5 animate-spin" /> : <Check className="size-3.5" />}
                Create RFQ
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
