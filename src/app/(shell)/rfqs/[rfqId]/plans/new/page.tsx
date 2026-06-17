'use client';

import { useReducer, useEffect, useState, Suspense, useCallback } from 'react';
import { useRouter, useSearchParams, useParams } from 'next/navigation';
import {
  Check, ChevronLeft, ChevronRight, AlertTriangle, Info,
  Plus, X, Loader2, ChevronDown, ChevronUp,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useRfqBundle } from '@/context/RfqBundleContext';
import { useRole } from '@/hooks/useRole';
import { computePlanCompleteness } from '@/lib/computations';
import {
  createPlan, updatePlan, updateRfq,
} from '@/lib/api/quotation-client';
import {
  getClauses, getRateCards, getFclSchedule,
  getDeviations, upsertDeviation, updateDeviationStage,
} from '@/lib/api/plan-wizard';
import {
  FILED_PRODUCTS, CLAUSE_LIBRARY, FCL_LIMIT_SCHEDULE,
  getMergedTemplates,
} from '@/lib/constants';
import {
  CoverPattern, SumAssuredBasis, LivesCovered,
  FclPattern, PlanHandoffStatus, EvidencePack, UwMethod,
  DeviationApprovalStage, DeviationScope, DeviationKind, SchemeUsage,
} from '@/lib/types';
import type {
  ClauseLibraryItem, Deviation, ExcludedClause,
  FclScheduleEntry, FiledProduct, Plan,
  PlanRider, RateCard,
} from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';

// ─── Wizard state ─────────────────────────────────────────────────────────────

// ─── Step config ──────────────────────────────────────────────────────────────

const STEP_KEYS = ['product', 'coverage', 'eligibility', 'uw', 'pricing', 'deviations'] as const;
type StepKey = typeof STEP_KEYS[number];

const STEP_LABELS: Record<StepKey, string> = {
  product: 'Product & timing',
  coverage: 'Coverage, benefits & riders',
  eligibility: 'Member eligibility',
  uw: 'Underwriting & STP',
  pricing: 'Premium rate card',
  deviations: 'Deviations',
};

function stepIndexToKey(i: number): StepKey { return STEP_KEYS[i - 1]; }
function stepKeyToIndex(k: string): number {
  const i = STEP_KEYS.indexOf(k as StepKey);
  return i === -1 ? 1 : i + 1;
}

// ─── Wizard state ─────────────────────────────────────────────────────────────

interface WizardState {
  currentStep: number;
  visitedSteps: number[];
  productCode: string | null;
  selectedProduct: FiledProduct | null;
  planNumber: string;
  planName: string;
  effectiveFrom: string;
  effectiveTo: string;
  subsidiaryScope: 'WHOLE_GROUP' | string;
  coverPattern: CoverPattern | null;
  sumAssuredBasis: SumAssuredBasis | null;
  flatSi: number | null;
  salaryMultiple: number | null;
  gradeSlabs: Array<{ gradeId: string; grade: string; si: number }>;
  coversGrades: string[];
  benefits: string[];
  excludedBenefits: string[];
  excludedClauses: ExcludedClause[];
  riders: PlanRider[];
  minEntryAge: number | null;
  maxEntryAge: number | null;
  cessationAge: number | null;
  allowedEmploymentTypes: string[];
  livesCovered: LivesCovered | null;
  minGroupSize: number | null;
  uwMethod: UwMethod | null;
  fclInherited: boolean;
  fclPatternOverride: FclPattern | null;
  evidencePack: EvidencePack | null;
  reinsuranceTreatyOverride: string | null;
  rateCardRef: string | null;
  deviations: Deviation[];
  envelopeViolations: string[];
}

type WizardAction =
  | { type: 'PATCH'; payload: Partial<WizardState> }
  | { type: 'SELECT_PRODUCT'; product: FiledProduct; planCount: number }
  | { type: 'GO_STEP'; step: number }
  | { type: 'ADD_DEVIATION'; dev: Deviation }
  | { type: 'REPLACE_DEVIATION'; dev: Deviation }
  | { type: 'COMPUTE_ENVELOPE_VIOLATIONS' };

function computeEnvelopeViolations(s: WizardState): string[] {
  const violations: string[] = [];
  const env = s.selectedProduct?.filedEnvelope;
  if (!env) return [];
  if (s.flatSi !== null && s.sumAssuredBasis === SumAssuredBasis.FLAT) {
    if (s.flatSi < env.minSumAssured)
      violations.push(`Flat SI ₹${s.flatSi.toLocaleString()} is below the filed minimum of ₹${env.minSumAssured.toLocaleString()}`);
    if (s.flatSi > env.maxSumAssured)
      violations.push(`Flat SI ₹${s.flatSi.toLocaleString()} exceeds the filed maximum of ₹${env.maxSumAssured.toLocaleString()}`);
  }
  if (s.minEntryAge !== null && s.minEntryAge < env.minEntryAge)
    violations.push(`Min entry age ${s.minEntryAge} is below the filed floor of ${env.minEntryAge}`);
  if (s.maxEntryAge !== null && s.maxEntryAge > env.maxEntryAge)
    violations.push(`Max entry age ${s.maxEntryAge} exceeds the filed ceiling of ${env.maxEntryAge}`);
  if (s.cessationAge !== null && s.cessationAge > env.maxMaturityAge)
    violations.push(`Cessation age ${s.cessationAge} exceeds the filed max maturity of ${env.maxMaturityAge}`);
  if (s.minGroupSize !== null && s.minGroupSize < env.minGroupSize)
    violations.push(`Min group size ${s.minGroupSize} is below the filed minimum of ${env.minGroupSize}`);
  if (s.minEntryAge !== null && s.maxEntryAge !== null && s.cessationAge !== null) {
    if (!(s.minEntryAge < s.maxEntryAge && s.maxEntryAge <= s.cessationAge))
      violations.push('Age ladder is inconsistent — min must be less than max, and max must not exceed cessation age.');
  }
  return violations;
}

function wizardReducer(s: WizardState, action: WizardAction): WizardState {
  switch (action.type) {
    case 'PATCH': {
      const next = { ...s, ...action.payload };
      return { ...next, envelopeViolations: computeEnvelopeViolations(next) };
    }
    case 'SELECT_PRODUCT': {
      const p = action.product;
      const clauseDefaults = CLAUSE_LIBRARY
        .filter((c) => p.benefitCodes.includes(c.code) && c.defaultIncluded)
        .map((c) => c.code);
      const oneYearLater = (from: string) => {
        if (!from) return '';
        const d = new Date(from);
        d.setFullYear(d.getFullYear() + 1);
        return d.toISOString().slice(0, 10);
      };
      const next: WizardState = {
        ...s,
        productCode: p.productCode,
        selectedProduct: p,
        planName: s.planName || p.name,
        planNumber: s.planNumber || `P-${String(action.planCount + 1).padStart(3, '0')}`,
        coverPattern: (p.coverPattern[0] as CoverPattern) ?? null,
        sumAssuredBasis: (p.allowedSaBases[0] as SumAssuredBasis) ?? null,
        uwMethod: p.allowedUwMethods.includes('STP' as UwMethod)
          ? UwMethod.STP
          : (p.allowedUwMethods[0] as UwMethod) ?? null,
        fclInherited: true,
        fclPatternOverride: null,
        evidencePack: p.defaultEvidencePack as EvidencePack,
        benefits: clauseDefaults,
        riders: [],
        effectiveTo: oneYearLater(s.effectiveFrom),
      };
      return { ...next, envelopeViolations: computeEnvelopeViolations(next) };
    }
    case 'GO_STEP': {
      const visited = new Set(s.visitedSteps);
      visited.add(s.currentStep);
      visited.add(action.step);
      return { ...s, currentStep: action.step, visitedSteps: Array.from(visited) };
    }
    case 'ADD_DEVIATION':
      return { ...s, deviations: [...s.deviations, action.dev] };
    case 'REPLACE_DEVIATION':
      return {
        ...s,
        deviations: s.deviations.map((d) => d.id === action.dev.id ? action.dev : d),
      };
    case 'COMPUTE_ENVELOPE_VIOLATIONS':
      return { ...s, envelopeViolations: computeEnvelopeViolations(s) };
    default:
      return s;
  }
}

const INITIAL_STATE: WizardState = {
  currentStep: 1,
  visitedSteps: [1],
  productCode: null,
  selectedProduct: null,
  planNumber: '',
  planName: '',
  effectiveFrom: '',
  effectiveTo: '',
  subsidiaryScope: 'WHOLE_GROUP',
  coverPattern: null,
  sumAssuredBasis: null,
  flatSi: null,
  salaryMultiple: null,
  gradeSlabs: [],
  coversGrades: [],
  benefits: [],
  excludedBenefits: [],
  excludedClauses: [],
  riders: [],
  minEntryAge: null,
  maxEntryAge: null,
  cessationAge: null,
  allowedEmploymentTypes: [],
  livesCovered: null,
  minGroupSize: null,
  uwMethod: null,
  fclInherited: true,
  fclPatternOverride: null,
  evidencePack: null,
  reinsuranceTreatyOverride: null,
  rateCardRef: null,
  deviations: [],
  envelopeViolations: [],
};

// ─── Small helpers ────────────────────────────────────────────────────────────

function fmtINR(n: number) {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n);
}

function Notice({ variant, children }: { variant: 'info' | 'amber' | 'green' | 'red'; children: React.ReactNode }) {
  const cls = {
    info:  'bg-blue-50 border-blue-200 text-blue-800',
    amber: 'bg-amber-50 border-amber-200 text-amber-800',
    green: 'bg-green-50 border-green-200 text-green-700',
    red:   'bg-red-50 border-red-200 text-red-700',
  }[variant];
  return (
    <div className={cn('flex items-start gap-2 rounded-lg border px-3 py-2 text-xs', cls)}>
      {variant === 'amber' || variant === 'info' ? <AlertTriangle className="size-3.5 mt-0.5 shrink-0" /> : <Info className="size-3.5 mt-0.5 shrink-0" />}
      <span>{children}</span>
    </div>
  );
}

function FieldRow({ label, children, error }: { label: string; children: React.ReactNode; error?: string }) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-xs font-medium text-muted-foreground">{label}</label>
      {children}
      {error && <p className="text-[10px] text-destructive">{error}</p>}
    </div>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <h3 className="text-sm font-semibold text-foreground mb-3">{children}</h3>;
}

// ─── Stepper ──────────────────────────────────────────────────────────────────

function isStepComplete(state: WizardState, stepNo: number): boolean {
  switch (stepNo) {
    case 1: return !!(state.productCode && state.effectiveFrom);
    case 2: return !!(state.sumAssuredBasis && state.benefits.length > 0);
    case 3: return !!state.livesCovered;
    case 4: return !!(state.uwMethod && state.evidencePack && (state.fclInherited || state.fclPatternOverride));
    case 5: return !!state.rateCardRef;
    case 6: return true; // deviations step is always optional
    default: return false;
  }
}

function Stepper({ state, dispatch }: { state: WizardState; dispatch: React.Dispatch<WizardAction> }) {
  const steps = STEP_KEYS.map((k, i) => ({ key: k, label: STEP_LABELS[k], stepNo: i + 1 }));
  const doneCount = steps.filter(({ stepNo }) => isStepComplete(state, stepNo) && stepNo !== state.currentStep && state.visitedSteps.includes(stepNo)).length;

  return (
    <div className="flex flex-col gap-1 w-52 shrink-0">
      <div className="text-[10px] text-muted-foreground mb-2 font-medium">
        {doneCount} / {steps.length} steps done
      </div>
      {steps.map(({ key, label, stepNo }) => {
        const isCurrent = state.currentStep === stepNo;
        const isDone = isStepComplete(state, stepNo) && !isCurrent && state.visitedSteps.includes(stepNo);
        const isClickable = isDone || isCurrent || state.visitedSteps.includes(stepNo);
        return (
          <button
            key={key}
            disabled={!isClickable}
            onClick={() => isClickable && dispatch({ type: 'GO_STEP', step: stepNo })}
            className={cn(
              'flex items-center gap-2.5 px-3 py-2 rounded-lg text-left text-xs transition-colors',
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
              {isDone ? <Check className="size-3" /> : stepNo}
            </span>
            {label}
          </button>
        );
      })}
    </div>
  );
}

// ─── Selection recap sidebar ──────────────────────────────────────────────────

function RecapSidebar({ state }: { state: WizardState }) {
  function Row({ label, value }: { label: string; value?: string | null }) {
    return (
      <div className="flex justify-between gap-2 py-1 border-b border-border/30 last:border-0">
        <span className="text-[11px] text-muted-foreground shrink-0">{label}</span>
        {value
          ? <span className="text-[11px] font-medium text-right truncate min-w-0">{value}</span>
          : <span className="text-[11px] text-muted-foreground/40 italic">—</span>
        }
      </div>
    );
  }

  function Card({ title, children }: { title: string; children: React.ReactNode }) {
    return (
      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <div className="px-3 pt-2.5 pb-1.5 border-b border-border/50">
          <p className="text-[9px] font-semibold uppercase tracking-wider text-muted-foreground">{title}</p>
        </div>
        <div className="px-3 py-1.5">{children}</div>
      </div>
    );
  }

  const totalCoveredLives = state.coversGrades.length === 0 ? '(all grades)' : `${state.coversGrades.length} grade(s)`;

  return (
    <div className="w-full flex flex-col">
      <div className="pb-3 mb-3 border-b border-border/30">
        <p className="text-sm font-semibold text-foreground">Plan summary</p>
        <p className="text-xs text-muted-foreground mt-0.5">Updates as you fill in the form</p>
      </div>
      <div className="flex flex-col gap-3">
        {/* Identity card */}
        <div className="rounded-xl border border-border bg-card px-3 py-3">
          <div className="flex items-start justify-between gap-2 mb-1.5">
            <div className="min-w-0">
              <p className={`text-sm font-semibold truncate leading-tight ${state.planName ? 'text-foreground' : 'text-muted-foreground/40 italic'}`}>
                {state.planName || 'Plan name'}
              </p>
              {state.planNumber && (
                <p className="text-[11px] text-muted-foreground mt-0.5 truncate">#{state.planNumber}</p>
              )}
            </div>
            {state.selectedProduct?.lob && (
              <span className="text-[10px] bg-muted border border-border rounded-full px-2 py-0.5 shrink-0 font-medium">
                {state.selectedProduct.lob}
              </span>
            )}
          </div>
          {state.selectedProduct?.name && (
            <p className="text-[11px] text-muted-foreground truncate mt-1 pt-1.5 border-t border-border/40">
              {state.selectedProduct.name}
            </p>
          )}
          {(state.effectiveFrom || state.effectiveTo) && (
            <div className="flex items-center gap-1.5 mt-1.5 pt-1.5 border-t border-border/40 flex-wrap">
              {state.effectiveFrom && (
                <span className="text-[10px] bg-muted border border-border rounded px-1.5 py-0.5">{state.effectiveFrom}</span>
              )}
              {state.effectiveFrom && state.effectiveTo && <span className="text-[10px] text-muted-foreground">→</span>}
              {state.effectiveTo && (
                <span className="text-[10px] bg-muted border border-border rounded px-1.5 py-0.5">{state.effectiveTo}</span>
              )}
            </div>
          )}
        </div>

        <Card title="Coverage">
          <Row label="SA basis" value={state.sumAssuredBasis} />
          <Row label="Cover pattern" value={state.coverPattern} />
          <Row label="Grades" value={totalCoveredLives} />
          <Row label="Flat SI" value={state.flatSi !== null ? fmtINR(state.flatSi) : null} />
          <Row label="Salary ×" value={state.salaryMultiple !== null ? `${state.salaryMultiple}×` : null} />
          <Row label="Benefits" value={state.benefits.length > 0 ? `${state.benefits.length} selected` : null} />
          <Row label="Riders" value={state.riders.length > 0 ? `${state.riders.length}` : null} />
          <Row label="Carve-outs" value={state.excludedClauses.length > 0 ? `${state.excludedClauses.length}` : null} />
        </Card>

        <Card title="Eligibility">
          <Row label="Ages" value={state.minEntryAge !== null && state.maxEntryAge !== null ? `${state.minEntryAge}–${state.maxEntryAge}` : null} />
          <Row label="Cessation" value={state.cessationAge !== null ? String(state.cessationAge) : null} />
          <Row label="Lives covered" value={state.livesCovered} />
          <Row label="Min group" value={state.minGroupSize !== null ? String(state.minGroupSize) : null} />
        </Card>

        <Card title="Underwriting">
          <Row label="UW method" value={state.uwMethod} />
          <Row label="FCL mode" value={state.fclInherited ? 'Inherited' : (state.fclPatternOverride ?? null)} />
          <Row label="Evidence" value={state.evidencePack} />
        </Card>

        <Card title="Pricing">
          <Row label="Rate card" value={state.rateCardRef} />
        </Card>
      </div>
    </div>
  );
}

// ─── Step 1 ───────────────────────────────────────────────────────────────────

function Step1({ state, dispatch, planCount, schemeUsage }: {
  state: WizardState;
  dispatch: React.Dispatch<WizardAction>;
  planCount: number;
  schemeUsage?: SchemeUsage;
}) {
  const gtlProducts = FILED_PRODUCTS.filter((p) => p.lob === 'GTL');

  function getProductGate(p: FiledProduct): { blocked: boolean; reason: string } {
    if (p.salesStatus === 'CLOSED_TO_NEW_BUSINESS') return { blocked: true, reason: 'Closed to new business' };
    if (p.salesStatus === 'WITHDRAWN') return { blocked: true, reason: 'Withdrawn' };
    if (p.salesStatus === 'IN_REVIEW') return { blocked: true, reason: 'In review' };
    if (p.artifactStatus === 'DRAFT') return { blocked: true, reason: 'Draft — not published' };
    if (p.artifactStatus === 'RETIRED') return { blocked: true, reason: 'Retired' };
    if (schemeUsage && p.allowedUsages.length > 0 && !p.allowedUsages.includes(schemeUsage))
      return { blocked: true, reason: `Not filed for "${schemeUsage}"` };
    return { blocked: false, reason: '' };
  }

  function patch(p: Partial<WizardState>) { dispatch({ type: 'PATCH', payload: p }); }

  const addOneYear = (from: string) => {
    if (!from) return '';
    const d = new Date(from);
    d.setFullYear(d.getFullYear() + 1);
    return d.toISOString().slice(0, 10);
  };

  return (
    <div className="flex flex-col gap-5">
      {schemeUsage && (
        <Notice variant="info">
          Usage derived from scheme type — products must be filed for "{schemeUsage}".
        </Notice>
      )}
      <SectionTitle>Select product</SectionTitle>
      <div className="grid grid-cols-4 gap-3">
        {gtlProducts.map((p) => {
          const { blocked, reason } = getProductGate(p);
          const selected = state.productCode === p.productCode;
          return (
            <button
              key={p.productCode}
              disabled={blocked}
              onClick={() => !blocked && dispatch({ type: 'SELECT_PRODUCT', product: p, planCount })}
              className={cn(
                'flex flex-col gap-1 rounded-xl border p-3 text-left transition-all',
                selected ? 'border-foreground ring-1 ring-foreground bg-foreground/5' :
                blocked ? 'border-border/30 opacity-40 cursor-not-allowed bg-muted/20' :
                'border-border hover:border-foreground/50 bg-card cursor-pointer',
              )}
            >
              <div className="flex items-start justify-between gap-2">
                <span className={cn('text-xs font-semibold', blocked ? 'text-muted-foreground' : 'text-foreground')}>
                  {p.name}
                </span>
                {selected && <Check className="size-3.5 text-foreground shrink-0" />}
              </div>
              <span className="text-[10px] text-muted-foreground font-mono">{p.uin}</span>
              <p className="text-[10px] text-muted-foreground line-clamp-2 mt-0.5">{p.description}</p>
              <div className="flex flex-wrap gap-1 mt-1">
                <span className="text-[9px] bg-muted rounded px-1.5 py-0.5">{p.subFamily.replace(/_/g, ' ')}</span>
                {p.coverPattern.map((cp) => (
                  <span key={cp} className="text-[9px] bg-muted rounded px-1.5 py-0.5">{cp}</span>
                ))}
                {p.allowedSaBases.map((b) => (
                  <span key={b} className="text-[9px] bg-muted rounded px-1.5 py-0.5">{b.replace(/_/g, ' ')}</span>
                ))}
              </div>
              {blocked && <p className="text-[10px] text-destructive mt-1 font-medium">{reason}</p>}
            </button>
          );
        })}
      </div>
      {state.selectedProduct && (
        <>
          <div className="rounded-xl border border-border/40 bg-muted/20 p-3">
            <p className="text-[9px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">Product details</p>
            <div className="grid grid-cols-2 gap-x-4 gap-y-1">
              {[
                ['LoB', state.selectedProduct.lob],
                ['Sub-family', state.selectedProduct.subFamily.replace(/_/g, ' ')],
                ['Cover patterns', state.selectedProduct.coverPattern.join(', ')],
                ['SA bases', state.selectedProduct.allowedSaBases.map((b) => b.replace(/_/g, ' ')).join(', ')],
                ['SA range', `${fmtINR(state.selectedProduct.filedEnvelope.minSumAssured)} – ${fmtINR(state.selectedProduct.filedEnvelope.maxSumAssured)}`],
                ['Entry age', `${state.selectedProduct.filedEnvelope.minEntryAge}–${state.selectedProduct.filedEnvelope.maxEntryAge} (${state.selectedProduct.filedEnvelope.ageBasis})`],
                ['Cessation', String(state.selectedProduct.filedEnvelope.maxMaturityAge)],
                ['Default evidence', state.selectedProduct.defaultEvidencePack.replace(/_/g, ' ')],
              ].map(([label, value]) => (
                <div key={label} className="flex gap-1 text-[10px]">
                  <span className="text-muted-foreground shrink-0 w-28">{label}</span>
                  <span className="font-medium text-foreground">{value}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <FieldRow label="Plan number">
              <Input value={state.planNumber} onChange={(e) => patch({ planNumber: e.target.value })} className="h-8 text-sm" placeholder="P-001" />
            </FieldRow>
            <FieldRow label="Plan name">
              <Input value={state.planName} onChange={(e) => patch({ planName: e.target.value })} className="h-8 text-sm" placeholder={state.selectedProduct.name} />
            </FieldRow>
            <FieldRow label="Effective from *">
              <Input type="date" value={state.effectiveFrom} onChange={(e) => { const v = e.target.value; patch({ effectiveFrom: v, effectiveTo: addOneYear(v) }); }} className="h-8 text-sm" />
            </FieldRow>
            <FieldRow label="Effective to">
              <Input type="date" value={state.effectiveTo} onChange={(e) => patch({ effectiveTo: e.target.value })} className="h-8 text-sm" />
            </FieldRow>
          </div>
        </>
      )}
    </div>
  );
}

// ─── Step 2 ───────────────────────────────────────────────────────────────────

function Step2({ state, dispatch, bundle }: {
  state: WizardState;
  dispatch: React.Dispatch<WizardAction>;
  bundle: import('@/lib/types').RfqBundle;
}) {
  const p = state.selectedProduct;
  const [clausesLoading, setClausesLoading] = useState(false);
  const [clausesError, setClausesError] = useState<string | null>(null);
  const [clauseLibrary, setClauseLibrary] = useState<ClauseLibraryItem[]>(CLAUSE_LIBRARY);
  const [carveOutClause, setCarveOutClause] = useState('');
  const [carveOutReason, setCarveOutReason] = useState('');

  useEffect(() => {
    if (!p) return;
    setClausesLoading(true);
    getClauses(undefined, true)
      .then((items) => { setClauseLibrary(items); setClausesError(null); })
      .catch((e: unknown) => setClausesError(e instanceof Error ? e.message : 'Failed to load clauses'))
      .finally(() => setClausesLoading(false));
  }, [p?.productCode]);

  if (!p) return <p className="text-sm text-muted-foreground">Select a product first.</p>;

  function patch(payload: Partial<WizardState>) { dispatch({ type: 'PATCH', payload }); }

  const productBenefitCodes = [...p.benefitCodes, ...p.exclusionCodes];
  const productClauses = clauseLibrary.filter((c) => productBenefitCodes.includes(c.code));
  const benefits = productClauses.filter((c) => c.bucket === 'BENEFIT');
  const exclusions = productClauses.filter((c) => c.bucket === 'EXCLUSION');
  const riderItems = clauseLibrary.filter((c) => c.isRider && p.riderCodes.includes(c.code));

  const grades = bundle.headcountData?.grades ?? [];
  const memberGrades = [...new Set(bundle.members.map((m) => m.grade))];
  const hasCensus = grades.length > 0 || memberGrades.length > 0;

  function toggleBenefit(code: string, mandatory: boolean) {
    if (mandatory) return;
    const active = state.benefits.includes(code);
    if (active) {
      patch({ benefits: state.benefits.filter((c) => c !== code), excludedBenefits: [...state.excludedBenefits, code] });
    } else {
      patch({ benefits: [...state.benefits, code], excludedBenefits: state.excludedBenefits.filter((c) => c !== code) });
    }
  }

  function addCarveOut() {
    if (!carveOutClause || !carveOutReason.trim()) return;
    const clauseItem = clauseLibrary.find((c) => c.code === carveOutClause);
    if (!clauseItem) return;
    patch({ excludedClauses: [...state.excludedClauses, { code: carveOutClause, label: clauseItem.label, byDesk: 'SALES', reason: carveOutReason }] });
    setCarveOutClause(''); setCarveOutReason('');
  }

  function toggleRider(code: string) {
    const existing = state.riders.find((r) => r.code === code);
    if (existing) { patch({ riders: state.riders.filter((r) => r.code !== code) }); return; }
    const riderDef = riderItems.find((r) => r.code === code);
    if (!riderDef) return;
    patch({ riders: [...state.riders, { code: riderDef.code, label: riderDef.label, trigger: riderDef.trigger ?? '', funding: riderDef.defaultFunding ?? 'EMPLOYER_PAID', saBasis: (riderDef.riderSaBasis as SumAssuredBasis) ?? SumAssuredBasis.FLAT }] });
  }

  function patchRider(code: string, fields: Partial<PlanRider>) {
    patch({ riders: state.riders.map((r) => r.code === code ? { ...r, ...fields } : r) });
  }

  function totalCoveredLives(): number {
    if (state.coversGrades.length === 0) return grades.reduce((s, g) => s + g.lives, 0) || bundle.members.length || (bundle.censusSummary?.totalLives ?? 0);
    const tg = new Set(state.coversGrades);
    return grades.filter((g) => tg.has(g.grade)).reduce((s, g) => s + g.lives, 0) || bundle.members.filter((m) => tg.has(m.grade)).length;
  }

  const env = p.filedEnvelope;
  const flatSiViolation = state.flatSi !== null && (state.flatSi < env.minSumAssured || state.flatSi > env.maxSumAssured)
    ? `Value must be between ${fmtINR(env.minSumAssured)} and ${fmtINR(env.maxSumAssured)}` : undefined;

  return (
    <div className="flex flex-col gap-5">
      <div>
        <SectionTitle>Cover pattern</SectionTitle>
        <div className="flex gap-2 flex-wrap">
          {p.coverPattern.map((cp) => (
            <button key={cp} onClick={() => patch({ coverPattern: cp as CoverPattern })} className={cn('px-3 py-1.5 rounded-lg border text-xs font-medium', state.coverPattern === cp ? 'border-foreground bg-foreground/5 text-foreground' : 'border-border bg-card')}>{cp}</button>
          ))}
        </div>
      </div>
      <div>
        <SectionTitle>Sum assured basis</SectionTitle>
        <div className="flex gap-2 flex-wrap mb-3">
          {p.allowedSaBases.map((b) => (
            <button key={b} onClick={() => patch({ sumAssuredBasis: b as SumAssuredBasis })} className={cn('px-3 py-1.5 rounded-lg border text-xs font-medium', state.sumAssuredBasis === b ? 'border-foreground bg-foreground/5 text-foreground' : 'border-border bg-card')}>{b.replace(/_/g, ' ')}</button>
          ))}
        </div>
        {state.sumAssuredBasis === SumAssuredBasis.FLAT && (
          <div className="flex flex-col gap-1.5">
            <Notice variant="info">Product SA range: {fmtINR(env.minSumAssured)} – {fmtINR(env.maxSumAssured)}</Notice>
            <FieldRow label="Flat sum insured (₹)" error={flatSiViolation}>
              <Input type="number" value={state.flatSi ?? ''} onChange={(e) => dispatch({ type: 'PATCH', payload: { flatSi: e.target.value ? Number(e.target.value) : null } })} className="h-8 text-sm w-48" />
            </FieldRow>
          </div>
        )}
        {state.sumAssuredBasis === SumAssuredBasis.SALARY_MULTIPLE && (
          <FieldRow label="Salary multiple (×)">
            <Input type="number" step="0.5" min={1} value={state.salaryMultiple ?? ''} onChange={(e) => patch({ salaryMultiple: e.target.value ? Number(e.target.value) : null })} className="h-8 text-sm w-32" />
          </FieldRow>
        )}
        {state.sumAssuredBasis === SumAssuredBasis.GRADE_SLAB && (
          hasCensus ? (
            <div className="rounded-xl border border-border overflow-hidden">
              <table className="w-full text-xs">
                <thead className="bg-muted/30"><tr><th className="text-left px-3 py-2 font-medium text-muted-foreground">Grade</th><th className="text-right px-3 py-2 font-medium text-muted-foreground">Lives</th><th className="text-right px-3 py-2 font-medium text-muted-foreground">SI per member (₹)</th></tr></thead>
                <tbody>
                  {(grades.length > 0 ? grades : memberGrades.map((g) => ({ grade: g, lives: bundle.members.filter((m) => m.grade === g).length, avgSalary: 0, avgSumAssured: 0 }))).map((g) => {
                    const slab = state.gradeSlabs.find((s) => s.grade === g.grade);
                    return (
                      <tr key={g.grade} className="border-t border-border/40">
                        <td className="px-3 py-2 font-medium">{g.grade}</td>
                        <td className="px-3 py-2 text-right text-muted-foreground">{g.lives}</td>
                        <td className="px-3 py-2">
                          <Input type="number" value={slab?.si ?? ''} onChange={(e) => { const val = e.target.value ? Number(e.target.value) : 0; patch({ gradeSlabs: [...state.gradeSlabs.filter((s) => s.grade !== g.grade), { gradeId: g.grade, grade: g.grade, si: val }] }); }} className="h-7 text-xs w-36 ml-auto" />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <Notice variant="amber">Load census data first — the slab table requires grade information from your census.</Notice>
          )
        )}
      </div>
      {hasCensus && (
        <div>
          <SectionTitle>Grade targeting</SectionTitle>
          <p className="text-[10px] text-muted-foreground mb-2">Default: all grades covered.</p>
          <div className="flex flex-wrap gap-2">
            {(grades.length > 0 ? grades.map((g) => g.grade) : memberGrades).map((grade) => {
              const checked = state.coversGrades.length === 0 || state.coversGrades.includes(grade);
              return (
                <button key={grade} onClick={() => {
                  const all = grades.length > 0 ? grades.map((g) => g.grade) : memberGrades;
                  if (state.coversGrades.length === 0) { patch({ coversGrades: all.filter((g) => g !== grade) }); }
                  else { const ns = checked ? state.coversGrades.filter((g) => g !== grade) : [...state.coversGrades, grade]; patch({ coversGrades: ns.length === all.length ? [] : ns }); }
                }} className={cn('px-2.5 py-1 rounded-lg border text-xs', checked ? 'border-foreground bg-foreground/5 text-foreground' : 'border-border bg-card text-muted-foreground')}>{grade}</button>
              );
            })}
          </div>
          <p className="text-[10px] text-muted-foreground mt-1">Indicative covered lives: {totalCoveredLives().toLocaleString('en-IN')}</p>
        </div>
      )}
      <div>
        <SectionTitle>Benefits &amp; exclusions</SectionTitle>
        {clausesLoading && <div className="flex items-center gap-2 text-xs text-muted-foreground"><Loader2 className="size-3.5 animate-spin" /> Loading clauses…</div>}
        {clausesError && <Notice variant="red">{clausesError}</Notice>}
        {!clausesLoading && (
          <div className="flex flex-col gap-4">
            {[{ title: 'Benefits', items: benefits }, { title: 'Exclusions', items: exclusions }].map(({ title, items }) => (
              <div key={title}>
                <p className="text-xs font-semibold text-muted-foreground mb-1">{title}</p>
                <div className="flex flex-col gap-1">
                  {items.map((clause) => {
                    const active = state.benefits.includes(clause.code);
                    return (
                      <label key={clause.code} className={cn('flex items-center gap-2 px-3 py-2 rounded-lg border text-xs cursor-pointer', active ? 'border-foreground/30 bg-foreground/5' : 'border-border bg-card')}>
                        <input type="checkbox" checked={active} disabled={clause.mandatory} onChange={() => toggleBenefit(clause.code, clause.mandatory)} className="accent-neutral-800" />
                        <span className="flex-1">{clause.label}</span>
                        <span className="font-mono text-[10px] text-muted-foreground">{clause.code}</span>
                        {clause.mandatory && <Badge variant="secondary" className="text-[9px] h-4 px-1">Mandatory</Badge>}
                      </label>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      <div>
        <SectionTitle>Carved-out clauses</SectionTitle>
        {state.excludedClauses.length > 0 && (
          <div className="flex flex-col gap-1 mb-3">
            {state.excludedClauses.map((ec) => (
              <div key={ec.code} className="flex items-center gap-2 px-2 py-1.5 rounded-lg border border-amber-200 bg-amber-50/50 text-xs">
                <span className="flex-1">{ec.label} — <span className="text-muted-foreground">{ec.reason}</span></span>
                <button onClick={() => patch({ excludedClauses: state.excludedClauses.filter((c) => c.code !== ec.code) })}><X className="size-3.5 text-muted-foreground hover:text-destructive" /></button>
              </div>
            ))}
          </div>
        )}
        <div className="flex flex-col gap-2">
          <select value={carveOutClause} onChange={(e) => setCarveOutClause(e.target.value)} className="h-8 rounded-lg border border-border text-xs px-2 bg-background">
            <option value="">Select clause to carve out…</option>
            {productClauses.filter((c) => !c.mandatory).map((c) => <option key={c.code} value={c.code}>{c.label}</option>)}
          </select>
          {carveOutClause && (
            <div className="flex gap-2">
              <Input value={carveOutReason} onChange={(e) => setCarveOutReason(e.target.value)} placeholder="Reason (required)" className="h-8 text-xs flex-1" />
              <Button size="sm" className="h-8 shrink-0" onClick={addCarveOut} disabled={!carveOutReason.trim()}>Add</Button>
            </div>
          )}
        </div>
      </div>
      {riderItems.length > 0 && (
        <div>
          <SectionTitle>Riders</SectionTitle>
          <div className="flex flex-col gap-3">
            {riderItems.map((rider) => {
              const active = state.riders.find((r) => r.code === rider.code);
              return (
                <div key={rider.code} className={cn('rounded-xl border p-3', active ? 'border-foreground/30 bg-foreground/5' : 'border-border bg-card')}>
                  <div className="flex items-center gap-2">
                    <input type="checkbox" id={`rider-${rider.code}`} checked={!!active} onChange={() => toggleRider(rider.code)} className="accent-neutral-800" />
                    <label htmlFor={`rider-${rider.code}`} className="text-xs font-semibold cursor-pointer flex-1">{rider.label}</label>
                  </div>
                  {active && (
                    <div className="mt-2 ml-5 grid grid-cols-2 gap-2">
                      <FieldRow label="Trigger"><p className="text-[10px] text-muted-foreground">{rider.trigger}</p></FieldRow>
                      {(rider.fundingOptions?.length ?? 0) > 0 && (
                        <FieldRow label="Funding">
                          <div className="flex gap-2">
                            {rider.fundingOptions?.map((opt) => (
                              <label key={opt} className="flex items-center gap-1 text-[10px] cursor-pointer">
                                <input type="radio" name={`rider-${rider.code}-funding`} checked={active.funding === opt} onChange={() => patchRider(rider.code, { funding: opt })} className="accent-neutral-800" />
                                {opt.replace(/_/g, ' ')}
                              </label>
                            ))}
                          </div>
                        </FieldRow>
                      )}
                      {active.saBasis === SumAssuredBasis.FLAT && (
                        <FieldRow label="Flat SI (₹)">
                          <Input type="number" value={active.flatSi ?? ''} onChange={(e) => patchRider(rider.code, { flatSi: e.target.value ? Number(e.target.value) : undefined })} className="h-7 text-xs w-28" />
                        </FieldRow>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Step 3 ───────────────────────────────────────────────────────────────────

function Step3({ state, dispatch }: { state: WizardState; dispatch: React.Dispatch<WizardAction> }) {
  const p = state.selectedProduct;
  if (!p) return <p className="text-sm text-muted-foreground">Select a product first.</p>;
  function patch(payload: Partial<WizardState>) { dispatch({ type: 'PATCH', payload }); }
  const env = p.filedEnvelope;

  function ageLadderError(): string | null {
    const { minEntryAge: min, maxEntryAge: max, cessationAge: cess } = state;
    if (min !== null && max !== null && cess !== null && !(min < max && max <= cess))
      return 'Age ladder is inconsistent — min must be less than max, and max must not exceed cessation age.';
    return null;
  }

  const minAgeError = state.minEntryAge !== null && state.minEntryAge < env.minEntryAge ? `Below filed floor of ${env.minEntryAge}` : undefined;
  const maxAgeError = state.maxEntryAge !== null && state.maxEntryAge > env.maxEntryAge ? `Exceeds filed ceiling of ${env.maxEntryAge}` : undefined;
  const cessAgeError = state.cessationAge !== null && state.cessationAge > env.maxMaturityAge ? `Exceeds filed max maturity of ${env.maxMaturityAge}` : undefined;
  const minGroupError = state.minGroupSize !== null && state.minGroupSize < env.minGroupSize ? `Below filed minimum of ${env.minGroupSize}` : undefined;

  return (
    <div className="flex flex-col gap-5">
      <div className="rounded-xl border border-border/40 bg-muted/20 p-3">
        <p className="text-[9px] font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">Filed envelope</p>
        <p className="text-[10px] text-foreground">Entry {env.minEntryAge}–{env.maxEntryAge} ({env.ageBasis}), cessation {env.maxMaturityAge}, group size ≥ {env.minGroupSize}</p>
      </div>
      {ageLadderError() && <Notice variant="red">{ageLadderError()}</Notice>}
      <div className="grid grid-cols-2 gap-3">
        <FieldRow label={`Min entry age (product: ${env.minEntryAge}–${env.maxEntryAge})`} error={minAgeError}><Input type="number" value={state.minEntryAge ?? ''} onChange={(e) => patch({ minEntryAge: e.target.value ? Number(e.target.value) : null })} className="h-8 text-sm" /></FieldRow>
        <FieldRow label="Max entry age" error={maxAgeError}><Input type="number" value={state.maxEntryAge ?? ''} onChange={(e) => patch({ maxEntryAge: e.target.value ? Number(e.target.value) : null })} className="h-8 text-sm" /></FieldRow>
        <FieldRow label={`Cessation age (product max: ${env.maxMaturityAge})`} error={cessAgeError}><Input type="number" value={state.cessationAge ?? ''} onChange={(e) => patch({ cessationAge: e.target.value ? Number(e.target.value) : null })} className="h-8 text-sm" /></FieldRow>
        <FieldRow label={`Min group size (product min: ${env.minGroupSize})`} error={minGroupError}><Input type="number" value={state.minGroupSize ?? ''} onChange={(e) => patch({ minGroupSize: e.target.value ? Number(e.target.value) : null })} className="h-8 text-sm" /></FieldRow>
      </div>
      <div>
        <SectionTitle>Employment types</SectionTitle>
        <div className="flex flex-wrap gap-2">
          {p.allowedEmploymentTypes.map((et) => {
            const checked = state.allowedEmploymentTypes.includes(et);
            return (
              <label key={et} className={cn('flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs cursor-pointer', checked ? 'border-foreground bg-foreground/5 text-foreground' : 'border-border bg-card text-foreground')}>
                <input type="checkbox" checked={checked} onChange={() => { const next = checked ? state.allowedEmploymentTypes.filter((x) => x !== et) : [...state.allowedEmploymentTypes, et]; patch({ allowedEmploymentTypes: next }); }} className="accent-neutral-800" />
                {et.replace(/_/g, ' ')}
              </label>
            );
          })}
        </div>
      </div>
      <div>
        <SectionTitle>Lives covered *</SectionTitle>
        <div className="flex flex-col gap-1">
          {p.allowedLivesCovered.map((lc) => (
            <label key={lc} className={cn('flex items-center gap-2 px-3 py-2 rounded-lg border text-xs cursor-pointer', state.livesCovered === lc ? 'border-foreground bg-foreground/5 text-foreground' : 'border-border bg-card text-foreground')}>
              <input type="radio" name="livesCovered" checked={state.livesCovered === lc} onChange={() => patch({ livesCovered: lc as LivesCovered })} className="accent-neutral-800" />
              {lc.replace(/_/g, ' ')}
            </label>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Step 4 ───────────────────────────────────────────────────────────────────

function Step4({ state, dispatch, bundle }: { state: WizardState; dispatch: React.Dispatch<WizardAction>; bundle: import('@/lib/types').RfqBundle }) {
  const p = state.selectedProduct;
  const { currentRole } = useRole();
  const [fclSchedule, setFclSchedule] = useState<FclScheduleEntry | null>(null);
  const [fclLoading, setFclLoading] = useState(false);
  function patch(payload: Partial<WizardState>) { dispatch({ type: 'PATCH', payload }); }
  const activeVersion = bundle.quoteVersions.find((v) => v.id === bundle.activeVersionId);
  const inheritedFcl: FclPattern = activeVersion?.fclPatternOverride ?? bundle.fclPolicy.quoteDefault ?? FclPattern.NONE;
  const activeFcl = state.fclInherited ? inheritedFcl : (state.fclPatternOverride ?? FclPattern.NONE);

  useEffect(() => {
    if (!activeFcl) return;
    setFclLoading(true);
    getFclSchedule(activeFcl as FclPattern)
      .then((s) => setFclSchedule(Array.isArray(s) ? null : s as FclScheduleEntry))
      .catch(() => setFclSchedule(null))
      .finally(() => setFclLoading(false));
  }, [activeFcl]);

  if (!p) return <p className="text-sm text-muted-foreground">Select a product first.</p>;
  const appetite = bundle.mphAppetite;
  const uwBand = appetite?.uwAuthorityBand ?? '';
  const UW_LABELS: Record<string, string> = {
    STP: 'Straight-through processing — no individual underwriting',
    NSTP: 'Non-STP — individual cases reviewed by underwriter',
    FULL_MEDICAL: 'Full medical underwriting — evidence required per member',
    TELE_UW: 'Tele-underwriting — phone-based evidence collection',
  };
  const EVIDENCE_LABELS: Record<string, string> = {
    WITHIN_FCL_MINIMAL: 'Within-FCL minimal evidence',
    EOI_STANDARD: 'Evidence of Insurability — standard',
    EOI_FULL: 'Evidence of Insurability — full',
    EOI_JUMBO: 'Evidence of Insurability — jumbo (large SI)',
  };

  return (
    <div className="flex flex-col gap-5">
      {!appetite && <Notice variant="amber">Deal not yet profiled — complete MPH Categorisation first. Every pricing ask will require escalation until a profile is set.</Notice>}
      {appetite && uwBand.startsWith('SALES_') && <Notice variant="green">Within sales authority — straight-through eligible. No UW referral required for standard plan structures.</Notice>}
      {appetite && uwBand.includes('UW_REFERRAL') && <Notice variant="amber">UW referral required. Reason: {uwBand}. This plan will need underwriting sign-off before dispatch.</Notice>}
      <div>
        <SectionTitle>UW method *</SectionTitle>
        <div className="flex flex-col gap-1">
          {p.allowedUwMethods.map((method) => (
            <label key={method} className={cn('flex items-start gap-2 px-3 py-2 rounded-lg border text-xs cursor-pointer', state.uwMethod === method ? 'border-foreground bg-foreground/5' : 'border-border bg-card')}>
              <input type="radio" name="uwMethod" checked={state.uwMethod === method} onChange={() => patch({ uwMethod: method as UwMethod })} className="accent-neutral-800 mt-0.5" />
              <div><p className="font-medium text-foreground">{method}</p><p className="text-muted-foreground">{UW_LABELS[method] ?? method}</p></div>
            </label>
          ))}
        </div>
      </div>
      <div>
        <SectionTitle>FCL mode</SectionTitle>
        <label className="flex items-center gap-2 text-xs cursor-pointer mb-3">
          <input type="checkbox" checked={state.fclInherited} onChange={(e) => patch({ fclInherited: e.target.checked, fclPatternOverride: null })} className="accent-neutral-800" />
          <span>Inherit FCL pattern from {activeVersion?.fclPatternOverride ? `version override (${activeVersion.name})` : bundle.fclPolicy.quoteDefault ? `quote default (${bundle.fclPolicy.quoteDefault})` : 'quote default'}</span>
        </label>
        {state.fclInherited && !bundle.fclPolicy.quoteDefault && !activeVersion?.fclPatternOverride && (
          <Notice variant="amber">No FCL policy set anywhere — set one on Quote Versions.</Notice>
        )}
        {state.fclInherited && <p className="text-[10px] text-muted-foreground">Resolved pattern: <strong>{inheritedFcl}</strong></p>}
        {!state.fclInherited && (
          <div className="flex flex-wrap gap-2">
            {p.allowedFclModes.map((mode) => (
              <button key={mode} onClick={() => patch({ fclPatternOverride: mode as FclPattern })} className={cn('px-2.5 py-1.5 rounded-lg border text-xs font-medium', state.fclPatternOverride === mode ? 'border-foreground bg-foreground/5 text-foreground' : 'border-border bg-card text-foreground')}>{mode}</button>
            ))}
          </div>
        )}
        <div className="mt-3">
          <p className="text-[10px] font-semibold text-muted-foreground mb-1.5">Limit schedule (read-only)</p>
          {fclLoading && <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground"><Loader2 className="size-3 animate-spin" /> Resolving limits…</div>}
          {!fclLoading && fclSchedule && fclSchedule.limits.length > 0 && (
            <div className="rounded-lg border border-border overflow-hidden">
              <table className="w-full text-[10px]">
                <thead className="bg-muted/30"><tr><th className="text-left px-3 py-1.5 text-muted-foreground font-medium">Dimension</th><th className="text-right px-3 py-1.5 text-muted-foreground font-medium">Limit</th></tr></thead>
                <tbody>{fclSchedule.limits.map((l) => <tr key={l.dimension} className="border-t border-border/40"><td className="px-3 py-1.5">{l.dimension}</td><td className="px-3 py-1.5 text-right font-medium">{fmtINR(l.value)}</td></tr>)}</tbody>
              </table>
            </div>
          )}
          {!fclLoading && (!fclSchedule || fclSchedule.limits.length === 0) && <p className="text-[10px] text-muted-foreground italic">Limit schedule not yet set.</p>}
          {activeFcl === FclPattern.OVERALL && FCL_LIMIT_SCHEDULE[FclPattern.OVERALL]?.limits[0] && (
            <p className="text-[10px] text-muted-foreground mt-1">BY_PLAN threshold: <strong>{fmtINR(FCL_LIMIT_SCHEDULE[FclPattern.OVERALL].limits[0].value)}</strong> <span className="italic">(Derived — not editable here.)</span></p>
          )}
        </div>
      </div>
      <div>
        <SectionTitle>Evidence pack *</SectionTitle>
        <div className="flex flex-col gap-1">
          {p.allowedEvidencePacks.map((ep) => (
            <label key={ep} className={cn('flex items-center gap-2 px-3 py-2 rounded-lg border text-xs cursor-pointer', state.evidencePack === ep ? 'border-foreground bg-foreground/5' : 'border-border bg-card')}>
              <input type="radio" name="evidencePack" checked={state.evidencePack === ep} onChange={() => patch({ evidencePack: ep as EvidencePack })} className="accent-neutral-800" />
              <span className="flex-1">{EVIDENCE_LABELS[ep] ?? ep.replace(/_/g, ' ')}</span>
              {ep === p.defaultEvidencePack && <span className="text-[9px] text-muted-foreground">(product default)</span>}
            </label>
          ))}
        </div>
      </div>
      <div>
        <SectionTitle>Reinsurance treaty</SectionTitle>
        {currentRole === 'ACTUARIAL' ? (
          <FieldRow label="Treaty override (Actuarial desk)">
            <Input value={state.reinsuranceTreatyOverride ?? ''} onChange={(e) => patch({ reinsuranceTreatyOverride: e.target.value || null })} className="h-8 text-sm" placeholder="e.g. RI-GTL-2026-V1" />
          </FieldRow>
        ) : (
          <div className="flex flex-col gap-1">
            <p className="text-xs text-foreground font-medium">{state.reinsuranceTreatyOverride ?? 'RI-GTL-2026-V1'}</p>
            <p className="text-[10px] text-muted-foreground">{state.reinsuranceTreatyOverride ? `Actuary override active: ${state.reinsuranceTreatyOverride}` : 'Inherited from the reinsurance desk — not editable here.'}</p>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Step 5 ───────────────────────────────────────────────────────────────────

function Step5({ state, dispatch, bundle }: { state: WizardState; dispatch: React.Dispatch<WizardAction>; bundle: import('@/lib/types').RfqBundle }) {
  const [cards, setCards] = useState<RateCard[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showRetired, setShowRetired] = useState(false);
  function patch(payload: Partial<WizardState>) { dispatch({ type: 'PATCH', payload }); }

  useEffect(() => {
    if (!state.productCode) return;
    setLoading(true);
    getRateCards(state.productCode)
      .then((c) => { setCards(c); setError(null); })
      .catch((e: unknown) => setError(e instanceof Error ? e.message : 'Failed to load rate cards'))
      .finally(() => setLoading(false));
  }, [state.productCode]);

  if (!state.productCode) return <p className="text-sm text-muted-foreground">Select a product first.</p>;
  const approved = cards.filter((c) => c.approvalState === 'APPROVED').sort((a, b) => b.effectiveFrom.localeCompare(a.effectiveFrom));
  const pending = cards.filter((c) => c.approvalState === 'PENDING_APPROVAL');
  const retired = cards.filter((c) => c.approvalState === 'RETIRED');
  const selectedCard = cards.find((c) => c.ref === state.rateCardRef);
  const appetite = bundle.mphAppetite;

  function CardRow({ card, selectable }: { card: RateCard; selectable: boolean }) {
    const selected = state.rateCardRef === card.ref;
    return (
      <button disabled={!selectable} onClick={() => selectable && patch({ rateCardRef: card.ref })} className={cn('flex flex-col gap-1 rounded-xl border p-3 text-left text-xs transition-all', selected ? 'border-foreground ring-1 ring-foreground bg-foreground/5' : !selectable ? 'border-border/30 opacity-40 cursor-not-allowed bg-muted/20' : 'border-border bg-card hover:border-foreground/50 cursor-pointer')}>
        <div className="flex items-start justify-between gap-2">
          <span className="font-semibold text-foreground">{card.name}</span>
          <div className="flex gap-1 shrink-0">
            {card.isPreApproved && <Badge variant="success" className="text-[9px] h-4 px-1.5">Pre-approved</Badge>}
            <Badge variant={card.approvalState === 'APPROVED' ? 'success' : card.approvalState === 'RETIRED' ? 'secondary' : 'warning'} className="text-[9px] h-4 px-1.5">{card.approvalState}</Badge>
            {selected && <Check className="size-3.5 text-foreground" />}
          </div>
        </div>
        <span className="text-muted-foreground font-mono">{card.ref}</span>
        <div className="flex gap-3 text-muted-foreground mt-0.5"><span>v{card.version}</span><span>{card.premiumMethodKind.replace(/_/g, ' ')}</span><span>{card.dimensions.join(', ')}</span><span>From: {card.effectiveFrom}</span>{card.effectiveTo && <span className="text-destructive">To: {card.effectiveTo}</span>}</div>
        {card.approvalState === 'RETIRED' && <p className="text-[10px] text-muted-foreground italic mt-0.5">RETIRED — cannot be bound.</p>}
      </button>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      {loading && <div className="flex items-center gap-2 text-xs text-muted-foreground"><Loader2 className="size-3.5 animate-spin" /> Loading rate cards…</div>}
      {error && <Notice variant="red">{error}</Notice>}
      {!loading && cards.length === 0 && <Notice variant="amber">No rate cards published for this product — ask the actuarial desk to publish a card. You cannot save until a card is bound.</Notice>}
      {approved.length > 0 && <div><p className="text-xs font-semibold text-foreground mb-2">Approved</p><div className="flex flex-col gap-2">{approved.map((c) => <CardRow key={c.ref} card={c} selectable />)}</div></div>}
      {pending.length > 0 && <div><p className="text-xs font-semibold text-muted-foreground mb-2">Pending approval</p><div className="flex flex-col gap-2">{pending.map((c) => <CardRow key={c.ref} card={c} selectable={false} />)}</div></div>}
      {retired.length > 0 && (
        <div>
          <button onClick={() => setShowRetired((s) => !s)} className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground mb-2">
            {showRetired ? <ChevronUp className="size-3.5" /> : <ChevronDown className="size-3.5" />} Retired ({retired.length})
          </button>
          {showRetired && <div className="flex flex-col gap-2">{retired.map((c) => <CardRow key={c.ref} card={c} selectable={false} />)}</div>}
        </div>
      )}
      {selectedCard && (
        <div className="rounded-xl border border-border/40 bg-muted/20 p-3">
          <p className="text-[9px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">Selected card</p>
          {[['Ref', selectedCard.ref], ['Method', selectedCard.premiumMethodKind.replace(/_/g, ' ')], ['Dimensions', selectedCard.dimensions.join(', ')], ['Effective from', selectedCard.effectiveFrom], ['Author', selectedCard.author]].map(([label, value]) => (
            <div key={label} className="flex gap-2 text-[10px] py-0.5"><span className="text-muted-foreground w-24 shrink-0">{label}</span><span className="font-medium text-foreground">{value}</span></div>
          ))}
        </div>
      )}
      {selectedCard && appetite && selectedCard.isPreApproved && <Notice variant="green">This is the MPH pre-approved card — pricing is straight-through. No actuary dispatch needed.</Notice>}
      {selectedCard && appetite && !selectedCard.isPreApproved && <Notice variant="amber">This card is not the pre-approved card ({appetite.preapprovedCardRef ?? 'N/A'}). Pricing will require actuary sign-off after saving this plan.</Notice>}
    </div>
  );
}

// ─── Step 6 ───────────────────────────────────────────────────────────────────

function Step6({ state, dispatch, rfqId, planId, bundle }: { state: WizardState; dispatch: React.Dispatch<WizardAction>; rfqId: string; planId: string | null; bundle: import('@/lib/types').RfqBundle }) {
  const { currentRole, userId } = useRole();
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [stageNote, setStageNote] = useState('');
  const [stageLoading, setStageLoading] = useState(false);
  const [addForm, setAddForm] = useState({ scope: DeviationScope.WHOLE_PLAN as string, scopeDetail: '', kind: '' as string, itemRef: '', itemLabel: '', baselineValue: '', negotiatedValue: '', reason: '', estimatedPremiumDelta: '', estimatedLrDelta: '' });

  useEffect(() => {
    setLoading(true);
    getDeviations(rfqId)
      .then((devs) => { dispatch({ type: 'PATCH', payload: { deviations: devs.filter((d) => !planId || d.planId === planId) } }); setLoadError(null); })
      .catch((e: unknown) => setLoadError(e instanceof Error ? e.message : 'Failed to load deviations'))
      .finally(() => setLoading(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rfqId, planId]);

  const planDevs = state.deviations;
  const productClauses = state.selectedProduct ? CLAUSE_LIBRARY.filter((c) => [...(state.selectedProduct?.benefitCodes ?? []), ...(state.selectedProduct?.exclusionCodes ?? [])].includes(c.code)) : [];
  const SCOPE_LABELS: Record<string, string> = { [DeviationScope.WHOLE_PLAN]: 'Whole plan', [DeviationScope.NAMED_MEMBERS]: 'Named members', [DeviationScope.GRADES]: 'Grades', [DeviationScope.FREE_FORM]: 'Free-form category' };
  const STAGE_VARIANT: Record<string, 'default' | 'secondary' | 'success' | 'warning' | 'destructive'> = {
    [DeviationApprovalStage.DRAFT]: 'secondary',
    [DeviationApprovalStage.PENDING_UW]: 'warning',
    [DeviationApprovalStage.APPROVED]: 'success',
    [DeviationApprovalStage.REJECTED]: 'destructive',
    [DeviationApprovalStage.WITHDRAWN]: 'secondary',
  };

  async function handleAdd() {
    if (!addForm.kind || !addForm.negotiatedValue.trim() || !addForm.reason.trim() || !addForm.itemLabel.trim()) return;
    const deviation = { id: `dev-${Math.random().toString(36).slice(2, 9)}`, rfqId, planId: planId ?? 'pending', scope: addForm.scope as DeviationScope, scopeDetail: addForm.scopeDetail || undefined, kind: addForm.kind as DeviationKind, itemRef: addForm.itemRef || undefined, itemLabel: addForm.itemLabel, baselineValue: addForm.baselineValue, negotiatedValue: addForm.negotiatedValue, reason: addForm.reason, estimatedPremiumDelta: addForm.estimatedPremiumDelta ? Number(addForm.estimatedPremiumDelta) : undefined, estimatedLrDelta: addForm.estimatedLrDelta ? Number(addForm.estimatedLrDelta) : undefined, approvalStage: DeviationApprovalStage.DRAFT, approvalHistory: [], createdBy: userId ?? 'unknown' };
    try {
      setSaveError(null);
      const saved = await upsertDeviation(rfqId, deviation);
      dispatch({ type: 'ADD_DEVIATION', dev: saved });
      setAddForm({ scope: DeviationScope.WHOLE_PLAN, scopeDetail: '', kind: '', itemRef: '', itemLabel: '', baselineValue: '', negotiatedValue: '', reason: '', estimatedPremiumDelta: '', estimatedLrDelta: '' });
    } catch (e: unknown) { setSaveError(e instanceof Error ? e.message : 'Failed to save deviation'); }
  }

  async function handleStageChange(dev: Deviation, stage: DeviationApprovalStage) {
    setStageLoading(true);
    try { const updated = await updateDeviationStage(rfqId, dev.id, stage, stageNote, userId ?? undefined); dispatch({ type: 'REPLACE_DEVIATION', dev: updated }); setStageNote(''); }
    finally { setStageLoading(false); }
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="grid grid-cols-4 gap-3">
        {[['Total', planDevs.length], ['Approved', planDevs.filter((d) => d.approvalStage === DeviationApprovalStage.APPROVED).length], ['Pending UW', planDevs.filter((d) => d.approvalStage === DeviationApprovalStage.PENDING_UW).length], ['Declined', planDevs.filter((d) => d.approvalStage === DeviationApprovalStage.REJECTED).length]].map(([label, val]) => (
          <div key={label as string} className="rounded-lg border border-border bg-card px-3 py-2.5 text-center">
            <p className="text-[10px] text-muted-foreground">{label as string}</p>
            <p className="text-lg font-semibold tabular-nums mt-0.5">{val as number}</p>
          </div>
        ))}
      </div>
      {loading && <div className="flex items-center gap-2 text-xs text-muted-foreground"><Loader2 className="size-3.5 animate-spin" /> Loading deviations…</div>}
      {loadError && <Notice variant="red">{loadError}</Notice>}
      {planDevs.length === 0 ? (
        <p className="text-xs text-muted-foreground italic">No deviations registered for this plan.</p>
      ) : (
        <div className="flex flex-col gap-2">
          {planDevs.map((dev) => {
            const expanded = expandedId === dev.id;
            const isSelfApprover = dev.createdBy === userId;
            return (
              <div key={dev.id} className="rounded-xl border border-border bg-card overflow-hidden">
                <button onClick={() => setExpandedId(expanded ? null : dev.id)} className="w-full flex items-center gap-3 px-3 py-2.5 text-xs hover:bg-muted/30">
                  <Badge variant="secondary" className="text-[10px] h-5 px-1.5 shrink-0">{SCOPE_LABELS[dev.scope] ?? dev.scope}</Badge>
                  <span className="flex-1 text-left font-medium truncate text-xs">{dev.itemLabel}</span>
                  <span className="text-muted-foreground truncate max-w-[15%] text-xs">{dev.baselineValue} → {dev.negotiatedValue}</span>
                  <Badge variant={STAGE_VARIANT[dev.approvalStage] ?? 'secondary'} className="text-[10px] h-5 px-1.5 shrink-0">{dev.approvalStage.replace(/_/g, ' ')}</Badge>
                  <span className="text-muted-foreground shrink-0 text-[10px]">{dev.createdBy}</span>
                  {expanded ? <ChevronUp className="size-3.5 shrink-0" /> : <ChevronDown className="size-3.5 shrink-0" />}
                </button>
                {expanded && (
                  <div className="px-3 pb-3 border-t border-border/40">
                    <div className="grid grid-cols-2 gap-x-4 gap-y-1 mt-2 text-xs">
                      <div className="flex gap-2"><span className="text-muted-foreground w-28">Kind</span><span>{dev.kind.replace(/_/g, ' ')}</span></div>
                      <div className="flex gap-2"><span className="text-muted-foreground w-28">Baseline</span><span>{dev.baselineValue || '—'}</span></div>
                      <div className="flex gap-2"><span className="text-muted-foreground w-28">Negotiated</span><span>{dev.negotiatedValue}</span></div>
                      <div className="flex gap-2 col-span-2"><span className="text-muted-foreground w-28">Reason</span><span>{dev.reason}</span></div>
                    </div>
                    {dev.approvalHistory.length > 0 && (
                      <div className="mt-2 pt-2 border-t border-border/40">
                        <p className="text-[9px] font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">Approval history</p>
                        <div className="flex flex-col gap-1">
                          {dev.approvalHistory.map((h, i) => (
                            <div key={i} className="flex items-center gap-2 text-[10px]">
                              <Badge variant={STAGE_VARIANT[h.stage] ?? 'secondary'} className="text-[9px] h-4 px-1 shrink-0">{h.stage.replace(/_/g, ' ')}</Badge>
                              <span className="text-muted-foreground">{h.by}</span>
                              <span className="text-muted-foreground">{new Date(h.at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}</span>
                              <span className="truncate">{h.note}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    <div className="mt-2 pt-2 border-t border-border/40">
                      <Input value={stageNote} onChange={(e) => setStageNote(e.target.value)} placeholder="Note (optional)" className="h-7 text-[10px] mb-1.5" />
                      <div className="flex gap-2">
                        {currentRole === 'UNDERWRITER' && !isSelfApprover && dev.approvalStage === DeviationApprovalStage.PENDING_UW && (
                          <><Button size="sm" className="h-7 text-[10px]" onClick={() => handleStageChange(dev, DeviationApprovalStage.APPROVED)} disabled={stageLoading}>Approve</Button><Button size="sm" variant="destructive" className="h-7 text-[10px]" onClick={() => handleStageChange(dev, DeviationApprovalStage.REJECTED)} disabled={stageLoading}>Reject</Button></>
                        )}
                        {currentRole !== 'UNDERWRITER' && dev.approvalStage === DeviationApprovalStage.DRAFT && (
                          <Button size="sm" className="h-7 text-[10px]" onClick={() => handleStageChange(dev, DeviationApprovalStage.PENDING_UW)} disabled={stageLoading}>Send to UW for review</Button>
                        )}
                        {currentRole !== 'UNDERWRITER' && dev.approvalStage === DeviationApprovalStage.PENDING_UW && (
                          <><span className="text-[10px] text-muted-foreground self-center">Awaiting the underwriting desk</span><Button size="sm" variant="outline" className="h-7 text-[10px]" onClick={() => handleStageChange(dev, DeviationApprovalStage.WITHDRAWN)} disabled={stageLoading}>Withdraw</Button></>
                        )}
                        {[DeviationApprovalStage.APPROVED, DeviationApprovalStage.REJECTED, DeviationApprovalStage.WITHDRAWN].includes(dev.approvalStage) && (
                          <Button size="sm" variant="outline" className="h-7 text-[10px]" onClick={() => handleStageChange(dev, DeviationApprovalStage.DRAFT)} disabled={stageLoading}>Reopen</Button>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
      <div className="rounded-xl border border-border p-4">
        <p className="text-xs font-semibold text-foreground mb-3">Add deviation</p>
        <div className="grid grid-cols-2 gap-3">
          <FieldRow label="Scope *">
            <select value={addForm.scope} onChange={(e) => setAddForm((f) => ({ ...f, scope: e.target.value }))} className="h-8 rounded-lg border border-border text-xs px-2 bg-background">
              {Object.values(DeviationScope).map((s) => <option key={s} value={s}>{SCOPE_LABELS[s]}</option>)}
            </select>
          </FieldRow>
          {addForm.scope !== DeviationScope.WHOLE_PLAN && (
            <FieldRow label={addForm.scope === DeviationScope.GRADES ? 'Grade name(s)' : addForm.scope === DeviationScope.NAMED_MEMBERS ? 'Member number(s)' : 'Category'}>
              <Input value={addForm.scopeDetail} onChange={(e) => setAddForm((f) => ({ ...f, scopeDetail: e.target.value }))} className="h-8 text-xs" />
            </FieldRow>
          )}
          <FieldRow label="Kind *">
            <select value={addForm.kind} onChange={(e) => setAddForm((f) => ({ ...f, kind: e.target.value, itemRef: '', itemLabel: '' }))} className="h-8 rounded-lg border border-border text-xs px-2 bg-background">
              <option value="">Select…</option>
              {Object.values(DeviationKind).map((k) => <option key={k} value={k}>{k.replace(/_/g, ' ').toLowerCase().replace(/^\w/, (c) => c.toUpperCase())}</option>)}
            </select>
          </FieldRow>
          {(addForm.kind === DeviationKind.BENEFIT || addForm.kind === DeviationKind.EXCLUSION) && productClauses.length > 0 && (
            <FieldRow label="Clause">
              <select value={addForm.itemRef} onChange={(e) => { const clause = productClauses.find((c) => c.code === e.target.value); setAddForm((f) => ({ ...f, itemRef: e.target.value, itemLabel: clause?.label ?? '' })); }} className="h-8 rounded-lg border border-border text-xs px-2 bg-background">
                <option value="">Select clause…</option>
                {productClauses.map((c) => <option key={c.code} value={c.code}>{c.label}</option>)}
              </select>
            </FieldRow>
          )}
          <FieldRow label="Item label *"><Input value={addForm.itemLabel} onChange={(e) => setAddForm((f) => ({ ...f, itemLabel: e.target.value }))} className="h-8 text-xs" /></FieldRow>
          <FieldRow label="Baseline value"><Input value={addForm.baselineValue} onChange={(e) => setAddForm((f) => ({ ...f, baselineValue: e.target.value }))} className="h-8 text-xs" /></FieldRow>
          <FieldRow label="Negotiated value *"><Input value={addForm.negotiatedValue} onChange={(e) => setAddForm((f) => ({ ...f, negotiatedValue: e.target.value }))} className="h-8 text-xs" /></FieldRow>
        </div>
        <div className="mt-3">
          <FieldRow label="Reason *">
            <textarea value={addForm.reason} onChange={(e) => setAddForm((f) => ({ ...f, reason: e.target.value }))} rows={2} className="w-full rounded-lg border border-border text-xs px-2 py-1.5 bg-background resize-none" />
          </FieldRow>
        </div>
        <div className="grid grid-cols-2 gap-3 mt-3">
          <FieldRow label="Est. premium impact (₹) — sales estimate only"><Input type="number" value={addForm.estimatedPremiumDelta} onChange={(e) => setAddForm((f) => ({ ...f, estimatedPremiumDelta: e.target.value }))} className="h-8 text-xs" /></FieldRow>
          <FieldRow label="Est. LR impact (%) — sales estimate only"><Input type="number" step="0.01" value={addForm.estimatedLrDelta} onChange={(e) => setAddForm((f) => ({ ...f, estimatedLrDelta: e.target.value }))} className="h-8 text-xs" /></FieldRow>
        </div>
        {(addForm.estimatedPremiumDelta || addForm.estimatedLrDelta) && (
          <Notice variant="amber">⚠ These are sales estimates only — the priced impact is the actuary's output and will differ.</Notice>
        )}
        {saveError && <Notice variant="red">{saveError}</Notice>}
        <Button size="sm" variant="secondary" className="mt-3 gap-1" onClick={handleAdd} disabled={!addForm.kind || !addForm.negotiatedValue.trim() || !addForm.reason.trim() || !addForm.itemLabel.trim()}>
          <Plus className="size-3.5" /> Add deviation
        </Button>
      </div>
    </div>
  );
}

// ─── Validation ───────────────────────────────────────────────────────────────

function validateStep(state: WizardState): string[] {
  const errors: string[] = [];
  switch (state.currentStep) {
    case 1:
      if (!state.productCode) errors.push('Select a product to continue.');
      if (!state.effectiveFrom) errors.push('Effective from date is required.');
      break;
    case 2:
      if (!state.sumAssuredBasis) errors.push('Sum assured basis is required.');
      if (state.benefits.length === 0) errors.push('At least one benefit must be selected.');
      if (state.envelopeViolations.some((v) => v.includes('SI') || v.includes('minimum') || v.includes('maximum'))) errors.push(...state.envelopeViolations.filter((v) => v.includes('SI')));
      break;
    case 3:
      if (!state.livesCovered) errors.push('Lives covered is required.');
      if (state.minEntryAge !== null && state.maxEntryAge !== null && state.cessationAge !== null && !(state.minEntryAge < state.maxEntryAge && state.maxEntryAge <= state.cessationAge)) errors.push('Age ladder is inconsistent.');
      errors.push(...state.envelopeViolations.filter((v) => v.includes('age') || v.includes('maturity') || v.includes('group size')));
      break;
    case 4:
      if (!state.uwMethod) errors.push('UW method is required.');
      if (!state.fclInherited && !state.fclPatternOverride) errors.push('FCL mode must be set or inherited.');
      if (!state.evidencePack) errors.push('Evidence pack is required.');
      break;
    case 5:
      if (!state.rateCardRef) errors.push('A rate card must be bound before saving.');
      break;
    default:
      break;
  }
  return errors;
}

// ─── Main wizard ──────────────────────────────────────────────────────────────

function PlanWizardInner() {
  const { bundle, updateBundle } = useRfqBundle();
  const { currentRole, userId } = useRole();
  const router = useRouter();
  const searchParams = useSearchParams();
  const params = useParams<{ rfqId: string }>();
  const rfqId = params.rfqId;
  const templateId = searchParams.get('template');
  const editPlanId = searchParams.get('planId');
  const stepKey = searchParams.get('step');
  const [state, dispatch] = useReducer(wizardReducer, INITIAL_STATE);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [stepErrors, setStepErrors] = useState<string[]>([]);

  useEffect(() => {
    if (currentRole && currentRole !== 'SALES') router.replace(`/rfqs/${rfqId}/plans`);
  }, [currentRole, rfqId, router]);

  useEffect(() => {
    if (!bundle) return;
    let initial: Partial<WizardState> = {};
    if (editPlanId) {
      const plan = bundle.plans.find((p) => p.planId === editPlanId);
      if (plan) {
        const product = FILED_PRODUCTS.find((p) => p.productCode === plan.productCode);
        initial = { productCode: plan.productCode ?? null, selectedProduct: product ?? null, planNumber: plan.planNumber ?? '', planName: plan.name, effectiveFrom: plan.effectiveFrom ?? '', effectiveTo: plan.effectiveTo ?? '', subsidiaryScope: plan.subsidiaryScope ?? 'WHOLE_GROUP', sumAssuredBasis: plan.sumAssuredBasis, coverPattern: plan.coverPattern, flatSi: plan.flatSi ?? null, salaryMultiple: plan.salaryMultiple ?? null, gradeSlabs: plan.gradeSlabs ?? [], coversGrades: plan.coversGrades ?? [], benefits: plan.benefits ?? [], excludedBenefits: plan.excludedBenefits ?? [], excludedClauses: plan.excludedClauses ?? [], riders: plan.riders ?? [], minEntryAge: plan.minEntryAge ?? null, maxEntryAge: plan.maxEntryAge ?? null, cessationAge: plan.cessationAge ?? null, allowedEmploymentTypes: plan.allowedEmploymentTypes ?? [], livesCovered: plan.livesCovered ?? null, minGroupSize: plan.minGroupSize ?? null, uwMethod: (plan.uwMethod as UwMethod) ?? null, fclInherited: plan.fclInherited ?? true, fclPatternOverride: plan.fclPatternOverride ?? null, evidencePack: plan.evidencePack ?? null, reinsuranceTreatyOverride: plan.reinsuranceTreatyOverride ?? null, rateCardRef: plan.rateCardRef ?? null };
      }
    } else if (templateId) {
      const tmpl = getMergedTemplates().find((t) => t.id === templateId);
      if (tmpl) initial = { planName: tmpl.name };
    }
    const targetStep = stepKey ? stepKeyToIndex(stepKey) : 1;
    dispatch({ type: 'PATCH', payload: { ...initial, currentStep: targetStep, visitedSteps: Array.from({ length: targetStep }, (_, i) => i + 1) } });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bundle]);

  if (!bundle) return null;

  const planCount = bundle.plans.filter((p) => p.quoteVersionId === bundle.activeVersionId).length;
  const schemeUsage = bundle.schemeUsage;

  function handleNext() {
    const errs = validateStep(state);
    if (errs.length > 0) { setStepErrors(errs); return; }
    setStepErrors([]);
    dispatch({ type: 'GO_STEP', step: state.currentStep + 1 });
  }

  function handleBack() { setStepErrors([]); dispatch({ type: 'GO_STEP', step: state.currentStep - 1 }); }

  async function handleSave() {
    if (state.envelopeViolations.length > 0) { setSaveError(`${state.envelopeViolations.length} envelope violation(s) must be resolved before saving.`); return; }
    setSaving(true); setSaveError(null);
    try {
      const planPayload: Partial<Plan> = { quoteVersionId: bundle!.activeVersionId, planNumber: state.planNumber || undefined, name: state.planName || state.selectedProduct?.name || 'New Plan', productCode: state.productCode ?? undefined, effectiveFrom: state.effectiveFrom || undefined, effectiveTo: state.effectiveTo || undefined, subsidiaryScope: state.subsidiaryScope, sumAssuredBasis: state.sumAssuredBasis!, coverPattern: state.coverPattern!, flatSi: state.flatSi ?? undefined, salaryMultiple: state.salaryMultiple ?? undefined, gradeSlabs: state.gradeSlabs.length > 0 ? state.gradeSlabs : undefined, coversGrades: state.coversGrades.length > 0 ? state.coversGrades : undefined, benefits: state.benefits, excludedBenefits: state.excludedBenefits.length > 0 ? state.excludedBenefits : undefined, excludedClauses: state.excludedClauses, riders: state.riders, minEntryAge: state.minEntryAge ?? undefined, maxEntryAge: state.maxEntryAge ?? undefined, cessationAge: state.cessationAge ?? undefined, allowedEmploymentTypes: state.allowedEmploymentTypes.length > 0 ? state.allowedEmploymentTypes : undefined, livesCovered: state.livesCovered ?? undefined, minGroupSize: state.minGroupSize ?? undefined, uwMethod: state.uwMethod ?? undefined, fclInherited: state.fclInherited, fclPatternOverride: state.fclPatternOverride ?? undefined, evidencePack: state.evidencePack ?? undefined, reinsuranceTreatyOverride: state.reinsuranceTreatyOverride ?? undefined, rateCardRef: state.rateCardRef ?? undefined, handoffStatus: PlanHandoffStatus.DRAFT, completeness: 0 };
      let savedPlanId = editPlanId;
      if (!editPlanId) {
        const created = await createPlan(rfqId, planPayload);
        savedPlanId = created.planId;
        await updatePlan(rfqId, savedPlanId, { ...planPayload, completeness: computePlanCompleteness({ ...created, ...planPayload } as Plan) });
      } else {
        await updatePlan(rfqId, editPlanId, { ...planPayload, completeness: computePlanCompleteness({ ...planPayload, planId: editPlanId, rfqId } as Plan) });
      }
      if (state.coversGrades.length > 0 && savedPlanId) {
        const existing = bundle!.gradeAllocations[bundle!.activeVersionId] ?? {};
        const patch: Record<string, string> = { ...existing };
        for (const grade of state.coversGrades) { if (!patch[grade]) patch[grade] = savedPlanId; }
        await updateRfq(rfqId, { gradeAllocations: { ...bundle!.gradeAllocations, [bundle!.activeVersionId]: patch } });
      }
      updateBundle({});
      router.push(`/rfqs/${rfqId}/plans`);
    } catch (e: unknown) { setSaveError(e instanceof Error ? e.message : 'Failed to save plan.'); }
    finally { setSaving(false); }
  }

  const isLastStep = state.currentStep === 6;
  const canSave = !!(
    state.productCode &&
    state.effectiveFrom &&
    state.sumAssuredBasis &&
    state.benefits.length > 0 &&
    state.livesCovered &&
    state.uwMethod &&
    state.evidencePack &&
    (state.fclInherited || state.fclPatternOverride) &&
    state.rateCardRef &&
    state.envelopeViolations.length === 0
  );

  return (
    <div className="flex flex-col h-full overflow-hidden bg-background">
      <div className="shrink-0 border-b border-border/40 px-5 py-3">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-base font-semibold text-foreground">{editPlanId ? 'Edit plan' : 'New plan'}</h1>
            <p className="text-xs text-muted-foreground mt-0.5">{bundle.employerName} · {rfqId.toUpperCase()}</p>
          </div>
          <div className="flex items-center gap-2">
            {state.envelopeViolations.length > 0 && (
              <span className="text-xs text-destructive">{state.envelopeViolations.length} violation{state.envelopeViolations.length !== 1 ? 's' : ''}</span>
            )}
            {saveError && <span className="text-xs text-destructive max-w-xs truncate">{saveError}</span>}
            <Button variant="ghost" size="sm" onClick={() => router.push(`/rfqs/${rfqId}/plans`)}>Cancel</Button>
            <Button size="sm" onClick={handleSave} disabled={saving || !canSave} className="gap-1">
              {saving ? <Loader2 className="size-3.5 animate-spin" /> : <Check className="size-3.5" />} Save plan
            </Button>
          </div>
        </div>
      </div>
      <div className="flex flex-1 min-h-0 overflow-hidden">
        <div className="w-56 shrink-0 border-r border-border/40 px-3 py-4 overflow-y-auto">
          <Stepper state={state} dispatch={dispatch} />
        </div>
        <div className="flex-1 min-w-0 flex flex-col">
          <div className="flex-1 overflow-y-auto px-6 py-4">
            <h2 className="text-sm font-semibold text-foreground mb-4">Step {state.currentStep}: {STEP_LABELS[stepIndexToKey(state.currentStep)]}</h2>
            {state.currentStep === 1 && <Step1 state={state} dispatch={dispatch} planCount={planCount} schemeUsage={schemeUsage} />}
            {state.currentStep === 2 && <Step2 state={state} dispatch={dispatch} bundle={bundle} />}
            {state.currentStep === 3 && <Step3 state={state} dispatch={dispatch} />}
            {state.currentStep === 4 && <Step4 state={state} dispatch={dispatch} bundle={bundle} />}
            {state.currentStep === 5 && <Step5 state={state} dispatch={dispatch} bundle={bundle} />}
            {state.currentStep === 6 && <Step6 state={state} dispatch={dispatch} rfqId={rfqId} planId={editPlanId} bundle={bundle} />}
            {stepErrors.length > 0 && (
              <div className="mt-4 flex flex-col gap-1">{stepErrors.map((err) => <Notice key={err} variant="red">{err}</Notice>)}</div>
            )}
          </div>
          <div className="shrink-0 flex items-center justify-between border-t border-border/40 px-5 py-3 bg-muted/10">
            <Button variant="outline" size="sm" onClick={handleBack} disabled={state.currentStep === 1} className="gap-1">
              <ChevronLeft className="size-3.5" /> Previous
            </Button>
            <Button size="sm" onClick={handleNext} disabled={isLastStep} className="gap-1">
              Next <ChevronRight className="size-3.5" />
            </Button>
          </div>
        </div>
        <div className="w-72 shrink-0 border-l border-border/40 px-3 py-4 overflow-y-auto">
          <RecapSidebar state={state} />
        </div>
      </div>
    </div>
  );
}

// ─── Page entry ───────────────────────────────────────────────────────────────

export default function NewPlanPage() {
  return (
    <Suspense>
      <PlanWizardInner />
    </Suspense>
  );
}

