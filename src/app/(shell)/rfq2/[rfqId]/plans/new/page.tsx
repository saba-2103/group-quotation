'use client';

import { useState, Suspense } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import {
  ChevronLeft, ChevronRight, Check, AlertTriangle, Plus, Trash2, Lock,
  Info, Loader2, Banknote, TrendingUp, LayoutList, TrendingDown, Minus,
  User, Users, Home, Zap, FileCheck, Activity, Phone,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { RfqBundleProvider, useRfqBundle } from '@/context/RfqBundleContext';
import { PageHeader } from '@/components/layout/PageHeader';
import {
  SumAssuredBasis, CoverPattern, LivesCovered, FclPattern,
  VersionStatus, PlanHandoffStatus,
} from '@/lib/types';
import { PRODUCT_CATALOG, RATE_CARDS } from '@/lib/constants';
import { usePlanWizardVersion } from '@/stores/planWizardVersionStore';

// ─── Constants ────────────────────────────────────────────────────────────────

const BENEFIT_OPTIONS = [
  'Death Benefit', 'Accidental Death Rider', 'Critical Illness Rider',
  'Terminal Illness Benefit', 'Total & Permanent Disability', 'Waiver of Premium',
];
const EMPLOYMENT_TYPES = ['PERMANENT', 'CONTRACT', 'PROBATION', 'PART_TIME'];
const UW_METHODS = [
  { value: 'STP',          icon: Zap,       label: 'STP',          desc: 'Straight-through — no medical evidence' },
  { value: 'NSTP',         icon: FileCheck, label: 'NSTP',         desc: 'Non-STP — evidence of insurability required' },
  { value: 'FULL_MEDICAL', icon: Activity,  label: 'Full Medical', desc: 'Full medical underwriting per member' },
  { value: 'TELE_UW',      icon: Phone,     label: 'Tele-UW',      desc: 'Telephonic underwriting for eligible' },
] as const;
const EVIDENCE_PACKS = [
  { value: 'WITHIN_FCL_MINIMAL', label: 'Within FCL — Minimal', sub: 'Lives within FCL; no EOI required' },
  { value: 'STANDARD_EOI',       label: 'Standard EOI',          sub: 'Evidence of insurability form' },
  { value: 'EXTENDED_EOI',       label: 'Extended EOI',          sub: 'Extended questionnaire + GP report' },
  { value: 'JUMBO',              label: 'Jumbo',                  sub: 'Full medical + financial underwriting' },
];
const STEPS = [
  { key: 'product',     label: 'Product & Timing' },
  { key: 'coverage',    label: 'Coverage' },
  { key: 'eligibility', label: 'Eligibility' },
  { key: 'uw',          label: 'UW & STP' },
  { key: 'ratecard',    label: 'Rate Card' },
  { key: 'deviations',  label: 'Deviations' },
] as const;
type StepKey = (typeof STEPS)[number]['key'];

// ─── State ────────────────────────────────────────────────────────────────────

interface WizardState {
  planNumber: string; planName: string; productCode: string;
  effectiveFrom: string; effectiveTo: string; subsidiaryScope: string;
  coverPattern: CoverPattern; sumAssuredBasis: SumAssuredBasis;
  flatSi: string; salaryMultiple: string; benefits: string[];
  minEntryAge: string; maxEntryAge: string; cessationAge: string;
  livesCovered: LivesCovered; employmentTypes: string[];
  uwMethod: string; fclInherited: boolean; fclPattern: FclPattern;
  evidencePack: string; rateCardRef: string;
}
interface Deviation { id: string; scope: string; what: string; baseline: string; negotiated: string; reason: string; }

const INITIAL: WizardState = {
  planNumber: '', planName: '', productCode: '',
  effectiveFrom: '', effectiveTo: '', subsidiaryScope: 'WHOLE_GROUP',
  coverPattern: CoverPattern.LEVEL, sumAssuredBasis: SumAssuredBasis.SALARY_MULTIPLE,
  flatSi: '', salaryMultiple: '3', benefits: ['Death Benefit'],
  minEntryAge: '18', maxEntryAge: '60', cessationAge: '65',
  livesCovered: LivesCovered.MEMBER_ONLY, employmentTypes: ['PERMANENT'],
  uwMethod: 'STP', fclInherited: true, fclPattern: FclPattern.OVERALL,
  evidencePack: 'WITHIN_FCL_MINIMAL', rateCardRef: '',
};

const WIZARD_TEMPLATES: Record<string, Partial<WizardState>> = {
  GTL_GRADE_SLAB: {
    planName: 'Grade Slab Cover',
    productCode: 'GTL-EMP-001',
    sumAssuredBasis: SumAssuredBasis.GRADE_SLAB,
    benefits: ['Death Benefit'],
    uwMethod: 'STP',
    evidencePack: 'WITHIN_FCL_MINIMAL',
  },
  GTL_SALARY_MULT: {
    planName: 'Salary Multiple',
    productCode: 'GTL-EMP-001',
    sumAssuredBasis: SumAssuredBasis.SALARY_MULTIPLE,
    salaryMultiple: '3',
    benefits: ['Death Benefit'],
    uwMethod: 'STP',
    evidencePack: 'WITHIN_FCL_MINIMAL',
  },
  GTL_FLAT: {
    planName: 'Flat Cover',
    productCode: 'GTL-EMP-001',
    sumAssuredBasis: SumAssuredBasis.FLAT,
    flatSi: '500000',
    benefits: ['Death Benefit'],
    uwMethod: 'STP',
    evidencePack: 'WITHIN_FCL_MINIMAL',
  },
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function Field({ label, required, hint, children }: { label: string; required?: boolean; hint?: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label className="text-xs font-medium">{label}{required && <span className="text-destructive ml-0.5">*</span>}</Label>
      {children}
      {hint && <p className="text-[11px] text-muted-foreground">{hint}</p>}
    </div>
  );
}

function FieldRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <Label className="text-[10px] font-medium text-muted-foreground">{label}</Label>
      {children}
    </div>
  );
}

function DeviationStep({ devs, setDevs }: { devs: Deviation[]; setDevs: React.Dispatch<React.SetStateAction<Deviation[]>> }) {
  const [form, setForm] = useState({ scope: 'WHOLE_PLAN', what: '', baseline: '', negotiated: '', reason: '' });
  const [adding, setAdding] = useState(false);
  function addDev() {
    if (!form.what || !form.reason) return;
    setDevs((ds) => [...ds, { ...form, id: Math.random().toString(36).slice(2, 9) }]);
    setForm({ scope: 'WHOLE_PLAN', what: '', baseline: '', negotiated: '', reason: '' });
    setAdding(false);
  }
  return (
    <div className="flex flex-col gap-4">
      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <div className="flex items-center justify-between px-4 py-2.5 border-b border-border/40 bg-muted/10">
          <span className="text-xs font-semibold">Deviation Register</span>
          <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
            <span>Total: {devs.length}</span><span className="text-amber-600">Pending: {devs.length}</span>
          </div>
        </div>
        {devs.length === 0 && !adding ? (
          <div className="px-4 py-6 text-center text-xs text-muted-foreground">No deviations recorded — this step is optional.</div>
        ) : (
          <div className="divide-y divide-border/40">
            {devs.map((dev) => (
              <div key={dev.id} className="px-4 py-3 flex items-start justify-between gap-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="text-[10px] bg-muted text-muted-foreground rounded px-1.5 py-0.5">{dev.scope.replace(/_/g, ' ')}</span>
                    <span className="text-xs font-medium">{dev.what}</span>
                  </div>
                  {(dev.baseline || dev.negotiated) && (
                    <p className="text-[11px] text-muted-foreground">{dev.baseline} {'->'} <span className="text-foreground">{dev.negotiated}</span></p>
                  )}
                  <p className="text-[11px] text-muted-foreground mt-0.5 italic">{dev.reason}</p>
                </div>
                <button type="button" onClick={() => setDevs((ds) => ds.filter((d) => d.id !== dev.id))} className="p-1 rounded hover:bg-muted text-muted-foreground shrink-0">
                  <Trash2 className="size-3" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
      {adding ? (
        <div className="rounded-xl border border-border bg-card px-4 py-4 flex flex-col gap-3">
          <p className="text-xs font-semibold">New deviation</p>
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <Label className="text-[10px] font-medium text-muted-foreground mb-1.5 block">Scope</Label>
              <div className="grid grid-cols-2 gap-2">
                {([
                  { val: 'WHOLE_PLAN', label: 'Whole Plan',  desc: 'Applies to the entire plan' },
                  { val: 'GRADES',     label: 'Grades',      desc: 'Specific grade slabs only' },
                  { val: 'MEMBERS',    label: 'Members',     desc: 'Named members / sub-groups' },
                  { val: 'FREE_FORM',  label: 'Free Form',   desc: 'Custom scope description' },
                ]).map(({ val, label, desc }) => (
                  <button key={val} type="button" onClick={() => setForm((f) => ({ ...f, scope: val }))}
                    className={cn('flex flex-col gap-0.5 rounded-xl border-2 p-2.5 text-left transition-all',
                      form.scope === val ? 'border-foreground/50 bg-muted/60 shadow-sm' : 'border-border bg-card hover:border-foreground/20 hover:bg-muted/40')}>
                    <p className="text-[11px] font-semibold text-foreground">{label}</p>
                    <p className="text-[10px] text-muted-foreground leading-snug">{desc}</p>
                  </button>
                ))}
              </div>
            </div>
            <FieldRow label="What *"><Input value={form.what} onChange={(e) => setForm((f) => ({ ...f, what: e.target.value }))} placeholder="e.g. Entry age override" className="h-8 text-xs" /></FieldRow>
            <FieldRow label="Baseline"><Input value={form.baseline} onChange={(e) => setForm((f) => ({ ...f, baseline: e.target.value }))} placeholder="Current value" className="h-8 text-xs" /></FieldRow>
            <FieldRow label="Negotiated"><Input value={form.negotiated} onChange={(e) => setForm((f) => ({ ...f, negotiated: e.target.value }))} placeholder="Agreed override" className="h-8 text-xs" /></FieldRow>
            <FieldRow label="Reason *"><Input value={form.reason} onChange={(e) => setForm((f) => ({ ...f, reason: e.target.value }))} placeholder="Business justification" className="h-8 text-xs" /></FieldRow>
          </div>
          <div className="flex items-center gap-2 justify-end">
            <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => setAdding(false)}>Cancel</Button>
            <Button size="sm" className="h-7 text-xs" onClick={addDev} disabled={!form.what || !form.reason}>Add deviation</Button>
          </div>
        </div>
      ) : (
        <Button size="sm" variant="outline" className="h-7 text-xs self-start" onClick={() => setAdding(true)}>
          <Plus className="size-3 mr-1.5" /> Add deviation
        </Button>
      )}
    </div>
  );
}

// ─── Wizard ───────────────────────────────────────────────────────────────────

function PlanWizardInner({ rfqId }: { rfqId: string }) {
  const { bundle, updateBundle } = useRfqBundle();
  const router = useRouter();
  const searchParams = useSearchParams();

  const planId    = searchParams.get('planId')    ?? undefined;
  const versionId = searchParams.get('versionId') ?? '';
  const templateId = searchParams.get('template')  ?? undefined;
  const isEdit    = !!planId;

  const existingPlan = isEdit && bundle ? bundle.plans.find((p) => p.planId === planId) : undefined;

  const [step, setStep] = useState<StepKey>('product');
  const [visited, setVisited] = useState<number[]>(() => isEdit ? STEPS.map((_, i) => i) : [0]);
  const [ws, setWs] = useState<WizardState>(() => {
    if (existingPlan) {
      return {
        planNumber: existingPlan.planNumber ?? '', planName: existingPlan.name ?? '',
        productCode: existingPlan.productCode ?? '', effectiveFrom: existingPlan.effectiveFrom ?? '',
        effectiveTo: existingPlan.effectiveTo ?? '', subsidiaryScope: existingPlan.subsidiaryScope ?? 'WHOLE_GROUP',
        coverPattern: existingPlan.coverPattern, sumAssuredBasis: existingPlan.sumAssuredBasis,
        flatSi: String(existingPlan.flatSi ?? ''), salaryMultiple: String(existingPlan.salaryMultiple ?? '3'),
        benefits: [...existingPlan.benefits], minEntryAge: String(existingPlan.minEntryAge ?? '18'),
        maxEntryAge: String(existingPlan.maxEntryAge ?? '60'), cessationAge: String(existingPlan.cessationAge ?? '65'),
        livesCovered: existingPlan.livesCovered ?? LivesCovered.MEMBER_ONLY,
        employmentTypes: existingPlan.allowedEmploymentTypes ?? ['PERMANENT'],
        uwMethod: existingPlan.uwMethod ?? 'STP', fclInherited: existingPlan.fclInherited ?? true,
        fclPattern: existingPlan.fclPatternOverride ?? FclPattern.OVERALL,
        evidencePack: existingPlan.evidencePack ?? 'WITHIN_FCL_MINIMAL', rateCardRef: existingPlan.rateCardRef ?? '',
      };
    }
    const prefill = templateId ? (WIZARD_TEMPLATES[templateId] ?? {}) : {};
    return { ...INITIAL, ...prefill };
  });
  const [devs, setDevs] = useState<Deviation[]>([]);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  if (!bundle) return null;

  const activeVersion = bundle.quoteVersions?.find((v) => v.id === versionId);
  const isFrozen = activeVersion?.status === VersionStatus.FROZEN;
  const activeSubsidiaries = (bundle.subsidiaries ?? []).filter((s: import('@/lib/types').Subsidiary) => s.status === 'ACTIVE');
  const appetite = bundle.mphAppetite;

  const upd = <K extends keyof WizardState>(key: K) => (val: WizardState[K]) =>
    setWs((s) => ({ ...s, [key]: val }));

  const currentIdx = STEPS.findIndex((s) => s.key === step);

  function canProceed(from: StepKey): boolean {
    switch (from) {
      case 'product':     return !!ws.productCode && !!ws.effectiveFrom;
      case 'coverage':    return !!ws.sumAssuredBasis && ws.benefits.length > 0 &&
        (ws.sumAssuredBasis !== SumAssuredBasis.FLAT || !!ws.flatSi) &&
        (ws.sumAssuredBasis !== SumAssuredBasis.SALARY_MULTIPLE || !!ws.salaryMultiple);
      case 'eligibility': { const min = Number(ws.minEntryAge); const max = Number(ws.maxEntryAge); const ces = Number(ws.cessationAge); return min > 0 && max > min && ces >= max; }
      case 'uw':          return !!ws.uwMethod && !!ws.evidencePack;
      case 'ratecard':    return !!ws.rateCardRef;
      case 'deviations':  return true;
    }
  }

  function isStepComplete(idx: number): boolean { return canProceed(STEPS[idx].key as StepKey); }

  function goToStep(key: StepKey) {
    const targetIdx = STEPS.findIndex((s) => s.key === key);
    setVisited((prev) => { const s = new Set(prev); s.add(currentIdx); s.add(targetIdx); return Array.from(s); });
    setStep(key);
  }

  const facts = [!!ws.productCode, !!ws.effectiveFrom && !!ws.effectiveTo, !!ws.sumAssuredBasis, ws.benefits.length > 0, Number(ws.minEntryAge) < Number(ws.maxEntryAge), !!ws.uwMethod, !!ws.rateCardRef];
  const completeness = Math.round((facts.filter(Boolean).length / 7) * 100);
  const stepsDone = STEPS.filter((_, i) => isStepComplete(i) && visited.includes(i) && i !== currentIdx).length;
  const allDone   = STEPS.every((_, i) => isStepComplete(i));
  const hasStarted = !!ws.productCode || !!ws.planName || !!ws.effectiveFrom;
  const selectedCard = RATE_CARDS.find((c) => c.ref === ws.rateCardRef);
  const isLastStep = currentIdx === STEPS.length - 1;
  const backUrl = versionId ? `/rfq2/${rfqId}/${versionId}` : `/rfq2/${rfqId}`;

  async function handleSave() {
    if (isFrozen) return;
    setSaving(true); setSaveError(null);
    const payload: Partial<import('@/lib/types').Plan> = {
      quoteVersionId: versionId, planNumber: ws.planNumber, name: ws.planName || ws.productCode,
      productCode: ws.productCode, effectiveFrom: ws.effectiveFrom, effectiveTo: ws.effectiveTo,
      subsidiaryScope: ws.subsidiaryScope === 'WHOLE_GROUP' ? undefined : ws.subsidiaryScope,
      coverPattern: ws.coverPattern, sumAssuredBasis: ws.sumAssuredBasis,
      flatSi:         ws.sumAssuredBasis === SumAssuredBasis.FLAT            ? Number(ws.flatSi)         : undefined,
      salaryMultiple: ws.sumAssuredBasis === SumAssuredBasis.SALARY_MULTIPLE ? Number(ws.salaryMultiple) : undefined,
      benefits: ws.benefits, excludedClauses: [], minEntryAge: Number(ws.minEntryAge),
      maxEntryAge: Number(ws.maxEntryAge), cessationAge: Number(ws.cessationAge),
      livesCovered: ws.livesCovered, allowedEmploymentTypes: ws.employmentTypes,
      uwMethod: ws.uwMethod as import('@/lib/types').Plan['uwMethod'],
      fclInherited: ws.fclInherited, fclPatternOverride: ws.fclInherited ? undefined : ws.fclPattern,
      evidencePack: ws.evidencePack as import('@/lib/types').Plan['evidencePack'],
      rateCardRef: ws.rateCardRef || undefined, handoffStatus: PlanHandoffStatus.DRAFT, completeness,
    };
    try {
      if (isEdit && planId) {
        const res = await fetch(`/api/rfqs/${rfqId}/plans/${planId}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
        if (!res.ok) throw new Error(await res.text());
        const updated = await res.json();
        updateBundle({ plans: bundle.plans.map((p) => p.planId === planId ? updated : p) });
      } else {
        const res = await fetch(`/api/rfqs/${rfqId}/plans`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
        if (!res.ok) throw new Error(await res.text());
        const created = await res.json();
        updateBundle({ plans: [...bundle.plans, created] });
      }
      router.push(backUrl);
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Save failed');
    } finally { setSaving(false); }
  }

  return (
    <div className="flex flex-col h-full overflow-hidden bg-background">
      {/* Header */}
      <div className="shrink-0 border-b border-border/40">
        <PageHeader
          title={isEdit ? 'Edit Plan' : 'New Plan'}
          subtitle={`${bundle.employerName} · ${rfqId.toUpperCase()}`}
          actions={
            <>
              {isFrozen && <span className="text-xs text-muted-foreground flex items-center gap-1.5"><Lock className="size-3" /> Frozen</span>}
              {saveError && <span className="text-xs text-destructive max-w-xs truncate">{saveError}</span>}
              <Button variant="ghost" size="sm" onClick={() => router.push(backUrl)}>Cancel</Button>
              <Button size="sm" disabled={saving || isFrozen} onClick={handleSave} className="gap-1">
                {saving ? <Loader2 className="size-3.5 animate-spin" /> : <Check className="size-3.5" />}
                {isEdit ? 'Save changes' : 'Save plan'}
              </Button>
            </>
          }
        />
      </div>

      {/* 3-col body */}
      <div className="flex flex-1 min-h-0 overflow-hidden">
        {/* Left — vertical stepper */}
        <div className="w-52 shrink-0 border-r border-border/40 px-3 py-4 overflow-y-auto overflow-x-hidden">
          <div className="flex flex-col gap-1">
            <div className="text-[10px] text-muted-foreground mb-2 font-medium">
              {STEPS.filter((_, i) => isStepComplete(i) && i !== currentIdx && visited.includes(i)).length} / {STEPS.length} steps done
            </div>
            {STEPS.map(({ key, label }, idx) => {
              const isCurrent   = idx === currentIdx;
              const isDone      = isStepComplete(idx) && !isCurrent && visited.includes(idx);
              const isClickable = isDone || isCurrent || visited.includes(idx);
              return (
                <button key={key} type="button" disabled={!isClickable} onClick={() => isClickable && goToStep(key)}
                  className={cn('flex items-center gap-2.5 px-3 py-2 rounded-lg text-left text-xs transition-colors w-full min-w-0',
                    isCurrent ? 'bg-primary/10 text-foreground font-semibold' : isDone ? 'text-foreground hover:bg-muted cursor-pointer' : isClickable ? 'text-muted-foreground hover:bg-muted cursor-pointer' : 'text-muted-foreground/40 cursor-not-allowed')}>
                  <span className={cn('flex size-5 items-center justify-center rounded-full text-[10px] font-bold shrink-0',
                    isCurrent ? 'bg-primary/15 text-foreground' : isDone ? 'bg-primary/20 text-primary' : 'bg-muted/30 text-muted-foreground/40')}>
                    {isDone ? <Check className="size-3" /> : idx + 1}
                  </span>
                  <span className="truncate min-w-0">{label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Center — step content + nav footer */}
        <div className="flex-1 min-w-0 flex flex-col">
          <div className="flex-1 overflow-y-auto px-6 py-5">
            <h2 className="text-sm font-semibold text-foreground mb-4">{STEPS[currentIdx].label}</h2>

            {/* ── Step: product ─────────────────────────────────────────────── */}
            {step === 'product' && (
              <div className="flex flex-col gap-5">
                <Field label="Product" required>
                  <div className="grid grid-cols-1 gap-2">
                    {PRODUCT_CATALOG.map((prod) => (
                      <button key={prod.id} type="button"
                        onClick={() => { upd('productCode')(prod.id); if (!ws.planName) upd('planName')(prod.name); }}
                        className={cn('rounded-xl border-2 px-4 py-3 text-left transition-all', ws.productCode === prod.id ? 'border-foreground/50 bg-muted/60 shadow-sm' : 'border-border bg-card hover:border-foreground/20 hover:bg-muted/40')}>
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-xs font-semibold">{prod.name}</p>
                            <p className="text-[11px] text-muted-foreground mt-0.5">{prod.description}</p>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] font-mono text-muted-foreground/60">{prod.id}</span>
                            {ws.productCode === prod.id && <Check className="size-4 text-foreground" />}
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                </Field>
                <div className="grid grid-cols-2 gap-4">
                  <Field label="Plan number" required><Input value={ws.planNumber} onChange={(e) => upd('planNumber')(e.target.value)} placeholder="P001" className="h-8 text-xs" /></Field>
                  <Field label="Plan name" required><Input value={ws.planName} onChange={(e) => upd('planName')(e.target.value)} placeholder="e.g. GTL Staff Plan" className="h-8 text-xs" /></Field>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <Field label="Effective from" required><Input type="date" value={ws.effectiveFrom} onChange={(e) => upd('effectiveFrom')(e.target.value)} className="h-8 text-xs" /></Field>
                  <Field label="Effective to" required><Input type="date" value={ws.effectiveTo} onChange={(e) => upd('effectiveTo')(e.target.value)} className="h-8 text-xs" /></Field>
                </div>
                {activeSubsidiaries.length > 0 && (
                  <Field label="Subsidiary scope">
                    <div className="grid grid-cols-2 gap-3">
                      {([
                        { id: 'WHOLE_GROUP', name: 'Whole group', sub: 'Plan applies to all group members regardless of subsidiary' },
                        ...activeSubsidiaries.map((s) => ({ id: s.subsidiaryId, name: s.name, sub: 'Plan scoped to this subsidiary entity only' })),
                      ]).map((opt) => {
                        const sel = ws.subsidiaryScope === opt.id;
                        return (
                          <button key={opt.id} type="button" onClick={() => upd('subsidiaryScope')(opt.id)}
                            className={cn('flex flex-col gap-0.5 rounded-xl border-2 p-3 text-left transition-all',
                              sel ? 'border-foreground/50 bg-muted/60' : 'border-border bg-card hover:border-foreground/20 hover:bg-muted/30')}>
                            <p className="text-xs font-semibold text-foreground">{opt.name}</p>
                            <p className="text-[10px] text-muted-foreground leading-snug">{opt.sub}</p>
                          </button>
                        );
                      })}
                    </div>
                  </Field>
                )}
              </div>
            )}

            {/* ── Step: coverage ────────────────────────────────────────────── */}
            {step === 'coverage' && (
              <div className="flex flex-col gap-5">
                <Field label="Cover pattern" required>
                  <div className="grid grid-cols-2 gap-3">
                    {([
                      { val: CoverPattern.LEVEL,    icon: Minus,        label: 'Level',    desc: 'Fixed cover throughout the policy term' },
                      { val: CoverPattern.REDUCING, icon: TrendingDown, label: 'Reducing', desc: 'Cover decreases over the policy term' },
                    ] as const).map(({ val, icon: Icon, label, desc }) => {
                      const sel = ws.coverPattern === val;
                      return (
                        <button key={val} type="button" onClick={() => upd('coverPattern')(val)}
                          className={cn('flex flex-col gap-2.5 rounded-xl border-2 p-4 text-left transition-all',
                            sel ? 'border-foreground/50 bg-muted/60 shadow-sm' : 'border-border bg-card hover:border-foreground/20 hover:bg-muted/40')}>
                          <Icon className={cn('size-5', sel ? 'text-foreground' : 'text-muted-foreground')} />
                          <div>
                            <p className="text-xs font-semibold text-foreground">{label}</p>
                            <p className="text-[10px] text-muted-foreground mt-0.5 leading-snug">{desc}</p>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </Field>
                <Field label="Sum assured basis" required>
                  <div className="grid grid-cols-3 gap-3">
                    {([
                      { val: SumAssuredBasis.FLAT,            icon: Banknote,   label: 'Flat sum insured', desc: 'Same cover for every member' },
                      { val: SumAssuredBasis.SALARY_MULTIPLE, icon: TrendingUp, label: 'Salary multiple',  desc: 'Cover scales with pay' },
                      { val: SumAssuredBasis.GRADE_SLAB,      icon: LayoutList, label: 'Grade slab',       desc: 'Per-grade SI from census' },
                    ] as const).map(({ val, icon: Icon, label, desc }) => {
                      const sel = ws.sumAssuredBasis === val;
                      return (
                        <button key={val} type="button" onClick={() => upd('sumAssuredBasis')(val)}
                          className={cn('flex flex-col gap-2.5 rounded-xl border-2 p-4 text-left transition-all',
                            sel ? 'border-foreground/50 bg-muted/60 shadow-sm' : 'border-border bg-card hover:border-foreground/20 hover:bg-muted/40')}>
                          <Icon className={cn('size-5', sel ? 'text-foreground' : 'text-muted-foreground')} />
                          <div>
                            <p className="text-xs font-semibold text-foreground">{label}</p>
                            <p className="text-[10px] text-muted-foreground mt-0.5 leading-snug">{desc}</p>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </Field>
                {ws.sumAssuredBasis === SumAssuredBasis.FLAT && (
                  <div className="rounded-xl border bg-muted/30 p-4">
                    <Field label="Default flat sum insured" required>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground select-none">₹</span>
                        <Input type="number" min={0} step={100000} value={ws.flatSi} onChange={(e) => upd('flatSi')(e.target.value)} placeholder="5000000" className="pl-7 h-9 text-sm" />
                      </div>
                      <p className="text-[10px] text-muted-foreground">= ₹{Number(ws.flatSi || 0).toLocaleString('en-IN')}</p>
                    </Field>
                  </div>
                )}
                {ws.sumAssuredBasis === SumAssuredBasis.SALARY_MULTIPLE && (
                  <div className="rounded-xl border bg-muted/30 p-4">
                    <Field label="Default salary multiple" required>
                      <div className="relative">
                        <Input type="number" min={1} step={0.5} value={ws.salaryMultiple} onChange={(e) => upd('salaryMultiple')(e.target.value)} placeholder="3" className="pr-[4.5rem] h-9 text-sm" />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground select-none">× salary</span>
                      </div>
                      <p className="text-[10px] text-muted-foreground">Member cover = {ws.salaryMultiple || '—'}× annual salary</p>
                    </Field>
                  </div>
                )}
                {ws.sumAssuredBasis === SumAssuredBasis.GRADE_SLAB && (
                  <div className="rounded-xl border border-border/50 bg-muted/30 p-4 text-xs text-muted-foreground flex items-start gap-2">
                    <Info className="mt-0.5 size-3.5 shrink-0 text-muted-foreground/60" />
                    <div>
                      <p>Ships with an empty slab list — seeded from the RFQ&apos;s census grades at use.</p>
                      <p className="mt-1 font-medium text-foreground/70">FCL mode will be stamped as BY_GRADE.</p>
                    </div>
                  </div>
                )}
                <Field label="Benefits" required>
                  <div className="flex flex-wrap gap-2">
                    {BENEFIT_OPTIONS.map((b) => {
                      const active = ws.benefits.includes(b);
                      return (
                        <button key={b} type="button" disabled={b === 'Death Benefit'}
                          onClick={() => b !== 'Death Benefit' && upd('benefits')(active ? ws.benefits.filter((x) => x !== b) : [...ws.benefits, b])}
                          className={cn(
                            'inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-all',
                            active ? 'border-foreground/50 bg-foreground text-background' : 'border-border bg-card text-muted-foreground hover:border-foreground/30 hover:text-foreground',
                            b === 'Death Benefit' && 'cursor-not-allowed',
                          )}>
                          {active && <Check className="size-3" />}
                          {b}
                        </button>
                      );
                    })}
                  </div>
                  <p className="text-[11px] text-muted-foreground mt-1">Death Benefit is mandatory.</p>
                </Field>
              </div>
            )}

            {/* ── Step: eligibility ─────────────────────────────────────────── */}
            {step === 'eligibility' && (() => {
              const min = Number(ws.minEntryAge); const max = Number(ws.maxEntryAge); const ces = Number(ws.cessationAge);
              const ageViolation = min >= max || max > ces;
              const showBar = !ageViolation && min > 0 && max > 0 && ces > 0;
              return (
                <div className="flex flex-col gap-5">
                  <Field label="Age band" required>
                    <div className="grid grid-cols-3 gap-3">
                      {[
                        { label: 'Min entry', value: ws.minEntryAge, onChange: (v: string) => upd('minEntryAge')(v) },
                        { label: 'Max entry', value: ws.maxEntryAge, onChange: (v: string) => upd('maxEntryAge')(v) },
                        { label: 'Cessation', value: ws.cessationAge, onChange: (v: string) => upd('cessationAge')(v) },
                      ].map(({ label, value, onChange }) => (
                        <div key={label} className="flex flex-col gap-1">
                          <span className="text-[10px] font-medium text-muted-foreground">{label}</span>
                          <div className="relative">
                            <Input type="number" value={value} onChange={(e) => onChange(e.target.value)}
                              className={cn('pr-8 h-9 text-sm', ageViolation && 'border-destructive')} />
                            <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] text-muted-foreground select-none">yrs</span>
                          </div>
                        </div>
                      ))}
                    </div>
                    {showBar && (
                      <div className="mt-2 rounded-xl border bg-muted/20 px-4 py-3">
                        <div className="relative h-2 bg-muted rounded-full overflow-hidden">
                          <div className="absolute h-full bg-primary/25 rounded-full"
                            style={{ left: `${Math.min((min / 100) * 100, 95)}%`, width: `${Math.max(((ces - min) / 100) * 100, 5)}%` }} />
                          <div className="absolute h-full bg-primary/70 rounded-full"
                            style={{ left: `${Math.min((min / 100) * 100, 95)}%`, width: `${Math.max(((max - min) / 100) * 100, 2)}%` }} />
                        </div>
                        <div className="flex items-center justify-between mt-1.5 text-[10px] text-muted-foreground">
                          <span>{min} entry</span>
                          <span className="font-medium text-foreground">{max} max entry</span>
                          <span>{ces} cessation</span>
                        </div>
                      </div>
                    )}
                    {ageViolation && (
                      <div className="flex items-center gap-2 text-xs text-destructive bg-destructive/5 rounded-lg border border-destructive/20 px-3 py-2 mt-1">
                        <AlertTriangle className="size-3.5 shrink-0" />
                        Min entry age must be less than max, which must be ≤ cessation age.
                      </div>
                    )}
                  </Field>
                  <Field label="Lives covered" required>
                    <div className="grid grid-cols-3 gap-3">
                      {([
                        { val: LivesCovered.MEMBER_ONLY,   icon: User,  label: 'Member only',     desc: 'Employee only' },
                        { val: LivesCovered.MEMBER_SPOUSE, icon: Users, label: 'Member + Spouse', desc: 'Employee + partner' },
                        { val: LivesCovered.FAMILY,        icon: Home,  label: 'Family',          desc: 'Employee + dependants' },
                      ] as const).map(({ val, icon: Icon, label, desc }) => {
                        const sel = ws.livesCovered === val;
                        return (
                          <button key={val} type="button" onClick={() => upd('livesCovered')(val)}
                            className={cn('flex flex-col gap-2.5 rounded-xl border-2 p-4 text-left transition-all',
                              sel ? 'border-foreground/50 bg-muted/60 shadow-sm' : 'border-border bg-card hover:border-foreground/20 hover:bg-muted/40')}>
                            <Icon className={cn('size-5', sel ? 'text-foreground' : 'text-muted-foreground')} />
                            <div>
                              <p className="text-xs font-semibold text-foreground">{label}</p>
                              <p className="text-[10px] text-muted-foreground mt-0.5 leading-snug">{desc}</p>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </Field>
                  <Field label="Employment types" required>
                    <div className="flex flex-wrap gap-2">
                      {EMPLOYMENT_TYPES.map((et) => {
                        const active = ws.employmentTypes.includes(et);
                        return (
                          <button key={et} type="button"
                            onClick={() => upd('employmentTypes')(active ? ws.employmentTypes.filter((x) => x !== et) : [...ws.employmentTypes, et])}
                            className={cn('inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-all',
                              active ? 'border-foreground/50 bg-foreground text-background' : 'border-border bg-card text-muted-foreground hover:border-foreground/30 hover:text-foreground')}>
                            {active && <Check className="size-3" />}
                            {et}
                          </button>
                        );
                      })}
                    </div>
                  </Field>
                </div>
              );
            })()}

            {/* ── Step: uw ──────────────────────────────────────────────────── */}
            {step === 'uw' && (
              <div className="flex flex-col gap-5">
                {appetite && (
                  <div className="flex items-start gap-2.5 rounded-xl border px-4 py-3 text-xs bg-amber-50 border-amber-200 text-amber-800">
                    <Info className="size-3.5 shrink-0 mt-0.5" />
                    <span>UW authority band: {appetite.uwAuthorityBand}</span>
                  </div>
                )}
                <Field label="UW method" required>
                  <div className="grid grid-cols-2 gap-3">
                    {UW_METHODS.map(({ value, icon: Icon, label, desc }) => {
                      const sel = ws.uwMethod === value;
                      return (
                        <button key={value} type="button" onClick={() => upd('uwMethod')(value)}
                          className={cn('flex flex-col gap-2.5 rounded-xl border-2 p-4 text-left transition-all',
                            sel ? 'border-foreground/50 bg-muted/60 shadow-sm' : 'border-border bg-card hover:border-foreground/20 hover:bg-muted/40')}>
                          <Icon className={cn('size-5', sel ? 'text-foreground' : 'text-muted-foreground')} />
                          <div>
                            <p className="text-xs font-semibold text-foreground">{label}</p>
                            <p className="text-[10px] text-muted-foreground mt-0.5 leading-snug">{desc}</p>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </Field>
                <Field label="FCL posture" required>
                  <div className="flex items-center gap-3 mb-2">
                    <button type="button" onClick={() => upd('fclInherited')(!ws.fclInherited)}
                      className={cn('relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors', ws.fclInherited ? 'bg-primary' : 'bg-muted')}>
                      <span className={cn('inline-block size-4 rounded-full bg-white shadow transition-transform', ws.fclInherited ? 'translate-x-4' : 'translate-x-0')} />
                    </button>
                    <span className="text-xs">{ws.fclInherited ? 'Inherited from version/quote policy' : 'Override — select pattern below'}</span>
                  </div>
                  {!ws.fclInherited && (
                    <div className="flex flex-wrap gap-2">
                      {([FclPattern.OVERALL, FclPattern.BY_GRADE, FclPattern.BY_AGE_BAND, FclPattern.BY_GENDER] as const).map((pat) => (
                        <button key={pat} type="button" onClick={() => upd('fclPattern')(pat)}
                          className={cn('rounded-lg border px-3 py-1.5 text-xs transition-all', ws.fclPattern === pat ? 'border-primary bg-primary/5 text-foreground' : 'border-border text-muted-foreground hover:border-primary/40')}>
                          {pat.replace(/_/g, ' ')}
                        </button>
                      ))}
                    </div>
                  )}
                </Field>
                <Field label="Evidence pack" required>
                  <div className="grid grid-cols-2 gap-3">
                    {EVIDENCE_PACKS.map((ep) => {
                      const sel = ws.evidencePack === ep.value;
                      return (
                        <button key={ep.value} type="button" onClick={() => upd('evidencePack')(ep.value)}
                          className={cn('flex flex-col gap-0.5 rounded-xl border-2 p-3 text-left transition-all',
                            sel ? 'border-foreground/50 bg-muted/60' : 'border-border bg-card hover:border-foreground/20 hover:bg-muted/30')}>
                          <p className="text-xs font-semibold text-foreground">{ep.label}</p>
                          <p className="text-[10px] text-muted-foreground leading-snug">{ep.sub}</p>
                        </button>
                      );
                    })}
                  </div>
                </Field>
              </div>
            )}

            {/* ── Step: ratecard ────────────────────────────────────────────── */}
            {step === 'ratecard' && (
              <div className="flex flex-col gap-4">
                {RATE_CARDS.length === 0 && (
                  <div className="rounded-xl border border-dashed border-border bg-card px-4 py-6 text-center text-xs text-muted-foreground">No rate cards available.</div>
                )}
                {RATE_CARDS.map((card) => (
                  <button key={card.ref} type="button" onClick={() => upd('rateCardRef')(card.ref)}
                    className={cn('rounded-xl border-2 px-4 py-3.5 text-left transition-all', ws.rateCardRef === card.ref ? 'border-foreground/50 bg-muted/60 shadow-sm' : 'border-border bg-card hover:border-foreground/20 hover:bg-muted/40')}>
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1">
                        <p className="text-xs font-semibold">{card.name}</p>
                        <p className="text-[11px] text-muted-foreground mt-0.5">{card.insurer}</p>
                        <div className="flex items-center gap-3 mt-2 text-[11px] text-muted-foreground">
                          <span className="font-mono">{card.ref}</span>
                          <span>{card.effectiveFrom} → {card.effectiveTo}</span>
                          <span className="text-foreground font-medium">{card.blendedRatePermille}‰</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="text-[10px] bg-emerald-600 text-white rounded-full px-2 py-0.5 font-medium">APPROVED</span>
                        {ws.rateCardRef === card.ref && <Check className="size-4 text-foreground" />}
                      </div>
                    </div>
                    {appetite?.preapprovedCardRef === card.ref && (
                      <div className="mt-2 text-[10px] text-emerald-700 bg-emerald-50 border border-emerald-200 rounded px-2 py-1">✓ Pre-approved — plan will quote straight-through</div>
                    )}
                  </button>
                ))}
              </div>
            )}

            {/* ── Step: deviations ──────────────────────────────────────────── */}
            {step === 'deviations' && <DeviationStep devs={devs} setDevs={setDevs} />}
          </div>

          {/* Nav footer */}
          <div className="shrink-0 flex items-center justify-between border-t border-border/40 px-5 py-3">
            <Button variant="outline" size="sm" disabled={currentIdx === 0} onClick={() => goToStep(STEPS[currentIdx - 1].key)} className="gap-1">
              <ChevronLeft className="size-3.5" /> Previous
            </Button>
            <Button size="sm" disabled={isLastStep || !canProceed(step)} onClick={() => !isLastStep && goToStep(STEPS[currentIdx + 1].key)} className="gap-1">
              Next <ChevronRight className="size-3.5" />
            </Button>
          </div>
        </div>

        {/* Right — live summary */}
        <div className="w-72 shrink-0 border-l border-border/40 bg-muted/5 overflow-y-auto px-3 py-4">
          <div className={cn('rounded-2xl border bg-card shadow-sm overflow-hidden transition-colors duration-500', allDone ? 'border-emerald-600/30' : hasStarted ? 'border-amber-400/40' : 'border-border/70')}>
            {/* Identity */}
            <div className={cn('px-5 pt-5 pb-4 bg-gradient-to-b transition-colors duration-500', allDone ? 'from-emerald-50/70 to-transparent' : hasStarted ? 'from-amber-50/50 to-transparent' : 'from-muted/40 to-transparent')}>
              {ws.planName ? (
                <h2 className="text-lg font-bold leading-snug text-foreground break-words">{ws.planName}</h2>
              ) : (
                <h2 className="text-lg font-bold leading-snug text-muted-foreground/40 italic select-none">Untitled plan</h2>
              )}
              <div className="flex flex-wrap items-center gap-1.5 mt-2">
                {ws.planNumber && <span className="inline-flex items-center rounded border bg-background px-1.5 py-0.5 text-[10px] font-mono text-muted-foreground/80">{ws.planNumber}</span>}
                {ws.productCode && <span className="inline-flex items-center rounded border bg-background px-1.5 py-0.5 text-[10px] font-mono text-muted-foreground/80">{ws.productCode}</span>}
              </div>
              {ws.effectiveFrom && (
                <div className="mt-3 flex items-center gap-2">
                  <div className="flex-1 rounded-xl border bg-muted/20 px-3 py-2">
                    <span className="text-[9px] uppercase tracking-wider text-muted-foreground/60 block mb-1">From</span>
                    <div className="flex items-baseline gap-1 leading-none">
                      <span className="text-2xl font-bold tabular-nums text-foreground">{new Date(ws.effectiveFrom).toLocaleDateString('en-GB', { day: '2-digit' })}</span>
                      <span className="text-xs font-medium text-muted-foreground">{new Date(ws.effectiveFrom).toLocaleDateString('en-GB', { month: 'short' })}</span>
                    </div>
                    <span className="text-[10px] text-muted-foreground/70 block mt-0.5">{new Date(ws.effectiveFrom).toLocaleDateString('en-GB', { year: 'numeric' })}</span>
                  </div>
                  <span className="text-muted-foreground/30 text-base shrink-0">→</span>
                  <div className="flex-1 rounded-xl border bg-muted/20 px-3 py-2">
                    <span className="text-[9px] uppercase tracking-wider text-muted-foreground/60 block mb-1">To</span>
                    {ws.effectiveTo ? (
                      <>
                        <div className="flex items-baseline gap-1 leading-none">
                          <span className="text-2xl font-bold tabular-nums text-foreground">{new Date(ws.effectiveTo).toLocaleDateString('en-GB', { day: '2-digit' })}</span>
                          <span className="text-xs font-medium text-muted-foreground">{new Date(ws.effectiveTo).toLocaleDateString('en-GB', { month: 'short' })}</span>
                        </div>
                        <span className="text-[10px] text-muted-foreground/70 block mt-0.5">{new Date(ws.effectiveTo).toLocaleDateString('en-GB', { year: 'numeric' })}</span>
                      </>
                    ) : (
                      <span className="text-xl font-bold text-muted-foreground/30">—</span>
                    )}
                  </div>
                </div>
              )}
            </div>
            <div className="h-px bg-border/40" />
            {/* Coverage */}
            <div className="px-5 py-4">
              <p className="text-[9px] font-semibold uppercase tracking-[0.15em] text-muted-foreground/70 mb-2.5">Coverage</p>
              {(visited.includes(1) || !!ws.productCode) ? (
                <>
                  <div className="flex items-center gap-2.5 mb-3">
                    <div className="rounded-lg border bg-muted/30 p-1.5 shrink-0">
                      {ws.sumAssuredBasis === SumAssuredBasis.FLAT ? <Banknote className="size-4 text-foreground/70" /> : ws.sumAssuredBasis === SumAssuredBasis.SALARY_MULTIPLE ? <TrendingUp className="size-4 text-foreground/70" /> : <LayoutList className="size-4 text-foreground/70" />}
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-foreground">
                        {ws.sumAssuredBasis === SumAssuredBasis.FLAT ? 'Flat SI' : ws.sumAssuredBasis === SumAssuredBasis.SALARY_MULTIPLE ? 'Salary multiple' : 'Grade slab'}
                      </p>
                      <p className="text-[10px] text-muted-foreground">{ws.coverPattern.replace(/_/g, ' ')}</p>
                    </div>
                  </div>
                  {ws.sumAssuredBasis === SumAssuredBasis.FLAT && ws.flatSi && (
                    <div className="rounded-xl bg-muted/30 px-3 py-2 mb-2.5">
                      <p className="text-[9px] uppercase tracking-widest text-muted-foreground/70 mb-0.5">Default cover</p>
                      <p className="text-3xl font-bold tabular-nums tracking-tight text-foreground leading-none">₹{Number(ws.flatSi).toLocaleString('en-IN')}</p>
                    </div>
                  )}
                  {ws.sumAssuredBasis === SumAssuredBasis.SALARY_MULTIPLE && ws.salaryMultiple && (
                    <div className="rounded-xl bg-muted/30 px-3 py-2 mb-2.5">
                      <p className="text-[9px] uppercase tracking-widest text-muted-foreground/70 mb-0.5">Salary multiple</p>
                      <p className="text-3xl font-bold tabular-nums tracking-tight text-foreground leading-none">{ws.salaryMultiple}×<span className="text-base font-normal text-muted-foreground ml-1.5">salary</span></p>
                    </div>
                  )}
                  {ws.benefits.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {ws.benefits.slice(0, 3).map((b) => <span key={b} className="text-[9px] rounded-full bg-muted border px-2 py-0.5 text-muted-foreground">{b}</span>)}
                      {ws.benefits.length > 3 && <span className="text-[9px] text-muted-foreground/60">+{ws.benefits.length - 3} more</span>}
                    </div>
                  )}
                </>
              ) : <p className="text-xs text-muted-foreground/40">—</p>}
            </div>
            <div className="h-px bg-border/40" />
            {/* Eligibility */}
            <div className="px-5 py-4">
              <p className="text-[9px] font-semibold uppercase tracking-[0.15em] text-muted-foreground/70 mb-2.5">Eligibility</p>
              {visited.includes(2) ? (
                <div className="rounded-xl border border-dashed border-border/60 bg-muted/25 p-2.5">
                  <div className="grid grid-cols-2 gap-x-2 gap-y-2">
                    {([
                      ['Entry age', ws.minEntryAge && ws.maxEntryAge ? `${ws.minEntryAge}–${ws.maxEntryAge}` : '—'],
                      ['Cessation', ws.cessationAge || '—'],
                      ['Lives', (ws.livesCovered as string).replace(/_/g, ' ')],
                      ['Employment', ws.employmentTypes.length ? `${ws.employmentTypes.length} types` : '—'],
                    ] as const).map(([k, v]) => (
                      <div key={k}>
                        <p className="text-[9px] uppercase tracking-wider text-muted-foreground/60">{k}</p>
                        <p className="text-[11px] font-semibold text-foreground">{v}</p>
                      </div>
                    ))}
                  </div>
                </div>
              ) : <p className="text-xs text-muted-foreground/40">—</p>}
            </div>
            <div className="h-px bg-border/40" />
            {/* UW & Rate card */}
            <div className="px-5 py-4">
              <p className="text-[9px] font-semibold uppercase tracking-[0.15em] text-muted-foreground/70 mb-2.5">UW & Rate card</p>
              {visited.includes(3) ? (
                <div className="space-y-2">
                  <div className="flex items-baseline justify-between gap-2">
                    <p className="text-[10px] text-muted-foreground shrink-0">UW method</p>
                    <p className="text-xs font-semibold">{ws.uwMethod || '—'}</p>
                  </div>
                  <div className="flex items-baseline justify-between gap-2">
                    <p className="text-[10px] text-muted-foreground shrink-0">FCL</p>
                    <p className="text-xs font-semibold">{ws.fclInherited ? 'Inherited' : ws.fclPattern.replace(/_/g, ' ')}</p>
                  </div>
                  <div className="flex items-baseline justify-between gap-2">
                    <p className="text-[10px] text-muted-foreground shrink-0">Evidence</p>
                    <p className="text-xs font-semibold text-right truncate max-w-[110px]">{ws.evidencePack.replace(/_/g, ' ')}</p>
                  </div>
                  {selectedCard && (
                    <div className="flex items-baseline justify-between gap-2">
                      <p className="text-[10px] text-muted-foreground shrink-0">Rate card</p>
                      <p className="text-xs font-semibold text-right truncate max-w-[110px]">{selectedCard.name}</p>
                    </div>
                  )}
                </div>
              ) : <p className="text-xs text-muted-foreground/40">—</p>}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}


// ─── V1 Wizard ─────────────────────────────────────────────────────────────────────────

function PlanWizardV1Inner({ rfqId }: { rfqId: string }) {
  const { bundle, updateBundle } = useRfqBundle();
  const router = useRouter();
  const searchParams = useSearchParams();

  const planId     = searchParams.get('planId')    ?? undefined;
  const versionId  = searchParams.get('versionId') ?? '';
  const templateId = searchParams.get('template')  ?? undefined;
  const isEdit     = !!planId;

  const [step, setStep]           = useState<StepKey>('product');
  const [visited, setVisited]     = useState<number[]>(() => isEdit ? STEPS.map((_, i) => i) : [0]);
  const [ws, setWs]               = useState<WizardState>(() => {
    const prefill = templateId ? (WIZARD_TEMPLATES[templateId] ?? {}) : {};
    return { ...INITIAL, ...prefill };
  });
  const [devs, setDevs]           = useState<Deviation[]>([]);
  const [saving, setSaving]       = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  if (!bundle) return null;

  const activeVersion = bundle.quoteVersions?.find((v) => v.id === versionId);
  const isFrozen      = activeVersion?.status === VersionStatus.FROZEN;

  const upd        = <K extends keyof WizardState>(key: K) => (val: WizardState[K]) => setWs((s) => ({ ...s, [key]: val }));
  const currentIdx = STEPS.findIndex((s) => s.key === step);

  function canProceed(from: StepKey): boolean {
    switch (from) {
      case 'product':     return !!ws.productCode && !!ws.effectiveFrom;
      case 'coverage':    return !!ws.sumAssuredBasis && ws.benefits.length > 0 &&
        (ws.sumAssuredBasis !== SumAssuredBasis.FLAT || !!ws.flatSi) &&
        (ws.sumAssuredBasis !== SumAssuredBasis.SALARY_MULTIPLE || !!ws.salaryMultiple);
      case 'eligibility': { const min = Number(ws.minEntryAge), max = Number(ws.maxEntryAge), ces = Number(ws.cessationAge); return min > 0 && max > min && ces >= max; }
      case 'uw':          return !!ws.uwMethod && !!ws.evidencePack;
      case 'ratecard':    return !!ws.rateCardRef;
      case 'deviations':  return true;
    }
  }

  function isStepComplete(idx: number) { return canProceed(STEPS[idx].key as StepKey); }

  function goToStep(key: StepKey) {
    const targetIdx = STEPS.findIndex((s) => s.key === key);
    setVisited((prev) => { const s = new Set(prev); s.add(currentIdx); s.add(targetIdx); return Array.from(s); });
    setStep(key);
  }

  const isLastStep = currentIdx === STEPS.length - 1;
  const backUrl    = versionId ? `/rfq2/${rfqId}/${versionId}` : `/rfq2/${rfqId}`;

  async function handleSave() {
    if (isFrozen) return;
    setSaving(true); setSaveError(null);
    const facts = [!!ws.productCode, !!ws.effectiveFrom && !!ws.effectiveTo, !!ws.sumAssuredBasis, ws.benefits.length > 0, Number(ws.minEntryAge) < Number(ws.maxEntryAge), !!ws.uwMethod, !!ws.rateCardRef];
    const completeness = Math.round((facts.filter(Boolean).length / 7) * 100);
    const payload: Partial<import('@/lib/types').Plan> = {
      quoteVersionId: versionId, planNumber: ws.planNumber, name: ws.planName || ws.productCode,
      productCode: ws.productCode, effectiveFrom: ws.effectiveFrom, effectiveTo: ws.effectiveTo,
      subsidiaryScope: ws.subsidiaryScope === 'WHOLE_GROUP' ? undefined : ws.subsidiaryScope,
      coverPattern: ws.coverPattern, sumAssuredBasis: ws.sumAssuredBasis,
      flatSi:         ws.sumAssuredBasis === SumAssuredBasis.FLAT            ? Number(ws.flatSi)         : undefined,
      salaryMultiple: ws.sumAssuredBasis === SumAssuredBasis.SALARY_MULTIPLE ? Number(ws.salaryMultiple) : undefined,
      benefits: ws.benefits, excludedClauses: [], minEntryAge: Number(ws.minEntryAge),
      maxEntryAge: Number(ws.maxEntryAge), cessationAge: Number(ws.cessationAge),
      livesCovered: ws.livesCovered, allowedEmploymentTypes: ws.employmentTypes,
      uwMethod: ws.uwMethod as import('@/lib/types').Plan['uwMethod'],
      fclInherited: ws.fclInherited, fclPatternOverride: ws.fclInherited ? undefined : ws.fclPattern,
      evidencePack: ws.evidencePack as import('@/lib/types').Plan['evidencePack'],
      rateCardRef: ws.rateCardRef || undefined, handoffStatus: PlanHandoffStatus.DRAFT, completeness,
    };
    try {
      if (isEdit && planId) {
        const res = await fetch(`/api/rfqs/${rfqId}/plans/${planId}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
        if (!res.ok) throw new Error(await res.text());
        const updated = await res.json();
        updateBundle({ plans: bundle.plans.map((p) => p.planId === planId ? updated : p) });
      } else {
        const res = await fetch(`/api/rfqs/${rfqId}/plans`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
        if (!res.ok) throw new Error(await res.text());
        const created = await res.json();
        updateBundle({ plans: [...bundle.plans, created] });
      }
      router.push(backUrl);
    } catch (err) { setSaveError(err instanceof Error ? err.message : 'Save failed'); }
    finally { setSaving(false); }
  }

  function Pill({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
    return (
      <button type="button" onClick={onClick}
        className={cn('rounded-lg border px-3 py-2 text-xs font-medium transition-colors text-center',
          active ? 'border-foreground/40 bg-muted/60 text-foreground' : 'border-border text-muted-foreground hover:border-foreground/20 hover:text-foreground')}>
        {children}
      </button>
    );
  }

  const selectedCard = RATE_CARDS.find((c) => c.ref === ws.rateCardRef);

  return (
    <div className="flex flex-col h-full overflow-hidden bg-background">
      <div className="shrink-0 border-b border-border/40">
        <PageHeader
          title={isEdit ? 'Edit Plan' : 'New Plan'}
          subtitle={`${bundle.employerName} · ${rfqId.toUpperCase()}`}
          actions={
            <>
              {isFrozen && <span className="text-xs text-muted-foreground flex items-center gap-1.5"><Lock className="size-3" /> Frozen</span>}
              {saveError && <span className="text-xs text-destructive max-w-xs truncate">{saveError}</span>}
              <Button variant="ghost" size="sm" onClick={() => router.push(backUrl)}>Cancel</Button>
              <Button size="sm" disabled={saving || isFrozen} onClick={handleSave} className="gap-1">
                {saving ? <Loader2 className="size-3.5 animate-spin" /> : <Check className="size-3.5" />}
                {isEdit ? 'Save changes' : 'Save plan'}
              </Button>
            </>
          }
        />
      </div>
      <div className="flex flex-1 min-h-0 overflow-hidden">
        {/* Left — stepper */}
        <div className="w-52 shrink-0 border-r border-border/40 px-3 py-4 overflow-y-auto overflow-x-hidden">
          <div className="flex flex-col gap-1">
            <div className="text-[10px] text-muted-foreground mb-2 font-medium">
              {STEPS.filter((_, i) => isStepComplete(i) && i !== currentIdx && visited.includes(i)).length} / {STEPS.length} complete
            </div>
            {STEPS.map(({ key, label }, idx) => {
              const isCurrent   = idx === currentIdx;
              const isDone      = isStepComplete(idx) && !isCurrent && visited.includes(idx);
              const isClickable = isDone || isCurrent || visited.includes(idx);
              return (
                <button key={key} type="button" disabled={!isClickable} onClick={() => isClickable && goToStep(key)}
                  className={cn('flex items-center gap-2.5 px-3 py-2 rounded-lg text-left text-xs transition-colors w-full min-w-0',
                    isCurrent ? 'bg-primary/10 text-foreground font-semibold' : isDone ? 'text-foreground hover:bg-muted cursor-pointer' : isClickable ? 'text-muted-foreground hover:bg-muted cursor-pointer' : 'text-muted-foreground/40 cursor-not-allowed')}>
                  <span className={cn('flex size-5 items-center justify-center rounded-full text-[10px] font-bold shrink-0',
                    isCurrent ? 'bg-primary/15 text-foreground' : isDone ? 'bg-primary/20 text-primary' : 'bg-muted/30 text-muted-foreground/40')}>
                    {isDone ? <Check className="size-3" /> : idx + 1}
                  </span>
                  <span className="truncate min-w-0">{label}</span>
                </button>
              );
            })}
          </div>
        </div>
        {/* Center — content + nav */}
        <div className="flex-1 min-w-0 flex flex-col">
          <div className="flex-1 overflow-y-auto px-6 py-5">
            <h2 className="text-sm font-semibold text-foreground mb-4">{STEPS[currentIdx].label}</h2>

            {step === 'product' && (
              <div className="flex flex-col gap-4">
                <Field label="Product" required>
                  <div className="flex flex-col gap-1.5">
                    {PRODUCT_CATALOG.map((prod) => (
                      <label key={prod.id} className={cn('flex items-center gap-3 rounded-lg border px-3 py-2.5 cursor-pointer transition-colors',
                        ws.productCode === prod.id ? 'border-foreground/40 bg-muted/50' : 'border-border hover:border-foreground/20 hover:bg-muted/20')}>
                        <input type="radio" name="product" checked={ws.productCode === prod.id}
                          onChange={() => { upd('productCode')(prod.id); if (!ws.planName) upd('planName')(prod.name); }}
                          className="accent-neutral-800 shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium text-foreground">{prod.name}</p>
                          <p className="text-[10px] text-muted-foreground">{prod.description}</p>
                        </div>
                        <span className="text-[10px] font-mono text-muted-foreground/60 shrink-0">{prod.id}</span>
                      </label>
                    ))}
                  </div>
                </Field>
                <div className="grid grid-cols-2 gap-4">
                  <Field label="Plan number"><Input value={ws.planNumber} onChange={(e) => upd('planNumber')(e.target.value)} placeholder="P001" className="h-8 text-xs" /></Field>
                  <Field label="Plan name" required><Input value={ws.planName} onChange={(e) => upd('planName')(e.target.value)} placeholder="e.g. GTL Staff Plan" className="h-8 text-xs" /></Field>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <Field label="Effective from" required><Input type="date" value={ws.effectiveFrom} onChange={(e) => upd('effectiveFrom')(e.target.value)} className="h-8 text-xs" /></Field>
                  <Field label="Effective to" required><Input type="date" value={ws.effectiveTo} onChange={(e) => upd('effectiveTo')(e.target.value)} className="h-8 text-xs" /></Field>
                </div>
              </div>
            )}

            {step === 'coverage' && (
              <div className="flex flex-col gap-4">
                <Field label="Cover pattern" required>
                  <div className="grid grid-cols-2 gap-2">
                    {([CoverPattern.LEVEL, CoverPattern.REDUCING] as const).map((v) => (
                      <Pill key={v} active={ws.coverPattern === v} onClick={() => upd('coverPattern')(v)}>
                        {v === CoverPattern.LEVEL ? 'Level' : 'Reducing'}
                      </Pill>
                    ))}
                  </div>
                </Field>
                <Field label="Sum assured basis" required>
                  <div className="grid grid-cols-3 gap-2">
                    {([
                      { val: SumAssuredBasis.FLAT,            label: 'Flat SI' },
                      { val: SumAssuredBasis.SALARY_MULTIPLE, label: 'Salary ×' },
                      { val: SumAssuredBasis.GRADE_SLAB,      label: 'Grade slab' },
                    ] as const).map(({ val, label }) => (
                      <Pill key={val} active={ws.sumAssuredBasis === val} onClick={() => upd('sumAssuredBasis')(val)}>{label}</Pill>
                    ))}
                  </div>
                </Field>
                {ws.sumAssuredBasis === SumAssuredBasis.FLAT && (
                  <Field label="Flat sum insured" required>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground select-none">₹</span>
                      <Input type="number" min={0} step={100000} value={ws.flatSi} onChange={(e) => upd('flatSi')(e.target.value)} placeholder="5000000" className="pl-7 h-9 text-sm" />
                    </div>
                  </Field>
                )}
                {ws.sumAssuredBasis === SumAssuredBasis.SALARY_MULTIPLE && (
                  <Field label="Salary multiple" required>
                    <div className="relative">
                      <Input type="number" min={1} step={0.5} value={ws.salaryMultiple} onChange={(e) => upd('salaryMultiple')(e.target.value)} placeholder="3" className="pr-[4.5rem] h-9 text-sm" />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground select-none">× salary</span>
                    </div>
                  </Field>
                )}
                <Field label="Benefits" required>
                  <div className="flex flex-wrap gap-2">
                    {BENEFIT_OPTIONS.map((b) => {
                      const active = ws.benefits.includes(b);
                      return (
                        <button key={b} type="button" disabled={b === 'Death Benefit'}
                          onClick={() => b !== 'Death Benefit' && upd('benefits')(active ? ws.benefits.filter((x) => x !== b) : [...ws.benefits, b])}
                          className={cn('inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-all',
                            active ? 'border-foreground/50 bg-foreground text-background' : 'border-border bg-card text-muted-foreground hover:border-foreground/30 hover:text-foreground',
                            b === 'Death Benefit' && 'cursor-not-allowed')}>
                          {active && <Check className="size-3" />}
                          {b}
                        </button>
                      );
                    })}
                  </div>
                </Field>
              </div>
            )}

            {step === 'eligibility' && (
              <div className="flex flex-col gap-4">
                <Field label="Age band" required>
                  <div className="grid grid-cols-3 gap-3">
                    {[
                      { label: 'Min entry', value: ws.minEntryAge, onChange: (v: string) => upd('minEntryAge')(v) },
                      { label: 'Max entry', value: ws.maxEntryAge, onChange: (v: string) => upd('maxEntryAge')(v) },
                      { label: 'Cessation', value: ws.cessationAge, onChange: (v: string) => upd('cessationAge')(v) },
                    ].map(({ label, value, onChange }) => (
                      <div key={label} className="flex flex-col gap-1">
                        <span className="text-[10px] font-medium text-muted-foreground">{label}</span>
                        <div className="relative">
                          <Input type="number" value={value} onChange={(e) => onChange(e.target.value)} className="pr-8 h-9 text-sm" />
                          <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] text-muted-foreground select-none">yrs</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </Field>
                <Field label="Lives covered" required>
                  <div className="grid grid-cols-3 gap-2">
                    {([
                      { val: LivesCovered.MEMBER_ONLY,   label: 'Member only' },
                      { val: LivesCovered.MEMBER_SPOUSE, label: 'Member + Spouse' },
                      { val: LivesCovered.FAMILY,        label: 'Family' },
                    ] as const).map(({ val, label }) => (
                      <Pill key={val} active={ws.livesCovered === val} onClick={() => upd('livesCovered')(val)}>{label}</Pill>
                    ))}
                  </div>
                </Field>
                <Field label="Employment types" required>
                  <div className="flex flex-wrap gap-2">
                    {EMPLOYMENT_TYPES.map((et) => {
                      const active = ws.employmentTypes.includes(et);
                      return (
                        <button key={et} type="button"
                          onClick={() => upd('employmentTypes')(active ? ws.employmentTypes.filter((x) => x !== et) : [...ws.employmentTypes, et])}
                          className={cn('inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-all',
                            active ? 'border-foreground/50 bg-foreground text-background' : 'border-border bg-card text-muted-foreground hover:border-foreground/30 hover:text-foreground')}>
                          {active && <Check className="size-3" />}
                          {et}
                        </button>
                      );
                    })}
                  </div>
                </Field>
              </div>
            )}

            {step === 'uw' && (
              <div className="flex flex-col gap-4">
                <Field label="UW method" required>
                  <div className="grid grid-cols-2 gap-2">
                    {UW_METHODS.map(({ value, label }) => (
                      <Pill key={value} active={ws.uwMethod === value} onClick={() => upd('uwMethod')(value)}>{label}</Pill>
                    ))}
                  </div>
                </Field>
                <Field label="FCL posture">
                  <div className="flex items-center gap-3 mb-2">
                    <button type="button" onClick={() => upd('fclInherited')(!ws.fclInherited)}
                      className={cn('relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors', ws.fclInherited ? 'bg-primary' : 'bg-muted')}>
                      <span className={cn('inline-block size-4 rounded-full bg-white shadow transition-transform', ws.fclInherited ? 'translate-x-4' : 'translate-x-0')} />
                    </button>
                    <span className="text-xs">{ws.fclInherited ? 'Inherited from version/quote policy' : 'Override — select pattern below'}</span>
                  </div>
                  {!ws.fclInherited && (
                    <div className="flex flex-wrap gap-2">
                      {([FclPattern.OVERALL, FclPattern.BY_GRADE, FclPattern.BY_AGE_BAND, FclPattern.BY_GENDER] as const).map((pat) => (
                        <Pill key={pat} active={ws.fclPattern === pat} onClick={() => upd('fclPattern')(pat)}>{pat.replace(/_/g, ' ')}</Pill>
                      ))}
                    </div>
                  )}
                </Field>
                <Field label="Evidence pack" required>
                  <div className="flex flex-col gap-1.5">
                    {EVIDENCE_PACKS.map((ep) => (
                      <label key={ep.value} className={cn('flex items-center gap-3 rounded-lg border px-3 py-2.5 cursor-pointer transition-colors',
                        ws.evidencePack === ep.value ? 'border-foreground/40 bg-muted/50' : 'border-border hover:border-foreground/20 hover:bg-muted/20')}>
                        <input type="radio" name="evidencePack" checked={ws.evidencePack === ep.value} onChange={() => upd('evidencePack')(ep.value)} className="accent-neutral-800 shrink-0" />
                        <div>
                          <p className="text-xs font-medium text-foreground">{ep.label}</p>
                          <p className="text-[10px] text-muted-foreground">{ep.sub}</p>
                        </div>
                      </label>
                    ))}
                  </div>
                </Field>
              </div>
            )}

            {step === 'ratecard' && (
              <div className="flex flex-col gap-3">
                {RATE_CARDS.length === 0 && (
                  <div className="rounded-xl border border-dashed border-border bg-card px-4 py-6 text-center text-xs text-muted-foreground">No rate cards available.</div>
                )}
                {RATE_CARDS.map((card) => (
                  <label key={card.ref} className={cn('flex items-start gap-3 rounded-xl border px-4 py-3.5 cursor-pointer transition-colors',
                    ws.rateCardRef === card.ref ? 'border-foreground/40 bg-muted/50' : 'border-border hover:border-foreground/20 hover:bg-muted/20')}>
                    <input type="radio" name="rateCard" checked={ws.rateCardRef === card.ref} onChange={() => upd('rateCardRef')(card.ref)} className="accent-neutral-800 shrink-0 mt-0.5" />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold">{card.name}</p>
                      <p className="text-[11px] text-muted-foreground mt-0.5">{card.insurer}</p>
                      <div className="flex items-center gap-3 mt-1.5 text-[11px] text-muted-foreground">
                        <span className="font-mono">{card.ref}</span>
                        <span>{card.effectiveFrom} → {card.effectiveTo}</span>
                        <span className="text-foreground font-medium">{card.blendedRatePermille}‰</span>
                      </div>
                    </div>
                    <span className="text-[10px] bg-emerald-600 text-white rounded-full px-2 py-0.5 font-medium shrink-0">APPROVED</span>
                  </label>
                ))}
              </div>
            )}

            {step === 'deviations' && <DeviationStep devs={devs} setDevs={setDevs} />}
          </div>
          <div className="shrink-0 flex items-center justify-between border-t border-border/40 px-5 py-3">
            <Button variant="outline" size="sm" disabled={currentIdx === 0} onClick={() => goToStep(STEPS[currentIdx - 1].key)} className="gap-1">
              <ChevronLeft className="size-3.5" /> Previous
            </Button>
            <Button size="sm" disabled={isLastStep || !canProceed(step)} onClick={() => !isLastStep && goToStep(STEPS[currentIdx + 1].key)} className="gap-1">
              Next <ChevronRight className="size-3.5" />
            </Button>
          </div>
        </div>
        {/* Right — simple summary */}
        <div className="w-72 shrink-0 border-l border-border/40 bg-muted/5 overflow-y-auto px-3 py-4">
          <div className="rounded-xl border bg-card overflow-hidden">
            <div className="px-4 py-3 border-b border-border/40 bg-muted/10">
              <h2 className={cn('text-sm font-bold leading-snug break-words', ws.planName ? 'text-foreground' : 'text-muted-foreground/40 italic')}>
                {ws.planName || 'Untitled plan'}
              </h2>
              <div className="flex flex-wrap items-center gap-1.5 mt-1">
                {ws.planNumber && <span className="inline-flex items-center rounded border bg-background px-1.5 py-0.5 text-[10px] font-mono text-muted-foreground/80">{ws.planNumber}</span>}
                {ws.productCode && <span className="inline-flex items-center rounded border bg-background px-1.5 py-0.5 text-[10px] font-mono text-muted-foreground/80">{ws.productCode}</span>}
              </div>
            </div>
            <div className="px-4 py-3 flex flex-col gap-2.5">
              {([
                ['Effective from', ws.effectiveFrom || '—'],
                ['Effective to',   ws.effectiveTo   || '—'],
                ['Cover pattern',  ws.coverPattern?.replace(/_/g, ' ') || '—'],
                ['Sum assured',    ws.sumAssuredBasis === SumAssuredBasis.FLAT ? '₹' + Number(ws.flatSi || 0).toLocaleString('en-IN') : ws.sumAssuredBasis === SumAssuredBasis.SALARY_MULTIPLE ? ws.salaryMultiple + '× salary' : ws.sumAssuredBasis === SumAssuredBasis.GRADE_SLAB ? 'Grade slab' : '—'],
                ['Lives covered',  (ws.livesCovered as string)?.replace(/_/g, ' ') || '—'],
                ['UW method',      ws.uwMethod || '—'],
                ['Rate card',      selectedCard?.name || '—'],
              ] as const).map(([k, v]) => (
                <div key={k} className="flex items-baseline justify-between gap-2">
                  <p className="text-[10px] text-muted-foreground shrink-0">{k}</p>
                  <p className="text-xs font-medium text-foreground text-right truncate">{v}</p>
                </div>
              ))}
              {ws.benefits.length > 0 && (
                <div>
                  <p className="text-[10px] text-muted-foreground mb-1">Benefits</p>
                  <div className="flex flex-wrap gap-1">
                    {ws.benefits.slice(0, 4).map((b) => <span key={b} className="text-[9px] rounded-full bg-muted border px-2 py-0.5 text-muted-foreground">{b}</span>)}
                    {ws.benefits.length > 4 && <span className="text-[9px] text-muted-foreground/60">+{ws.benefits.length - 4} more</span>}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────────────

function PlanWizardRouter({ rfqId }: { rfqId: string }) {
  const { version } = usePlanWizardVersion();
  return version === 1 ? <PlanWizardV1Inner rfqId={rfqId} /> : <PlanWizardInner rfqId={rfqId} />;
}

export default function PlanWizardPage() {
  const params = useParams<{ rfqId: string }>();
  const rfqId = params.rfqId;
  return (
    <RfqBundleProvider rfqId={rfqId}>
      <Suspense>
        <PlanWizardRouter rfqId={rfqId} />
      </Suspense>
    </RfqBundleProvider>
  );
}
