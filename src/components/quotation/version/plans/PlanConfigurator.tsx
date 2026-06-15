'use client';

/**
 * PlanConfigurator
 *
 * Full-width sliding panel with 5-step horizontal stepper.
 * Appears over the Plans tab content (not a modal).
 */

import { useState } from 'react';
import { Check, X } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';

import { Step1ProductsRiders } from './Step1ProductsRiders';
import { Step2Benefits, buildDefaultStep2 } from './Step2Benefits';
import { Step3EligibilitySI, DEFAULT_STEP3 } from './Step3EligibilitySI';
import { Step4UWValues, DEFAULT_STEP4 } from './Step4UWValues';
import { Step5RateCard, DEFAULT_STEP5 } from './Step5RateCard';

import { PRODUCT_CATALOG } from '@/mocks/group-pas/quotation/data';
import type {
  PlanBenefitV2,
  PlanDefinition,
  PlanProductV2,
  PlanV2,
  SchemeType,
  QuoteVersionStatus,
} from '@/types/group-pas/quotation-v2';
import type { Step1State } from './Step1ProductsRiders';
import type { Step2State } from './Step2Benefits';
import type { Step3State } from './Step3EligibilitySI';
import type { Step4State } from './Step4UWValues';
import type { Step5State } from './Step5RateCard';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export interface PlanDraft {
  plan_id: string;
  plan_number: string;
  plan_name: string;
  step1: Step1State;
  step2: Step2State;
  step3: Step3State;
  step4: Step4State;
  step5: Step5State;
}

interface Props {
  schemeType: SchemeType;
  versionStatus: QuoteVersionStatus;
  totalPlansCount: number;
  /** null = new plan */
  initialPlan: PlanDraft | null;
  onSave: (plan: PlanV2) => void;
  onClose: () => void;
}

// ─────────────────────────────────────────────────────────────────────────────
// Steps definition
// ─────────────────────────────────────────────────────────────────────────────

const STEPS = [
  { id: 1, label: 'Products & Riders' },
  { id: 2, label: 'Benefits' },
  { id: 3, label: 'Eligibility & SI' },
  { id: 4, label: 'UW Values' },
  { id: 5, label: 'Rate Card' },
];

// ─────────────────────────────────────────────────────────────────────────────
// Summary drawer
// ─────────────────────────────────────────────────────────────────────────────

function SummaryDrawer({
  planName,
  step1,
  step2,
  step3,
  step4,
  step5,
}: {
  planName: string;
  step1: Step1State;
  step2: Step2State;
  step3: Step3State;
  step4: Step4State;
  step5: Step5State;
}) {
  const baseProduct = PRODUCT_CATALOG.find((p) => p.productCode === step1.baseProductCode);
  const enabledBenefits = Object.values(step2.benefitMap).filter((b) => b.enabled).length;
  const siSpec = step3.siRule.spec;
  const siSummary =
    siSpec.type === 'FIXED'
      ? `Fixed: ${Number(siSpec.value).toLocaleString('en-IN')}`
      : step3.siRule.ruleType;

  return (
    <aside className="flex w-[240px] shrink-0 flex-col border-l bg-muted/20">
      <div className="border-b px-3 py-2.5">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
          Plan Summary
        </p>
      </div>
      <div className="flex flex-col gap-3 overflow-y-auto px-3 py-3 text-xs">
        <div>
          <p className="text-[10px] text-muted-foreground">Plan name</p>
          <p className="font-medium">{planName || '—'}</p>
        </div>
        <Separator />
        <div>
          <p className="text-[10px] text-muted-foreground">Base product</p>
          <p className="font-medium">{baseProduct?.productName ?? '—'}</p>
        </div>
        {step1.selectedRiderCodes.length > 0 && (
          <div>
            <p className="text-[10px] text-muted-foreground">Riders</p>
            <div className="mt-0.5 flex flex-wrap gap-1">
              {step1.selectedRiderCodes.map((c) => (
                <Badge key={c} variant="outline" className="text-[10px]">
                  {PRODUCT_CATALOG.find((p) => p.productCode === c)?.productName ?? c}
                </Badge>
              ))}
            </div>
          </div>
        )}
        <Separator />
        <div>
          <p className="text-[10px] text-muted-foreground">Benefits enabled</p>
          <p className="font-medium">{enabledBenefits}</p>
        </div>
        <Separator />
        <div>
          <p className="text-[10px] text-muted-foreground">SI rule</p>
          <p className="font-medium">{siSummary}</p>
        </div>
        <div>
          <p className="text-[10px] text-muted-foreground">FCL rule</p>
          <p className="font-medium">{step4.fclRule.ruleType}</p>
        </div>
        <div>
          <p className="text-[10px] text-muted-foreground">NML rule</p>
          <p className="font-medium">{step4.nmlRule.ruleType}</p>
        </div>
        <Separator />
        <div>
          <p className="text-[10px] text-muted-foreground">Rate card rule</p>
          <p className="font-medium">{step5.rateCardRule.ruleType}</p>
        </div>
      </div>
    </aside>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Build PlanV2 from draft
// ─────────────────────────────────────────────────────────────────────────────

function draftToPlanV2(draft: PlanDraft): PlanV2 {
  const baseProduct = PRODUCT_CATALOG.find((p) => p.productCode === draft.step1.baseProductCode);
  const riderProducts = PRODUCT_CATALOG.filter((p) =>
    draft.step1.selectedRiderCodes.includes(p.productCode),
  );
  const allProducts = baseProduct ? [baseProduct, ...riderProducts] : riderProducts;

  const planProducts: PlanProductV2[] = allProducts.map((p) => ({
    productCode: p.productCode,
    productName: p.productName,
    productType: p.productType,
    benefits: p.defaultBenefits
      .filter((b) => {
        const bwo = draft.step2.benefitMap[b.code];
        return bwo ? bwo.enabled : b.mandatory;
      })
      .map((b) => ({ ...b })),
  }));

  const siSpec = draft.step3.siRule.spec;
  const siDef: PlanDefinition['si'] =
    siSpec.type === 'FIXED'
      ? { basis: 'FIXED', fixedAmount: { amount: Number(siSpec.value), currency: 'INR' } }
      : { basis: 'MULTIPLE_OF_SALARY', multiplier: 24 };

  const fclSpec = draft.step4.fclRule.spec;
  const fclDef: PlanDefinition['fcl'] = {
    type: 'FIXED',
    amount: {
      amount: fclSpec.type === 'FIXED' ? Number(fclSpec.value) : 2000000,
      currency: 'INR',
    },
  };

  const nmlSpec = draft.step4.nmlRule.spec;
  const nmlDef: PlanDefinition['nml'] = {
    type: 'FIXED',
    amount: {
      amount: nmlSpec.type === 'FIXED' ? Number(nmlSpec.value) : 3000000,
      currency: 'INR',
    },
  };

  return {
    plan_id: draft.plan_id,
    plan_number: draft.plan_number,
    plan_name: draft.plan_name,
    plan_definition: {
      plan_product: planProducts,
      si: siDef,
      fcl: fclDef,
      nml: nmlDef,
      rate_card: {
        rateCardId: `RC-${draft.plan_id}`,
        rateCardName: `Rate Card — ${draft.plan_name}`,
        effectiveFrom: new Date().toISOString().slice(0, 10),
      },
    },
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Stepper
// ─────────────────────────────────────────────────────────────────────────────

function Stepper({
  current,
  completed,
  onNavigate,
}: {
  current: number;
  completed: Set<number>;
  onNavigate: (step: number) => void;
}) {
  return (
    <div className="flex items-center gap-0 px-6 py-3">
      {STEPS.map((step, i) => {
        const isDone = completed.has(step.id);
        const isCurrent = current === step.id;
        const canClick = isDone || isCurrent || (step.id <= Math.max(...Array.from(completed)) + 1);

        return (
          <div key={step.id} className="flex flex-1 items-center">
            <button
              onClick={() => canClick && onNavigate(step.id)}
              disabled={!canClick}
              className="flex flex-col items-center gap-1"
            >
              <div
                className={`flex size-7 items-center justify-center rounded-full text-xs font-semibold ring-2 transition-colors ${
                  isDone
                    ? 'bg-indigo-600 ring-indigo-600 text-white'
                    : isCurrent
                    ? 'bg-white ring-indigo-600 text-indigo-700'
                    : 'bg-muted ring-border text-muted-foreground'
                } ${canClick ? 'cursor-pointer' : 'cursor-not-allowed opacity-50'}`}
              >
                {isDone ? <Check className="size-3.5" /> : step.id}
              </div>
              <span
                className={`whitespace-nowrap text-[10px] font-medium ${
                  isCurrent ? 'text-indigo-700' : isDone ? 'text-indigo-500' : 'text-muted-foreground'
                }`}
              >
                {step.label}
              </span>
            </button>
            {i < STEPS.length - 1 && (
              <div
                className={`mb-4 h-0.5 flex-1 ${isDone ? 'bg-indigo-500' : 'bg-border'}`}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main component
// ─────────────────────────────────────────────────────────────────────────────

function makeNewDraft(schemeType: SchemeType): PlanDraft {
  const now = Date.now();
  const step1: Step1State = { baseProductCode: '', selectedRiderCodes: [] };
  const step2 = buildDefaultStep2(step1, schemeType);
  return {
    plan_id: `PLN-NEW-${now}`,
    plan_number: `PLAN-NEW`,
    plan_name: '',
    step1,
    step2,
    step3: DEFAULT_STEP3,
    step4: DEFAULT_STEP4,
    step5: DEFAULT_STEP5,
  };
}

export function PlanConfigurator({
  schemeType,
  versionStatus,
  totalPlansCount,
  initialPlan,
  onSave,
  onClose,
}: Props) {
  const readOnly = versionStatus !== 'DRAFT';
  const uwApproved =
    versionStatus === 'EVALUATED' ||
    versionStatus === 'REFERRED_MANUAL_PRICING' ||
    versionStatus === 'RATED' ||
    versionStatus === 'SUBMITTED' ||
    versionStatus === 'SENT_TO_CLIENT' ||
    versionStatus === 'ACCEPTED' ||
    versionStatus === 'FINALIZED';
  const pricingApproved =
    versionStatus === 'RATED' ||
    versionStatus === 'SUBMITTED' ||
    versionStatus === 'SENT_TO_CLIENT' ||
    versionStatus === 'ACCEPTED' ||
    versionStatus === 'FINALIZED';

  const [draft, setDraft] = useState<PlanDraft>(
    initialPlan ?? makeNewDraft(schemeType),
  );
  const [currentStep, setCurrentStep] = useState(1);
  const [completed, setCompleted] = useState<Set<number>>(
    initialPlan ? new Set([1, 2, 3, 4, 5]) : new Set<number>(),
  );
  const [errors, setErrors] = useState<Record<number, string>>({});

  // ── Validation ────────────────────────────────────────────────────────────

  function validate(step: number): string | null {
    if (step === 1 && !draft.step1.baseProductCode) {
      return 'Select a base product.';
    }
    if (step === 3 && !draft.plan_name.trim()) {
      return 'Enter a plan name.';
    }
    return null;
  }

  // ── Navigation ────────────────────────────────────────────────────────────

  function goNext() {
    const err = validate(currentStep);
    if (err) {
      setErrors((e) => ({ ...e, [currentStep]: err }));
      return;
    }
    setErrors((e) => ({ ...e, [currentStep]: '' }));
    setCompleted((c) => new Set([...c, currentStep]));
    setCurrentStep((s) => Math.min(s + 1, 5));
  }

  function goBack() {
    setCurrentStep((s) => Math.max(s - 1, 1));
  }

  function navigateTo(step: number) {
    setCurrentStep(step);
  }

  // ── Save ──────────────────────────────────────────────────────────────────

  function handleSave() {
    // Validate all steps
    for (let s = 1; s <= 5; s++) {
      const err = validate(s);
      if (err) {
        setErrors((e) => ({ ...e, [s]: err }));
        setCurrentStep(s);
        return;
      }
    }
    const plan = draftToPlanV2(draft);
    onSave(plan);
  }

  // ── Update helpers ────────────────────────────────────────────────────────

  function updateStep1(step1: Step1State) {
    const step2 = buildDefaultStep2(step1, schemeType);
    setDraft((d) => ({ ...d, step1, step2 }));
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Render
  // ─────────────────────────────────────────────────────────────────────────

  return (
    <div className="flex h-full flex-col overflow-hidden bg-background">
      {/* Panel header */}
      <div className="flex items-center justify-between border-b px-6 py-4">
        <h2 className="text-base font-semibold">
          {initialPlan ? `Configure Plan — ${draft.plan_name || 'Untitled'}` : 'New Plan'}
        </h2>
        <button
          onClick={onClose}
          className="rounded p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground"
        >
          <X className="size-4" />
        </button>
      </div>

      {/* Plan name (always visible) */}
      {!readOnly && (
        <div className="flex items-center gap-3 border-b bg-muted/20 px-6 py-2">
          <label className="text-xs font-medium text-muted-foreground">Plan name</label>
          <input
            value={draft.plan_name}
            onChange={(e) => setDraft((d) => ({ ...d, plan_name: e.target.value }))}
            placeholder="e.g. GTL Standard"
            className="h-7 flex-1 rounded border border-input bg-background px-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
      )}
      {readOnly && draft.plan_name && (
        <div className="flex items-center gap-2 border-b bg-muted/20 px-6 py-2">
          <span className="text-xs text-muted-foreground">Plan name:</span>
          <span className="text-sm font-medium">{draft.plan_name}</span>
          <Badge variant="secondary" className="text-[10px]">Read-only</Badge>
        </div>
      )}

      {/* Stepper */}
      <div className="border-b">
        <Stepper current={currentStep} completed={completed} onNavigate={navigateTo} />
      </div>

      {/* Body: step content + summary drawer */}
      <div className="flex min-h-0 flex-1 overflow-hidden">
        {/* Step content */}
        <div className="flex-1 overflow-y-auto px-6 py-5">
          {errors[currentStep] && (
            <div className="mb-3 rounded bg-destructive/10 px-3 py-2 text-xs text-destructive">
              {errors[currentStep]}
            </div>
          )}

          {currentStep === 1 && (
            <Step1ProductsRiders
              schemeType={schemeType}
              value={draft.step1}
              onChange={updateStep1}
              readOnly={readOnly}
            />
          )}

          {currentStep === 2 && (
            <Step2Benefits
              schemeType={schemeType}
              step1={draft.step1}
              value={draft.step2}
              onChange={(step2) => setDraft((d) => ({ ...d, step2 }))}
              readOnly={readOnly}
            />
          )}

          {currentStep === 3 && (
            <Step3EligibilitySI
              value={draft.step3}
              onChange={(step3) => setDraft((d) => ({ ...d, step3 }))}
              readOnly={readOnly}
            />
          )}

          {currentStep === 4 && (
            <Step4UWValues
              value={draft.step4}
              onChange={(step4) => setDraft((d) => ({ ...d, step4 }))}
              readOnly={readOnly}
              uwApproved={uwApproved}
            />
          )}

          {currentStep === 5 && (
            <Step5RateCard
              value={draft.step5}
              onChange={(step5) => setDraft((d) => ({ ...d, step5 }))}
              readOnly={readOnly}
              pricingApproved={pricingApproved}
              totalPlansCount={totalPlansCount}
            />
          )}
        </div>

        {/* Summary drawer */}
        <SummaryDrawer
          planName={draft.plan_name}
          step1={draft.step1}
          step2={draft.step2}
          step3={draft.step3}
          step4={draft.step4}
          step5={draft.step5}
        />
      </div>

      {/* Bottom action bar */}
      <div className="flex items-center justify-between border-t bg-background px-6 py-3">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={onClose}>
            Cancel
          </Button>
        </div>
        <div className="flex items-center gap-2">
          {currentStep > 1 && (
            <Button variant="ghost" size="sm" onClick={goBack}>
              Back
            </Button>
          )}
          {currentStep < 5 && (
            <Button size="sm" onClick={goNext}>
              Next
            </Button>
          )}
          {currentStep === 5 && !readOnly && (
            <Button size="sm" onClick={handleSave}>
              Save Plan
            </Button>
          )}
          {readOnly && (
            <Button size="sm" variant="outline" onClick={onClose}>
              Close
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
