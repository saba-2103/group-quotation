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
  clientName: string;
  industry: string;
  quoteSegment: QuoteSegment | '';
  brokerName: string;
  brokerCode: string;
  channel: string;
  businessType: BusinessType | '';
  priorInsurer: string;
  priorPremium: string;
  priorLossRatio: string;
  effectiveDate: string;
  policyPeriodEnd: string;
  pricingBasis: PricingBasis | '';
  planStructure: PlanStructure | '';
  sumAssuredBasis: SumAssuredBasis | '';
  gradeMapping: boolean;
  defaultPlanCount: string;
}

const INITIAL: WizardState = {
  clientName: '', industry: '', quoteSegment: '', brokerName: '', brokerCode: '', channel: '',
  businessType: '', priorInsurer: '', priorPremium: '', priorLossRatio: '',
  effectiveDate: '', policyPeriodEnd: '', pricingBasis: '',
  planStructure: '', sumAssuredBasis: '', gradeMapping: false, defaultPlanCount: '1',
};

// ─── Steps (4 only — confirm removed) ────────────────────────────────────────

const STEPS = ['Client & Segment', 'Business Type', 'Dates & Basis', 'Plan Structure'];

// ─── Step indicator ───────────────────────────────────────────────────────────

function StepIndicator({ current }: { current: number }) {
  return (
    <div className="flex items-center">
      {STEPS.map((label, idx) => {
        const done = idx < current;
        const active = idx === current;
        const isLast = idx === STEPS.length - 1;
        return (
          <div key={idx} className="flex items-center">
            {/* Badge + label */}
            <div className="flex items-center gap-2 shrink-0">
              <div className={`flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-semibold transition-colors ${
                done ? 'bg-primary text-primary-foreground' :
                active ? 'border border-primary text-primary bg-primary/10' :
                'bg-muted text-muted-foreground/50'
              }`}>
                {done ? <Check className="size-3" /> : idx + 1}
              </div>
              <span className={`text-[11px] whitespace-nowrap transition-colors ${
                active ? 'font-semibold text-foreground' :
                done ? 'text-muted-foreground' :
                'text-muted-foreground/40'
              }`}>
                {label}
              </span>
            </div>
            {/* Separator */}
            {!isLast && (
              <div className={`w-8 h-px mx-3 transition-colors ${done ? 'bg-primary/60' : 'bg-border'}`} />
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
      <Label className="text-xs font-medium">
        {label}{required && <span className="text-destructive ml-0.5">*</span>}
      </Label>
      {children}
    </div>
  );
}

// ─── Live summary panel ───────────────────────────────────────────────────────

function SummaryRow({ label, value }: { label: string; value: string | undefined }) {
  if (!value) return null;
  return (
    <div className="flex justify-between gap-2 py-1 border-b border-border/30 last:border-0">
      <span className="text-[11px] text-muted-foreground shrink-0">{label}</span>
      <span className="text-[11px] font-medium text-right truncate max-w-[55%]">{value}</span>
    </div>
  );
}

function SummaryCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden">
      <div className="px-3 pt-2.5 pb-1.5 border-b border-border/50">
        <p className="text-[9px] font-semibold uppercase tracking-wider text-muted-foreground">
          {title}
        </p>
      </div>
      <div className="px-3 py-1.5">
        {children}
      </div>
    </div>
  );
}

function LiveSummary({ form }: { form: WizardState }) {
  const hasClient = form.clientName || form.industry || form.quoteSegment || form.brokerName || form.channel;
  const hasBusiness = form.businessType;
  const hasDates = form.effectiveDate || form.policyPeriodEnd || form.pricingBasis;
  const hasPlan = form.planStructure || form.sumAssuredBasis;
  const isEmpty = !hasClient && !hasBusiness && !hasDates && !hasPlan;

  return (
    <div className="flex flex-col">
      {/* Panel header */}
      <div className="pb-3 mb-3 border-b border-border/30">
        <p className="text-sm font-semibold text-foreground">Quote Summary</p>
        <p className="text-xs text-muted-foreground mt-0.5">Updates as you fill in the form</p>
      </div>

      {isEmpty ? (
        <div className="flex items-center justify-center py-16">
          <p className="text-xs text-muted-foreground/50 text-center px-6">
            Start filling in the form to see a summary here.
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">

          {/* Client card — shown as an identity header */}
          {form.clientName && (
            <div className="rounded-xl border border-border bg-card px-3 py-3">
              <div className="flex items-start justify-between gap-2 mb-1.5">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-foreground truncate leading-tight">
                    {form.clientName}
                  </p>
                  {form.industry && (
                    <p className="text-[11px] text-muted-foreground mt-0.5 truncate">{form.industry}</p>
                  )}
                </div>
                {form.quoteSegment && (
                  <span className="text-[10px] bg-muted border border-border rounded-full px-2 py-0.5 shrink-0 font-medium">
                    {form.quoteSegment}
                  </span>
                )}
              </div>
              {(form.brokerName || form.channel) && (
                <div className="flex items-center gap-2 flex-wrap mt-1.5 pt-1.5 border-t border-border/40">
                  {form.brokerName && (
                    <span className="text-[10px] bg-muted border border-border rounded px-1.5 py-0.5 truncate max-w-full">
                      {form.brokerName}{form.brokerCode ? ` · ${form.brokerCode}` : ''}
                    </span>
                  )}
                  {form.channel && (
                    <span className="text-[10px] bg-muted border border-border rounded px-1.5 py-0.5">
                      {form.channel}
                    </span>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Business card */}
          {hasBusiness && (
            <SummaryCard title="Business">
              <SummaryRow label="Type" value={form.businessType || undefined} />
              <SummaryRow label="Prior insurer" value={form.priorInsurer} />
              <SummaryRow label="Prior premium" value={form.priorPremium ? `₹${Number(form.priorPremium).toLocaleString()}` : undefined} />
              <SummaryRow label="Prior loss ratio" value={form.priorLossRatio} />
            </SummaryCard>
          )}

          {/* Dates & pricing card */}
          {hasDates && (
            <SummaryCard title="Dates & Pricing">
              <SummaryRow label="Effective date" value={form.effectiveDate} />
              <SummaryRow label="Period end" value={form.policyPeriodEnd} />
              <SummaryRow label="Pricing basis" value={form.pricingBasis || undefined} />
            </SummaryCard>
          )}

          {/* Plan structure card */}
          {hasPlan && (
            <SummaryCard title="Plan Structure">
              <SummaryRow label="Structure" value={form.planStructure || undefined} />
              <SummaryRow label="SA basis" value={form.sumAssuredBasis || undefined} />
              <SummaryRow label="Grade mapping" value={form.gradeMapping ? 'Yes' : 'No'} />
              {form.planStructure === PlanStructure.MULTI_PLAN && (
                <SummaryRow label="Plan count" value={form.defaultPlanCount} />
              )}
            </SummaryCard>
          )}

          {/* Fixed seeds card — always visible once user starts */}
          <SummaryCard title="Fixed">
            <SummaryRow label="LoB" value="GTL" />
            <SummaryRow label="Scheme" value="EMPLOYER_OBLIGATORY" />
            <SummaryRow label="Cover" value="LEVEL" />
            <SummaryRow label="Lives" value="MEMBER_ONLY" />
          </SummaryCard>

        </div>
      )}
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

  if (!canCreateRfq(role)) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 h-64">
        <p className="text-sm text-muted-foreground">You do not have permission to create RFQs.</p>
        <button className="text-sm underline text-primary" onClick={() => router.push('/rfq2/quotes')}>
          Back to Quotes
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
      const payload = {
        employerName: form.clientName,
        industry: form.industry || undefined,
        quoteSegment: (form.quoteSegment as QuoteSegment) || undefined,
        brokerName: form.brokerName || undefined,
        brokerCode: form.brokerCode || undefined,
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
        lob: LobType.GTL,
        schemeType: SchemeType.EMPLOYER_OBLIGATORY,
        coverPattern: CoverPattern.LEVEL,
        livesCovered: LivesCovered.MEMBER_ONLY,
        termBasis: TermBasis.POLICY_YEAR,
        sumAssuredBasis: form.sumAssuredBasis as SumAssuredBasis,
      };
      const { rfqId } = await createRfq(payload);
      router.push(`/rfq2/${rfqId}`);
    } catch (e) {
      setSubmitError(e instanceof Error ? e.message : 'Failed to create RFQ.');
    } finally {
      setSubmitting(false);
    }
  };

  const isLastStep = step === STEPS.length - 1;
  const allRequiredFilled =
    form.clientName.trim().length > 0 &&
    form.businessType !== '' &&
    form.effectiveDate !== '' &&
    form.policyPeriodEnd !== '' &&
    form.planStructure !== '' &&
    form.sumAssuredBasis !== '';

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="shrink-0 px-6 py-4 border-b border-border/40">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-base font-semibold">Create RFQ</h1>
            <p className="text-xs text-muted-foreground mt-0.5">New group quotation request</p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={() => router.push('/rfq2/quotes')}>Cancel</Button>
            <Button
              size="sm"
              onClick={() => handleSubmit(false)}
              disabled={!allRequiredFilled || submitting}
              className="gap-1.5"
            >
              {submitting ? <Loader2 className="size-3.5 animate-spin" /> : <Check className="size-3.5" />}
              Create RFQ
            </Button>
          </div>
        </div>
        <div className="mt-4">
          <StepIndicator current={step} />
        </div>
      </div>

      {/* Body — 60/40 split */}
      <div className="flex flex-1 min-h-0 overflow-hidden">

        {/* Left — form (60%) */}
        <div className="flex flex-col" style={{ flex: '0 0 60%' }}>
          <div className="flex-1 min-h-0 overflow-y-auto px-6 py-5">
            {step === 0 && (
              <div className="flex flex-col gap-4">
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
                    <Input value={form.brokerCode} onChange={(e) => set({ brokerCode: e.target.value })} placeholder="e.g. BRK-001" className="text-sm" />
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
              <div className="flex flex-col gap-4">
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
              <div className="flex flex-col gap-4">
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
              <div className="flex flex-col gap-4">
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
          </div>
        </div>

        {/* Right — live summary (40%) */}
        <div className="flex-1 min-w-0 border-l border-border/40 bg-muted/10 overflow-hidden">
          <div className="h-full overflow-y-auto px-6 py-5">
            <LiveSummary form={form} />
          </div>
        </div>

      </div>

      {/* Footer actions — full width */}
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
          {!isLastStep ? (
            <Button size="sm" onClick={() => setStep((s) => s + 1)} disabled={!canNext()} className="gap-1.5">
              Next <ChevronRight className="size-3.5" />
            </Button>
          ) : (
            <>
              {submitError && (
                <div className="flex items-center gap-1.5 text-destructive text-xs">
                  <AlertCircle className="size-3.5 shrink-0" />
                  {submitError}
                </div>
              )}
              <Button
                variant="outline" size="sm"
                onClick={() => handleSubmit(true)}
                disabled={submitting || !allRequiredFilled}
                className="gap-1.5"
              >
                {submitting ? <Loader2 className="size-3.5 animate-spin" /> : null}
                Create &amp; Seed Demo Data
              </Button>
              <Button size="sm" disabled className="gap-1.5">
                Next <ChevronRight className="size-3.5" />
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
