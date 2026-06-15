'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { ChevronLeft, ChevronRight, CheckCircle2, AlertTriangle } from 'lucide-react';
import { useRfqBundle } from '@/context/RfqBundleContext';
import {
  PLAN_TEMPLATES, PRODUCT_CATALOG, RATE_CARDS, AVAILABLE_RIDERS,
  type PlanTemplateData,
} from '@/lib/constants';
import { createPlan, updatePlan } from '@/lib/api/quotation-client';
import { computePlanCompleteness } from '@/lib/computations';
import {
  SumAssuredBasis, CoverPattern, PlanHandoffStatus,
  type Plan,
} from '@/lib/types';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';

// ─── Wizard state ─────────────────────────────────────────────────────────────

interface WizardState {
  productCode: string;
  planName: string;
  sumAssuredBasis: SumAssuredBasis;
  coverPattern: CoverPattern;
  benefitSchedule: string;
  eligibilityCriteria: string;
  minAge: string;
  maxAge: string;
  minServiceMonths: string;
  uwMethod: string;
  fclAmount: string;
  medicalThreshold: string;
  rateCardRef: string;
  selectedRiders: string[];
}

const EMPTY: WizardState = {
  productCode: '',
  planName: '',
  sumAssuredBasis: SumAssuredBasis.FLAT,
  coverPattern: CoverPattern.LEVEL,
  benefitSchedule: '',
  eligibilityCriteria: '',
  minAge: '',
  maxAge: '',
  minServiceMonths: '',
  uwMethod: '',
  fclAmount: '',
  medicalThreshold: '',
  rateCardRef: '',
  selectedRiders: [],
};

const STEP_LABELS = [
  'Product', 'Coverage', 'UW Method', 'Rate Card', 'Riders', 'Review',
];

// ─── Review row ───────────────────────────────────────────────────────────────

function ReviewRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between items-start px-4 py-3 gap-4">
      <span className="text-xs text-muted-foreground shrink-0 w-32">{label}</span>
      <span className="text-xs font-medium text-right">{value}</span>
    </div>
  );
}

// ─── Field helpers ────────────────────────────────────────────────────────────

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <label className="text-xs font-medium text-muted-foreground block mb-1">{children}</label>
  );
}

// ─── Core wizard ─────────────────────────────────────────────────────────────

function NewPlanWizard() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { bundle, refetch } = useRfqBundle();

  const templateId = searchParams.get('template');
  const editPlanId = searchParams.get('planId');

  const [step, setStep] = useState(1);
  const [state, setState] = useState<WizardState>(EMPTY);
  const [saving, setSaving] = useState(false);

  const patch = (p: Partial<WizardState>) => setState((s) => ({ ...s, ...p }));

  // Pre-fill on mount
  useEffect(() => {
    if (!bundle) return;
    if (editPlanId) {
      const plan = bundle.plans.find((p) => p.planId === editPlanId);
      if (plan) {
        const uwParts = plan.uwMethod?.split(':') ?? [];
        patch({
          productCode: plan.productCode ?? '',
          planName: plan.name,
          sumAssuredBasis: plan.sumAssuredBasis,
          coverPattern: plan.coverPattern,
          benefitSchedule: plan.benefits.join('\n'),
          eligibilityCriteria: plan.eligibilityCriteria ?? '',
          uwMethod: uwParts[0] ?? '',
          fclAmount: uwParts[0] === 'FREE_COVER_LIMIT' ? (uwParts[1] ?? '') : '',
          medicalThreshold: uwParts[0] === 'MEDICAL' ? (uwParts[1] ?? '') : '',
          rateCardRef: plan.rateCardRef ?? '',
        });
      }
    } else if (templateId) {
      const tmpl = PLAN_TEMPLATES.find((t) => t.id === templateId);
      if (tmpl) {
        patch({
          productCode: tmpl.defaultProductCode ?? '',
          sumAssuredBasis: tmpl.defaultSumAssuredBasis ?? SumAssuredBasis.FLAT,
          coverPattern: tmpl.defaultCoverPattern ?? CoverPattern.LEVEL,
          benefitSchedule: (tmpl.defaultBenefits ?? []).join('\n'),
        });
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bundle]);

  if (!bundle) return null;

  const rfqId = bundle.rfqId;
  const filteredProducts = PRODUCT_CATALOG.filter((p) =>
    p.allowedUsages.includes(bundle.schemeUsage)
  );

  function canAdvance(): boolean {
    if (step === 1) return !!state.productCode;
    if (step === 2) return !!state.planName.trim();
    if (step === 3) return !!state.uwMethod;
    if (step === 4) return !!state.rateCardRef;
    return true;
  }

  // ── Step renderers ────────────────────────────────────────────────────────

  function renderStep1() {
    const schemeUsageSet = !!bundle?.schemeUsage;
    return (
      <div className="space-y-4">
        <h2 className="text-base font-semibold">Select Product</h2>
        {!schemeUsageSet && (
          <div className="flex items-start gap-2 rounded-lg bg-amber-50 border border-amber-200 px-4 py-3">
            <AlertTriangle className="size-4 text-amber-600 mt-0.5 shrink-0" />
            <p className="text-xs text-amber-800">
              Scheme usage is not set on this RFQ. Update Key Data first.
            </p>
          </div>
        )}
        {filteredProducts.length === 0 && schemeUsageSet && (
          <p className="text-sm text-muted-foreground italic">
            No products available for the current scheme usage ({bundle?.schemeUsage}).
          </p>
        )}
        <div className="space-y-2">
          {filteredProducts.map((prod) => (
            <button
              key={prod.id}
              className={cn(
                'w-full text-left rounded-lg border px-4 py-3 transition-colors',
                state.productCode === prod.id
                  ? 'border-primary bg-primary/5'
                  : 'border-border hover:bg-muted/30'
              )}
              onClick={() => patch({ productCode: prod.id })}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-medium">{prod.name}</p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">{prod.description}</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-[10px] text-muted-foreground">{prod.uin}</span>
                  {state.productCode === prod.id && (
                    <CheckCircle2 className="size-4 text-primary shrink-0" />
                  )}
                </div>
              </div>
              <div className="flex flex-wrap gap-1 mt-2">
                {prod.allowedUsages.map((u) => (
                  <span key={u} className="text-[9px] bg-muted border border-border/50 rounded-full px-1.5 py-0.5">{u}</span>
                ))}
              </div>
            </button>
          ))}
        </div>
      </div>
    );
  }

  function renderStep2() {
    return (
      <div className="space-y-4">
        <h2 className="text-base font-semibold">Coverage Design</h2>
        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2 space-y-1">
            <FieldLabel>Plan Name *</FieldLabel>
            <Input
              value={state.planName}
              onChange={(e) => patch({ planName: e.target.value })}
              placeholder="e.g. Standard GTL — Grade A"
            />
          </div>
          <div className="space-y-1">
            <FieldLabel>Sum Assured Basis</FieldLabel>
            <select
              className="w-full text-sm border border-border rounded-lg px-3 py-2 bg-background focus:outline-none focus:ring-1 focus:ring-primary/30"
              value={state.sumAssuredBasis}
              onChange={(e) => patch({ sumAssuredBasis: e.target.value as SumAssuredBasis })}
            >
              {Object.values(SumAssuredBasis).map((v) => (
                <option key={v} value={v}>{v.replace(/_/g, ' ')}</option>
              ))}
            </select>
          </div>
          <div className="space-y-1">
            <FieldLabel>Cover Pattern</FieldLabel>
            <select
              className="w-full text-sm border border-border rounded-lg px-3 py-2 bg-background focus:outline-none focus:ring-1 focus:ring-primary/30"
              value={state.coverPattern}
              onChange={(e) => patch({ coverPattern: e.target.value as CoverPattern })}
            >
              {Object.values(CoverPattern).map((v) => (
                <option key={v} value={v}>{v}</option>
              ))}
            </select>
          </div>
          <div className="space-y-1">
            <FieldLabel>Min Entry Age</FieldLabel>
            <Input type="number" value={state.minAge} onChange={(e) => patch({ minAge: e.target.value })} placeholder="18" />
          </div>
          <div className="space-y-1">
            <FieldLabel>Max Entry Age</FieldLabel>
            <Input type="number" value={state.maxAge} onChange={(e) => patch({ maxAge: e.target.value })} placeholder="65" />
          </div>
          <div className="space-y-1">
            <FieldLabel>Min Service Months</FieldLabel>
            <Input type="number" value={state.minServiceMonths} onChange={(e) => patch({ minServiceMonths: e.target.value })} placeholder="0" />
          </div>
          <div className="col-span-2 space-y-1">
            <FieldLabel>Eligibility Criteria</FieldLabel>
            <Input
              value={state.eligibilityCriteria}
              onChange={(e) => patch({ eligibilityCriteria: e.target.value })}
              placeholder="e.g. All permanent employees on payroll"
            />
          </div>
          <div className="col-span-2 space-y-1">
            <FieldLabel>Benefit Schedule (one line per benefit)</FieldLabel>
            <Textarea
              rows={4}
              value={state.benefitSchedule}
              onChange={(e) => patch({ benefitSchedule: e.target.value })}
              placeholder={`Death benefit equal to sum assured\nNatural death benefit`}
            />
          </div>
        </div>
      </div>
    );
  }

  function renderStep3() {
    const methods = [
      {
        value: 'MEDICAL',
        label: 'Medical',
        desc: 'Medical examination required above the threshold sum assured.',
      },
      {
        value: 'NON_MEDICAL',
        label: 'Non-Medical',
        desc: 'No medical examination — relies on declaration form only.',
      },
      {
        value: 'FREE_COVER_LIMIT',
        label: 'Free Cover Limit',
        desc: 'Automatic cover up to FCL; medical examination required above the limit.',
      },
    ] as const;

    return (
      <div className="space-y-4">
        <h2 className="text-base font-semibold">Underwriting Method</h2>
        <div className="space-y-2">
          {methods.map((m) => (
            <button
              key={m.value}
              className={cn(
                'w-full text-left rounded-lg border px-4 py-3 transition-colors',
                state.uwMethod === m.value ? 'border-primary bg-primary/5' : 'border-border hover:bg-muted/30'
              )}
              onClick={() => patch({ uwMethod: m.value })}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-medium">{m.label}</p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">{m.desc}</p>
                </div>
                {state.uwMethod === m.value && <CheckCircle2 className="size-4 text-primary shrink-0 mt-0.5" />}
              </div>
            </button>
          ))}
        </div>
        {state.uwMethod === 'FREE_COVER_LIMIT' && (
          <div className="space-y-1">
            <FieldLabel>Free Cover Limit Amount (₹)</FieldLabel>
            <Input
              type="number"
              value={state.fclAmount}
              onChange={(e) => patch({ fclAmount: e.target.value })}
              placeholder="e.g. 2500000"
            />
          </div>
        )}
        {state.uwMethod === 'MEDICAL' && (
          <div className="space-y-1">
            <FieldLabel>Medical Threshold — Sum Assured (₹)</FieldLabel>
            <Input
              type="number"
              value={state.medicalThreshold}
              onChange={(e) => patch({ medicalThreshold: e.target.value })}
              placeholder="e.g. 5000000"
            />
          </div>
        )}
      </div>
    );
  }

  function renderStep4() {
    return (
      <div className="space-y-4">
        <h2 className="text-base font-semibold">Rate Card</h2>
        <div className="space-y-2">
          {RATE_CARDS.map((card) => (
            <button
              key={card.ref}
              className={cn(
                'w-full text-left rounded-lg border px-4 py-3 transition-colors',
                state.rateCardRef === card.ref ? 'border-primary bg-primary/5' : 'border-border hover:bg-muted/30'
              )}
              onClick={() => patch({ rateCardRef: card.ref })}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-medium">{card.name}</p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    {card.insurer} · Gross-up {card.grossUpFactor}× · GST {card.gstPct}% · {card.blendedRatePermille}‰ blended
                  </p>
                </div>
                {state.rateCardRef === card.ref && <CheckCircle2 className="size-4 text-primary shrink-0 mt-0.5" />}
              </div>
              <p className="text-[10px] text-muted-foreground mt-1.5 font-mono">
                {card.ref} · {card.effectiveFrom} → {card.effectiveTo}
              </p>
            </button>
          ))}
        </div>
      </div>
    );
  }

  function renderStep5() {
    return (
      <div className="space-y-4">
        <h2 className="text-base font-semibold">Riders &amp; Add-ons</h2>
        <p className="text-xs text-muted-foreground">Select optional riders to attach to this plan.</p>
        <div className="space-y-2">
          {AVAILABLE_RIDERS.map((rider) => {
            const selected = state.selectedRiders.includes(rider.id);
            return (
              <button
                key={rider.id}
                className={cn(
                  'w-full text-left rounded-lg border px-4 py-3 transition-colors',
                  selected ? 'border-primary bg-primary/5' : 'border-border hover:bg-muted/30'
                )}
                onClick={() =>
                  patch({
                    selectedRiders: selected
                      ? state.selectedRiders.filter((r) => r !== rider.id)
                      : [...state.selectedRiders, rider.id],
                  })
                }
              >
                <div className="flex items-start gap-3">
                  <div className={cn(
                    'mt-0.5 size-4 rounded border flex items-center justify-center shrink-0',
                    selected ? 'bg-primary border-primary' : 'border-muted-foreground/40'
                  )}>
                    {selected && <CheckCircle2 className="size-3 text-white" />}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-sm font-medium">{rider.name}</p>
                      <span className="text-[10px] text-muted-foreground">
                        {rider.rateType === 'flat'
                          ? `${rider.defaultRate}‰ flat`
                          : `${rider.defaultRate}% of base`}
                      </span>
                    </div>
                    <p className="text-[11px] text-muted-foreground mt-0.5">{rider.description}</p>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  function renderStep6() {
    const product = PRODUCT_CATALOG.find((p) => p.id === state.productCode);
    const rateCard = RATE_CARDS.find((r) => r.ref === state.rateCardRef);
    const riders = AVAILABLE_RIDERS.filter((r) => state.selectedRiders.includes(r.id));
    const benefitLines = state.benefitSchedule.split('\n').filter(Boolean).length;

    return (
      <div className="space-y-4">
        <h2 className="text-base font-semibold">Review &amp; Save</h2>
        <div className="rounded-lg border border-border bg-muted/20 divide-y divide-border/50">
          <ReviewRow label="Product" value={product?.name ?? '—'} />
          <ReviewRow label="Plan Name" value={state.planName || '—'} />
          <ReviewRow label="SA Basis" value={state.sumAssuredBasis.replace(/_/g, ' ')} />
          <ReviewRow label="Cover Pattern" value={state.coverPattern} />
          <ReviewRow label="Eligibility" value={state.eligibilityCriteria || '—'} />
          <ReviewRow
            label="Entry Age"
            value={state.minAge || state.maxAge ? `${state.minAge || '?'} – ${state.maxAge || '?'} years` : '—'}
          />
          <ReviewRow label="UW Method" value={state.uwMethod ? state.uwMethod.replace(/_/g, ' ') : '—'} />
          {state.uwMethod === 'FREE_COVER_LIMIT' && state.fclAmount && (
            <ReviewRow label="FCL Amount" value={`₹${Number(state.fclAmount).toLocaleString()}`} />
          )}
          {state.uwMethod === 'MEDICAL' && state.medicalThreshold && (
            <ReviewRow label="Medical Threshold" value={`₹${Number(state.medicalThreshold).toLocaleString()} SA`} />
          )}
          <ReviewRow label="Rate Card" value={rateCard ? `${rateCard.name} (${rateCard.ref})` : '—'} />
          <ReviewRow
            label="Riders"
            value={riders.length > 0 ? riders.map((r) => r.name).join(', ') : 'None'}
          />
          <ReviewRow
            label="Benefits"
            value={benefitLines > 0 ? `${benefitLines} line(s)` : 'None'}
          />
        </div>
      </div>
    );
  }

  // ── Save ────────────────────────────────────────────────────────────────────

  async function handleSave() {
    if (!bundle) return;
    setSaving(true);
    try {
      const benefits: string[] = [
        ...state.benefitSchedule.split('\n').filter((l) => l.trim()),
        ...AVAILABLE_RIDERS.filter((r) => state.selectedRiders.includes(r.id)).map((r) => r.name),
      ];

      const uwMethodFull =
        state.uwMethod === 'FREE_COVER_LIMIT' && state.fclAmount
          ? `FREE_COVER_LIMIT:${state.fclAmount}`
          : state.uwMethod === 'MEDICAL' && state.medicalThreshold
          ? `MEDICAL:${state.medicalThreshold}`
          : state.uwMethod;

      // Build a representative plan for completeness computation
      const planForCompleteness: Plan = {
        planId: editPlanId ?? '',
        rfqId,
        quoteVersionId: bundle.activeVersionId,
        name: state.planName,
        productCode: state.productCode || undefined,
        sumAssuredBasis: state.sumAssuredBasis,
        coverPattern: state.coverPattern,
        eligibilityCriteria: state.eligibilityCriteria || undefined,
        uwMethod: uwMethodFull || undefined,
        rateCardRef: state.rateCardRef || undefined,
        benefits,
        excludedClauses: [],
        handoffStatus: PlanHandoffStatus.DRAFT,
        completeness: 0,
      };
      const completeness = computePlanCompleteness(planForCompleteness);

      const payload: Omit<Partial<Plan>, 'planId' | 'rfqId'> = {
        quoteVersionId: bundle.activeVersionId,
        name: state.planName,
        productCode: state.productCode || undefined,
        sumAssuredBasis: state.sumAssuredBasis,
        coverPattern: state.coverPattern,
        eligibilityCriteria: state.eligibilityCriteria || undefined,
        uwMethod: uwMethodFull || undefined,
        rateCardRef: state.rateCardRef || undefined,
        benefits,
        excludedClauses: [],
        handoffStatus: PlanHandoffStatus.DRAFT,
        completeness,
      };

      if (editPlanId) {
        await updatePlan(rfqId, editPlanId, payload);
      } else {
        await createPlan(rfqId, payload);
      }
      await refetch();
      router.push(`/rfqs/${rfqId}/plans`);
    } catch {
      setSaving(false);
    }
  }

  const stepRenderers = [renderStep1, renderStep2, renderStep3, renderStep4, renderStep5, renderStep6];

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Top bar */}
      <div className="border-b border-border bg-card px-6 py-3">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <button
            className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground"
            onClick={() => router.push(`/rfqs/${rfqId}/plans`)}
          >
            <ChevronLeft className="size-3.5" /> Back to plans
          </button>
          <h1 className="text-sm font-semibold">{editPlanId ? 'Edit Plan' : 'New Plan Wizard'}</h1>
          <div className="w-24" />
        </div>
      </div>

      {/* Step progress */}
      <div className="border-b border-border bg-card/50 px-6 py-3">
        <div className="max-w-2xl mx-auto flex items-center">
          {STEP_LABELS.map((label, idx) => {
            const n = idx + 1;
            const done = n < step;
            const current = n === step;
            return (
              <div key={n} className="flex items-center">
                <div className={cn(
                  'flex items-center gap-1.5 text-xs',
                  done ? 'text-green-600' : current ? 'text-primary' : 'text-muted-foreground'
                )}>
                  <div className={cn(
                    'size-5 rounded-full flex items-center justify-center text-[10px] font-bold border',
                    done ? 'bg-green-500 border-green-500 text-white' :
                    current ? 'bg-primary border-primary text-white' :
                    'bg-background border-border text-muted-foreground'
                  )}>
                    {done ? '✓' : n}
                  </div>
                  <span className="hidden sm:block whitespace-nowrap">{label}</span>
                </div>
                {idx < STEP_LABELS.length - 1 && (
                  <div className={cn('w-4 h-px mx-1.5 shrink-0', done ? 'bg-green-400' : 'bg-border')} />
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Step content */}
      <div className="flex-1 px-6 py-8">
        <div className="max-w-2xl mx-auto">
          {stepRenderers[step - 1]?.()}
        </div>
      </div>

      {/* Footer nav */}
      <div className="border-t border-border bg-card px-6 py-4">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <Button
            variant="outline"
            onClick={() => {
              if (step === 1) router.push(`/rfqs/${rfqId}/plans`);
              else setStep(step - 1);
            }}
          >
            {step === 1 ? 'Cancel' : <><ChevronLeft className="size-4 mr-1" /> Previous</>}
          </Button>
          {step < 6 ? (
            <Button onClick={() => setStep(step + 1)} disabled={!canAdvance()}>
              Next <ChevronRight className="size-4 ml-1" />
            </Button>
          ) : (
            <Button
              onClick={handleSave}
              disabled={saving || !state.planName.trim()}
              className="min-w-[120px]"
            >
              {saving ? 'Saving…' : editPlanId ? 'Update Plan' : 'Save Plan'}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Page (Suspense boundary for useSearchParams) ─────────────────────────────

export default function NewPlanPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-sm text-muted-foreground">Loading…</div>}>
      <NewPlanWizard />
    </Suspense>
  );
}

