'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronLeft, ChevronRight, Check, AlertCircle, Loader2, Building2, Sparkles, RefreshCw, Shuffle, Banknote, TrendingUp, LayoutList, Square, LayoutGrid } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { PageHeader } from '@/components/layout/PageHeader';

import { createRfq } from '@/lib/api/quotation-client';
import {
  BusinessType, QuoteSegment, PricingBasis, PlanStructure,
  SumAssuredBasis, LobType, SchemeType, CoverPattern, LivesCovered, TermBasis,
} from '@/lib/types';
import { useRole } from '@/hooks/useRole';
import { canCreateRfq } from '@/lib/permissions';
import { cn } from '@/lib/utils';

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

// ─── Stepper ──────────────────────────────────────────────────────────────────

function isStepComplete(form: WizardState, stepIdx: number): boolean {
  switch (stepIdx) {
    case 0: return form.clientName.trim().length > 0;
    case 1: return form.businessType !== '';
    case 2: return form.effectiveDate !== '' && form.policyPeriodEnd !== '';
    case 3: return form.planStructure !== '' && form.sumAssuredBasis !== '';
    default: return false;
  }
}

function Stepper({ current, visitedSteps, form, onStep }: {
  current: number;
  visitedSteps: number[];
  form: WizardState;
  onStep: (idx: number) => void;
}) {
  const doneCount = STEPS.filter((_, idx) =>
    isStepComplete(form, idx) && idx !== current && visitedSteps.includes(idx)
  ).length;

  return (
    <div className="flex flex-col gap-1">
      <div className="text-[10px] text-muted-foreground mb-2 font-medium">
        {doneCount} / {STEPS.length} steps done
      </div>
      {STEPS.map((label, idx) => {
        const isCurrent = idx === current;
        const isDone = isStepComplete(form, idx) && !isCurrent && visitedSteps.includes(idx);
        const isClickable = isDone || isCurrent || visitedSteps.includes(idx);
        return (
          <button
            key={idx}
            type="button"
            disabled={!isClickable}
            onClick={() => isClickable && onStep(idx)}
            className={cn(
              'flex items-center gap-2.5 px-3 py-2 rounded-lg text-left text-xs transition-colors w-full min-w-0',
              isCurrent ? 'bg-primary/10 text-foreground font-semibold' :
              isDone ? 'text-foreground hover:bg-muted cursor-pointer' :
              isClickable ? 'text-muted-foreground hover:bg-muted cursor-pointer' :
              'text-muted-foreground/40 cursor-not-allowed',
            )}
          >
            <span className={cn(
              'flex size-5 items-center justify-center rounded-full text-[10px] font-bold shrink-0',
              isCurrent ? 'bg-primary/15 text-foreground' :
              isDone ? 'bg-primary/20 text-primary' : 'bg-muted/30 text-muted-foreground/40',
            )}>
              {isDone ? <Check className="size-3" /> : idx + 1}
            </span>
            <span className="truncate min-w-0">{label}</span>
          </button>
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

function getInitials(name: string): string {
  return name.trim().split(/\s+/).slice(0, 2).map((w) => w[0]?.toUpperCase() ?? '').join('') || '?';
}

function LiveSummary({ form, visitedSteps }: { form: WizardState; visitedSteps: number[] }) {
  const step1Done = visitedSteps.includes(1);
  const step2Done = visitedSteps.includes(2);
  const step3Done = visitedSteps.includes(3);
  const hasClient = form.clientName.trim().length > 0;
  const isRenewalOrTakeover =
    form.businessType === BusinessType.RENEWAL || form.businessType === BusinessType.TAKEOVER;

  return (
    <div className="rounded-2xl border bg-card shadow-md overflow-hidden">

      {/* ── Client identity ──────────────────────────── */}
      <div className={cn(
        'px-5 pt-5 pb-4 bg-gradient-to-b transition-colors duration-500',
        hasClient ? 'from-primary/[0.06] to-transparent' : 'from-muted/40 to-transparent',
      )}>
        <div className="flex items-start gap-3">
          <div className={cn(
            'flex items-center justify-center rounded-xl size-10 text-sm font-bold shrink-0 transition-colors',
            hasClient ? 'bg-primary/15 text-primary' : 'bg-muted text-muted-foreground/40',
          )}>
            {hasClient ? getInitials(form.clientName) : <Building2 className="size-5" />}
          </div>
          <div className="min-w-0 flex-1 pt-0.5">
            {hasClient ? (
              <h2 className="text-lg font-bold leading-tight text-foreground break-words">
                {form.clientName}
              </h2>
            ) : (
              <h2 className="text-lg font-bold leading-tight text-muted-foreground/30 italic select-none">
                Client name
              </h2>
            )}
            {form.industry && (
              <p className="text-xs text-muted-foreground mt-0.5 truncate">{form.industry}</p>
            )}
            {form.quoteSegment && (
              <span className="inline-block mt-1.5 text-[10px] bg-muted border border-border rounded-full px-2 py-0.5 font-medium">
                {form.quoteSegment}
              </span>
            )}
          </div>
        </div>
        {(form.brokerName || form.channel) && (
          <div className="mt-3 pt-3 border-t border-border/40 flex flex-wrap gap-1.5">
            {form.brokerName && (
              <span className="text-[10px] bg-background border border-border rounded px-1.5 py-0.5 truncate max-w-full">
                {form.brokerName}{form.brokerCode ? ` · ${form.brokerCode}` : ''}
              </span>
            )}
            {form.channel && (
              <span className="text-[10px] bg-background border border-border rounded px-1.5 py-0.5">
                {form.channel.replace('_', ' ')}
              </span>
            )}
          </div>
        )}
      </div>

      <div className="h-px bg-border/40" />

      {/* ── Business type ────────────────────────────── */}
      <div className="px-5 py-4">
        <p className="text-[9px] font-semibold uppercase tracking-[0.15em] text-muted-foreground/70 mb-2">Business</p>
        {step1Done ? (
          <div className="space-y-2">
            {form.businessType && (
              <span className={cn(
                'inline-flex items-center gap-1.5 text-[11px] font-semibold rounded-lg px-2.5 py-1 border',
                form.businessType === BusinessType.NEW
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                  : form.businessType === BusinessType.RENEWAL
                  ? 'bg-blue-50 text-blue-700 border-blue-200'
                  : 'bg-amber-50 text-amber-700 border-amber-200',
              )}>
                {form.businessType === BusinessType.NEW && <Sparkles className="size-3" />}
                {form.businessType === BusinessType.RENEWAL && <RefreshCw className="size-3" />}
                {form.businessType === BusinessType.TAKEOVER && <Shuffle className="size-3" />}
                {form.businessType}
              </span>
            )}
            {isRenewalOrTakeover && form.priorInsurer && (
              <p className="text-[11px] text-muted-foreground mt-0.5">{form.priorInsurer}</p>
            )}
            {isRenewalOrTakeover && form.priorPremium && (
              <p className="text-2xl font-bold tabular-nums tracking-tight text-foreground leading-none">
                ₹{Number(form.priorPremium).toLocaleString('en-IN')}
              </p>
            )}
            {isRenewalOrTakeover && form.priorLossRatio && (
              <p className="text-[11px] text-muted-foreground">
                LR {(Number(form.priorLossRatio) * 100).toFixed(0)}%
              </p>
            )}
          </div>
        ) : (
          <p className="text-xs text-muted-foreground/40">—</p>
        )}
      </div>

      <div className="h-px bg-border/40" />

      {/* ── Policy period ────────────────────────────── */}
      <div className="px-5 py-4">
        <p className="text-[9px] font-semibold uppercase tracking-[0.15em] text-muted-foreground/70 mb-2">Policy period</p>
        {step2Done ? (
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold tabular-nums">{form.effectiveDate || '—'}</span>
              <span className="text-muted-foreground/40 text-xs">→</span>
              <span className="text-sm font-semibold tabular-nums">{form.policyPeriodEnd || '—'}</span>
            </div>
            {form.pricingBasis && (
              <p className="text-[11px] text-muted-foreground capitalize">
                {form.pricingBasis.toLowerCase()} pricing
              </p>
            )}
          </div>
        ) : (
          <p className="text-xs text-muted-foreground/40">—</p>
        )}
      </div>

      <div className="h-px bg-border/40" />

      {/* ── Plan structure ───────────────────────────── */}
      <div className="px-5 py-4">
        <p className="text-[9px] font-semibold uppercase tracking-[0.15em] text-muted-foreground/70 mb-2">Plan structure</p>
        {step3Done ? (
          <div className="space-y-1.5">
            {form.planStructure && (
              <p className="text-sm font-semibold">{form.planStructure.replace('_', ' ')}</p>
            )}
            {form.sumAssuredBasis && (
              <p className="text-[11px] text-muted-foreground">{form.sumAssuredBasis.replace(/_/g, ' ')}</p>
            )}
            <div className="flex flex-wrap gap-1.5 mt-0.5">
              {form.gradeMapping && (
                <span className="text-[10px] bg-muted/60 border border-border/40 rounded px-1.5 py-0.5 text-muted-foreground">Grade mapping</span>
              )}
              {form.planStructure === PlanStructure.MULTI_PLAN && form.defaultPlanCount && (
                <span className="text-[10px] bg-muted/60 border border-border/40 rounded px-1.5 py-0.5 text-muted-foreground">{form.defaultPlanCount} plans</span>
              )}
            </div>
          </div>
        ) : (
          <p className="text-xs text-muted-foreground/40">—</p>
        )}
      </div>

      <div className="h-px bg-border/40" />

      {/* ── Auto-seeded ──────────────────────────────── */}
      <div className="px-5 py-4">
        <p className="text-[9px] font-semibold uppercase tracking-[0.15em] text-muted-foreground/70 mb-2">Auto-seeded</p>
        <div className="flex flex-wrap gap-1.5">
          {(['GTL', 'EMPLOYER OBLIGATORY', 'LEVEL', 'MEMBER ONLY'] as const).map((tag) => (
            <span key={tag} className="text-[10px] text-muted-foreground bg-muted/50 border border-border/40 rounded px-1.5 py-0.5">
              {tag}
            </span>
          ))}
        </div>
      </div>

    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function NewRfqPage() {
  const router = useRouter();
  const { role } = useRole();
  const [step, setStep] = useState(0);
  const [visitedSteps, setVisitedSteps] = useState<number[]>([0]);
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
      <div className="shrink-0 border-b border-border/40">
        <PageHeader
          title="Create RFQ"
          subtitle="New group quotation request"
          actions={
            <>
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
            </>
          }
        />
      </div>

      {/* 3-column body */}
      <div className="flex flex-1 min-h-0 overflow-hidden">
        {/* Left — vertical stepper */}
        <div className="w-52 shrink-0 border-r border-border/40 px-3 py-4 overflow-y-auto overflow-x-hidden">
          <Stepper current={step} visitedSteps={visitedSteps} form={form} onStep={setStep} />
        </div>

        {/* Center — form + footer */}
        <div className="flex-1 min-w-0 flex flex-col">
          <div className="flex-1 min-h-0 overflow-y-auto px-6 py-5">
            {step === 0 && (
              <div className="flex flex-col gap-4">
                <h2 className="text-base font-semibold">Client & Segment</h2>
                <Field label="Client name" required>
                  <Input value={form.clientName} onChange={(e) => set({ clientName: e.target.value })} placeholder="e.g. Acme Manufacturing Pvt Ltd" className="text-sm" />
                </Field>
                <Field label="Industry">
                  <Input value={form.industry} onChange={(e) => set({ industry: e.target.value })} placeholder="e.g. Manufacturing" className="text-sm" />
                </Field>
                <Field label="Segment">
                  <div className="grid grid-cols-3 gap-2">
                    {([
                      { value: QuoteSegment.SME,   label: 'SME',        sub: '< 200 lives' },
                      { value: QuoteSegment.MID,   label: 'Mid Market', sub: '200 – 2k lives' },
                      { value: QuoteSegment.LARGE, label: 'Large',      sub: '2k+ lives' },
                    ] as const).map(({ value, label, sub }) => (
                      <button
                        key={value} type="button"
                        onClick={() => set({ quoteSegment: form.quoteSegment === value ? '' : value })}
                        className={cn(
                          'flex flex-col items-center gap-0.5 rounded-xl border p-2.5 text-center transition-colors',
                          form.quoteSegment === value
                            ? 'border-primary bg-primary/5 text-foreground'
                            : 'border-border bg-card hover:border-primary/50 text-muted-foreground hover:text-foreground',
                        )}
                      >
                        <span className="text-xs font-semibold">{label}</span>
                        <span className="text-[10px] text-muted-foreground leading-tight">{sub}</span>
                      </button>
                    ))}
                  </div>
                </Field>
                <div className="flex items-center gap-3 my-1">
                  <div className="h-px flex-1 bg-border/50" />
                  <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Via</span>
                  <div className="h-px flex-1 bg-border/50" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Broker name">
                    <Input value={form.brokerName} onChange={(e) => set({ brokerName: e.target.value })} placeholder="e.g. Marsh India" className="text-sm" />
                  </Field>
                  <Field label="Broker code">
                    <Input value={form.brokerCode} onChange={(e) => set({ brokerCode: e.target.value })} placeholder="e.g. BRK-001" className="text-sm" />
                  </Field>
                </div>
                <Field label="Channel">
                  <div className="grid grid-cols-2 gap-2">
                    {([
                      { value: 'BROKER',          label: 'Broker' },
                      { value: 'CORPORATE_AGENT', label: 'Corp. Agent' },
                      { value: 'DIRECT',          label: 'Direct' },
                      { value: 'OTHER',           label: 'Other' },
                    ] as const).map(({ value, label }) => (
                      <button
                        key={value} type="button"
                        onClick={() => set({ channel: form.channel === value ? '' : value })}
                        className={cn(
                          'flex items-center justify-center rounded-xl border py-2.5 transition-colors',
                          form.channel === value
                            ? 'border-primary bg-primary/5 text-foreground'
                            : 'border-border bg-card hover:border-primary/50 text-muted-foreground hover:text-foreground',
                        )}
                      >
                        <span className="text-xs font-semibold">{label}</span>
                      </button>
                    ))}
                  </div>
                </Field>
              </div>
            )}

            {step === 1 && (
              <div className="flex flex-col gap-4">
                <h2 className="text-base font-semibold">Business Type</h2>
                <div className="grid grid-cols-3 gap-2">
                  {([
                    { value: BusinessType.NEW,      Icon: Sparkles,  label: 'New Business', sub: 'No prior policy' },
                    { value: BusinessType.RENEWAL,  Icon: RefreshCw, label: 'Renewal',       sub: 'Existing policy' },
                    { value: BusinessType.TAKEOVER, Icon: Shuffle,   label: 'Takeover',      sub: 'From another insurer' },
                  ] as const).map(({ value, Icon, label, sub }) => (
                    <button
                      key={value} type="button"
                      onClick={() => set({ businessType: value })}
                      className={cn(
                        'flex flex-col items-start gap-1.5 rounded-xl border p-3 text-left transition-colors',
                        form.businessType === value
                          ? 'border-primary bg-primary/5'
                          : 'border-border bg-card hover:border-primary/50',
                      )}
                    >
                      <Icon className={cn('size-4', form.businessType === value ? 'text-primary' : 'text-muted-foreground')} />
                      <span className="text-xs font-semibold text-foreground">{label}</span>
                      <span className="text-[10px] text-muted-foreground leading-tight">{sub}</span>
                    </button>
                  ))}
                </div>
                {(form.businessType === BusinessType.RENEWAL || form.businessType === BusinessType.TAKEOVER) && (
                  <div className="rounded-xl border border-dashed border-border/60 bg-muted/20 p-4 flex flex-col gap-3">
                    <p className="text-xs font-medium text-muted-foreground">Prior policy details</p>
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
                  </div>
                )}
              </div>
            )}

            {step === 2 && (
              <div className="flex flex-col gap-4">
                <h2 className="text-base font-semibold">Dates & Pricing Basis</h2>
                <div className="rounded-xl border bg-muted/20 p-4 flex flex-col gap-3">
                  <p className="text-xs font-medium text-muted-foreground">Policy period</p>
                  <div className="grid grid-cols-2 gap-3">
                    <Field label="Effective date" required>
                      <Input
                        type="date"
                        value={form.effectiveDate}
                        onChange={(e) => {
                          const v = e.target.value;
                          if (v) {
                            const end = new Date(v);
                            end.setUTCFullYear(end.getUTCFullYear() + 1);
                            end.setUTCDate(end.getUTCDate() - 1);
                            set({ effectiveDate: v, policyPeriodEnd: end.toISOString().slice(0, 10) });
                          } else {
                            set({ effectiveDate: v });
                          }
                        }}
                        className="text-sm"
                      />
                    </Field>
                    <Field label="Period end" required>
                      <Input type="date" value={form.policyPeriodEnd} onChange={(e) => set({ policyPeriodEnd: e.target.value })} className="text-sm" />
                    </Field>
                  </div>
                  <p className="text-[10px] text-muted-foreground/60">Period end auto-sets to 1 year from start date.</p>
                </div>
                <Field label="Pricing basis">
                  <div className="grid grid-cols-3 gap-2">
                    {([
                      { value: PricingBasis.MANUAL,     label: 'Manual',     sub: 'Quote by hand' },
                      { value: PricingBasis.EXPERIENCE, label: 'Experience', sub: 'From loss data' },
                      { value: PricingBasis.BLEND,      label: 'Blend',      sub: 'Manual + experience' },
                    ] as const).map(({ value, label, sub }) => (
                      <button
                        key={value} type="button"
                        onClick={() => set({ pricingBasis: form.pricingBasis === value ? '' : value })}
                        className={cn(
                          'flex flex-col items-center gap-0.5 rounded-xl border p-2.5 text-center transition-colors',
                          form.pricingBasis === value
                            ? 'border-primary bg-primary/5 text-foreground'
                            : 'border-border bg-card hover:border-primary/50 text-muted-foreground hover:text-foreground',
                        )}
                      >
                        <span className="text-xs font-semibold">{label}</span>
                        <span className="text-[10px] text-muted-foreground leading-tight">{sub}</span>
                      </button>
                    ))}
                  </div>
                </Field>
              </div>
            )}

            {step === 3 && (
              <div className="flex flex-col gap-4">
                <h2 className="text-base font-semibold">Plan Structure</h2>
                <Field label="Plan structure" required>
                  <div className="grid grid-cols-2 gap-3">
                    {([
                      { value: PlanStructure.SINGLE_PLAN, Icon: Square,     label: 'Single Plan', sub: 'One plan for all members' },
                      { value: PlanStructure.MULTI_PLAN,  Icon: LayoutGrid,  label: 'Multi Plan',  sub: 'Separate plans by grade' },
                    ] as const).map(({ value, Icon, label, sub }) => (
                      <button
                        key={value} type="button"
                        onClick={() => set({ planStructure: value })}
                        className={cn(
                          'flex flex-col items-start gap-1.5 rounded-xl border p-3 text-left transition-colors',
                          form.planStructure === value
                            ? 'border-primary bg-primary/5'
                            : 'border-border bg-card hover:border-primary/50',
                        )}
                      >
                        <Icon className={cn('size-4', form.planStructure === value ? 'text-primary' : 'text-muted-foreground')} />
                        <span className="text-xs font-semibold text-foreground">{label}</span>
                        <span className="text-[10px] text-muted-foreground leading-tight">{sub}</span>
                      </button>
                    ))}
                  </div>
                </Field>
                <Field label="Sum assured basis" required>
                  <div className="grid grid-cols-3 gap-2">
                    {([
                      { value: SumAssuredBasis.FLAT,            Icon: Banknote,   label: 'Flat',        sub: 'Fixed ₹ amount' },
                      { value: SumAssuredBasis.SALARY_MULTIPLE, Icon: TrendingUp, label: 'Salary ×',    sub: 'N times salary' },
                      { value: SumAssuredBasis.GRADE_SLAB,      Icon: LayoutList, label: 'Grade Slab',  sub: 'Census-seeded' },
                    ] as const).map(({ value, Icon, label, sub }) => (
                      <button
                        key={value} type="button"
                        onClick={() => set({ sumAssuredBasis: value })}
                        className={cn(
                          'flex flex-col items-center gap-1.5 rounded-xl border p-3 text-center transition-colors',
                          form.sumAssuredBasis === value
                            ? 'border-primary bg-primary/5'
                            : 'border-border bg-card hover:border-primary/50',
                        )}
                      >
                        <Icon className={cn('size-4', form.sumAssuredBasis === value ? 'text-primary' : 'text-muted-foreground')} />
                        <span className="text-xs font-semibold text-foreground">{label}</span>
                        <span className="text-[10px] text-muted-foreground leading-tight">{sub}</span>
                      </button>
                    ))}
                  </div>
                </Field>
                <div className="flex items-center justify-between rounded-xl border bg-card px-4 py-3">
                  <div>
                    <p className="text-xs font-medium">Grade mapping</p>
                    <p className="text-[10px] text-muted-foreground mt-0.5">Map census grades to plan variants</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => set({ gradeMapping: !form.gradeMapping })}
                    className={cn(
                      'flex h-6 w-11 items-center rounded-full border-2 transition-colors px-0.5',
                      form.gradeMapping ? 'bg-primary border-primary justify-end' : 'bg-muted border-border justify-start',
                    )}
                    aria-pressed={form.gradeMapping}
                  >
                    <span className="h-4 w-4 rounded-full bg-white shadow-sm block" />
                  </button>
                </div>
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
          {/* Footer actions — confined to form column */}
          <div className="shrink-0 flex items-center justify-between px-6 py-3.5 border-t border-border/40">
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
                <Button size="sm" onClick={() => {
                  const next = step + 1;
                  setStep(next);
                  setVisitedSteps((v) => v.includes(next) ? v : [...v, next]);
                }} disabled={!canNext()} className="gap-1.5">
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

        {/* Right — live summary */}
        <div className="w-72 shrink-0 border-l border-border/40 bg-muted/5 overflow-y-auto px-3 py-4">
          <LiveSummary form={form} visitedSteps={visitedSteps} />
        </div>

      </div>
    </div>
  );
}
