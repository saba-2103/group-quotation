'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Banknote, Check, ChevronLeft, ChevronRight, Info, LayoutList, TrendingUp, X } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

import { cn } from '@/lib/utils';

import { EvidencePack, FclPattern, SumAssuredBasis, UwMethod } from '@/lib/types';
import type { PlanTemplate } from '@/lib/types';
import {
  GTL_STANDARD_DEFAULTS,
  EVIDENCE_PACK_LABELS,
  slugify,
  upsertTemplate,
} from '@/lib/templateRegistry';
import { useRole } from '@/hooks/useRole';
import { canAuthorTemplate } from '@/lib/permissions';
import { usePlanTemplateVersion } from '@/stores/planTemplateVersionStore';
import { PageHeader } from '@/components/layout/PageHeader';

// ─── Field wrapper ─────────────────────────────────────────────────────────────

function Field({
  label,
  required,
  note,
  children,
}: {
  label: string;
  required?: boolean;
  note?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label className="text-xs font-medium">
        {label}
        {required && <span className="text-destructive ml-0.5">*</span>}
      </Label>
      {children}
      {note && <p className="text-[11px] text-muted-foreground leading-snug">{note}</p>}
    </div>
  );
}

// ─── Summary panel ─────────────────────────────────────────────────────────────

const SA_BASIS_META: Record<SumAssuredBasis, { icon: React.ElementType; label: string; sub: string }> = {
  [SumAssuredBasis.FLAT]:            { icon: Banknote,   label: 'Flat sum insured',  sub: 'Fixed amount for all members' },
  [SumAssuredBasis.SALARY_MULTIPLE]: { icon: TrendingUp, label: 'Salary multiple',   sub: 'Scales with annual salary' },
  [SumAssuredBasis.GRADE_SLAB]:      { icon: LayoutList, label: 'Grade slab',        sub: 'Census-seeded per grade' },
};

const EVIDENCE_SHORT: Record<EvidencePack, string> = {
  [EvidencePack.WITHIN_FCL_MINIMAL]: 'Within-FCL Minimal',
  [EvidencePack.EOI_STANDARD]:       'EOI Standard',
  [EvidencePack.EOI_FULL]:           'EOI Full',
  [EvidencePack.EOI_JUMBO]:          'EOI Jumbo',
};

function SectionDivider({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-2 pt-1">
      <span className="text-[9px] font-semibold uppercase tracking-widest text-muted-foreground/60 shrink-0">
        {label}
      </span>
      <div className="flex-1 h-px bg-border/40" />
    </div>
  );
}

// ─── Key-value row helper ───────────────────────────────────────────────────

function KVRow({ label, value, mono }: { label: string; value?: string; mono?: boolean }) {
  return (
    <div className="flex gap-3 py-1.5 border-b border-border/30 last:border-0">
      <span className="text-[10px] text-muted-foreground w-24 shrink-0 leading-[1.6]">{label}</span>
      <span className={cn('text-[11px] text-foreground flex-1 leading-[1.6]', mono && 'font-mono')}>{value || '—'}</span>
    </div>
  );
}

// ─── Summary V1 — flat key-value ───────────────────────────────────────────

function LiveSummaryV1({
  name, description, tags, productCode, sumAssuredBasis,
  flatSi, salaryMultiple, fclThreshold, evidencePackRef, visitedSteps,
}: {
  name: string; description: string; tags: string[]; productCode: string;
  sumAssuredBasis: SumAssuredBasis; flatSi: number; salaryMultiple: number;
  fclThreshold: number; evidencePackRef: EvidencePack; visitedSteps: number[];
}) {
  const censusAware = sumAssuredBasis === SumAssuredBasis.GRADE_SLAB;
  const basisMeta = SA_BASIS_META[sumAssuredBasis];
  const basisValue =
    sumAssuredBasis === SumAssuredBasis.FLAT
      ? `₹${flatSi.toLocaleString('en-IN')}`
      : sumAssuredBasis === SumAssuredBasis.SALARY_MULTIPLE
      ? `${salaryMultiple}× salary`
      : 'Census-seeded';
  const step1Done = visitedSteps.includes(1);
  const step2Done = visitedSteps.includes(2);

  return (
    <div className="text-xs">
      <p className="text-[9px] font-semibold uppercase tracking-widest text-muted-foreground/60 mb-3">
        Template details
      </p>
      <div>
        <KVRow label="Name" value={name} />
        {description && <KVRow label="Description" value={description} />}
        {productCode && <KVRow label="Product code" value={productCode} mono />}
        {tags.length > 0 && <KVRow label="Tags" value={tags.join(', ')} />}
      </div>
      <p className="text-[9px] font-semibold uppercase tracking-widest text-muted-foreground/50 mt-4 mb-1.5">Plan shape</p>
      <div>
        <KVRow label="SA basis" value={step1Done ? basisMeta.label : undefined} />
        <KVRow label="Default cover" value={step1Done ? basisValue : undefined} />
      </div>
      <p className="text-[9px] font-semibold uppercase tracking-widest text-muted-foreground/50 mt-4 mb-1.5">UW seeds</p>
      <div>
        <KVRow label="FCL threshold" value={step2Done ? `₹${fclThreshold.toLocaleString('en-IN')}` : undefined} />
        <KVRow label="FCL mode" value={step2Done ? (censusAware ? 'BY_GRADE' : 'BY_PLAN') : undefined} />
        <KVRow label="Evidence pack" value={step2Done ? EVIDENCE_SHORT[evidencePackRef] : undefined} />
        <KVRow label="UW method" value={step2Done ? 'STP' : undefined} />
      </div>
      <p className="text-[9px] font-semibold uppercase tracking-widest text-muted-foreground/50 mt-4 mb-1.5">Eligibility</p>
      <div>
        <KVRow label="Entry age" value={step2Done ? '18–65' : undefined} />
        <KVRow label="Cessation age" value={step2Done ? '70' : undefined} />
        <KVRow label="Employment" value={step2Done ? 'Full-time' : undefined} />
        <KVRow label="Lives covered" value={step2Done ? 'Member only' : undefined} />
        <KVRow label="Min group" value={step2Done ? '25 lives' : undefined} />
        <KVRow label="UW method" value={step2Done ? 'STP' : undefined} />
      </div>
    </div>
  );
}

// ─── Summary V2 — pushed design ───────────────────────────────────────────

function LiveSummaryV2({
  name, description, tags, productCode, sumAssuredBasis,
  flatSi, salaryMultiple, fclThreshold, evidencePackRef, visitedSteps,
}: {
  name: string; description: string; tags: string[]; productCode: string;
  sumAssuredBasis: SumAssuredBasis; flatSi: number; salaryMultiple: number;
  fclThreshold: number; evidencePackRef: EvidencePack; visitedSteps: number[];
}) {
  const censusAware = sumAssuredBasis === SumAssuredBasis.GRADE_SLAB;
  const basisMeta = SA_BASIS_META[sumAssuredBasis];
  const BasisIcon = basisMeta.icon;
  const basisValue =
    sumAssuredBasis === SumAssuredBasis.FLAT
      ? `₹${flatSi.toLocaleString('en-IN')}`
      : sumAssuredBasis === SumAssuredBasis.SALARY_MULTIPLE
      ? `${salaryMultiple}×`
      : null;
  const step1Done = visitedSteps.includes(1);
  const step2Done = visitedSteps.includes(2);

  return (
    <div className="flex flex-col gap-4">
      <div>
        <p className="text-[9px] font-semibold uppercase tracking-widest text-muted-foreground/60 mb-2">Live preview</p>
        <div className="space-y-1.5">
          {name ? (
            <h2 className="text-base font-bold leading-tight text-foreground break-words">{name}</h2>
          ) : (
            <h2 className="text-base font-bold leading-tight text-muted-foreground/30 italic">Template name</h2>
          )}
          {description && (
            <p className="text-xs text-muted-foreground leading-snug">{description}</p>
          )}
          <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
            {productCode && (
              <span className="inline-flex items-center rounded-md border bg-muted/50 px-1.5 py-0.5 text-[10px] font-mono text-muted-foreground">
                {productCode}
              </span>
            )}
            {tags.map((t) => (
              <Badge key={t} variant="secondary" className="text-[10px] px-1.5 py-0 font-normal">{t}</Badge>
            ))}
          </div>
        </div>
      </div>

      <SectionDivider label="Plan shape" />

      {step1Done ? (
        <div className="rounded-xl border bg-muted/20 p-3 flex items-start gap-3">
          <div className="mt-0.5 rounded-lg bg-background border p-2 shrink-0">
            <BasisIcon className="size-4 text-foreground" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold text-foreground leading-tight">{basisMeta.label}</p>
            <p className="text-[10px] text-muted-foreground mt-0.5">{basisMeta.sub}</p>
            {basisValue && (
              <p className="text-lg font-bold text-foreground mt-1.5 leading-none tabular-nums">
                {basisValue}
                {sumAssuredBasis === SumAssuredBasis.SALARY_MULTIPLE && (
                  <span className="text-xs font-normal text-muted-foreground ml-1">× salary</span>
                )}
              </p>
            )}
            {censusAware && (
              <p className="text-[10px] text-muted-foreground/70 mt-1.5 italic">Slab list seeded at wizard use</p>
            )}
          </div>
        </div>
      ) : (
        <p className="text-xs text-muted-foreground/40">—</p>
      )}

      <SectionDivider label="UW seeds" />

      {step2Done ? (
        <div className="space-y-2.5">
          <div>
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider">FCL threshold</p>
            <p className="text-sm font-semibold tabular-nums">
              ₹{fclThreshold.toLocaleString('en-IN')}
              <span className="text-[10px] font-normal text-muted-foreground ml-1.5">
                · {censusAware ? 'BY_GRADE' : 'BY_PLAN'}
              </span>
            </p>
          </div>
          <div>
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Evidence pack</p>
            <p className="text-sm font-semibold">{EVIDENCE_SHORT[evidencePackRef]}</p>
          </div>
          <div>
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider">UW method</p>
            <p className="text-sm font-semibold">STP</p>
          </div>
        </div>
      ) : (
        <p className="text-xs text-muted-foreground/40">—</p>
      )}

      <SectionDivider label="Eligibility — stamped" />

      {step2Done ? (
        <div className="rounded-xl border border-dashed border-border/60 bg-muted/10 px-3 py-2.5">
          <p className="text-[10px] font-semibold text-muted-foreground/70 uppercase tracking-wider mb-1.5">
            GTL standard defaults
          </p>
          <div className="grid grid-cols-2 gap-x-2 gap-y-1">
            {([
              ['Entry age', '18–65'],
              ['Cessation', '70'],
              ['Employment', 'Full-time'],
              ['Lives', 'Member only'],
              ['Min group', '25 lives'],
              ['UW method', 'STP'],
            ] as const).map(([k, v]) => (
              <div key={k}>
                <p className="text-[9px] text-muted-foreground/60 uppercase tracking-wider">{k}</p>
                <p className="text-[11px] font-medium text-muted-foreground">{v}</p>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <p className="text-xs text-muted-foreground/40">—</p>
      )}
    </div>
  );
}

// ─── Summary V3 — interactive card (current) ────────────────────────────────

function LiveSummaryV3({
  name,
  description,
  tags,
  productCode,
  sumAssuredBasis,
  flatSi,
  salaryMultiple,
  fclThreshold,
  evidencePackRef,
  allComplete,
  stepsDone,
  visitedSteps,
}: {
  name: string;
  description: string;
  tags: string[];
  productCode: string;
  sumAssuredBasis: SumAssuredBasis;
  flatSi: number;
  salaryMultiple: number;
  fclThreshold: number;
  evidencePackRef: EvidencePack;
  allComplete: boolean;
  stepsDone: number;
  visitedSteps: number[];
}) {
  const censusAware = sumAssuredBasis === SumAssuredBasis.GRADE_SLAB;
  const basisMeta = SA_BASIS_META[sumAssuredBasis];
  const BasisIcon = basisMeta.icon;
  const step1Done = visitedSteps.includes(1);
  const step2Done = visitedSteps.includes(2);

  const basisValue =
    sumAssuredBasis === SumAssuredBasis.FLAT
      ? `₹${flatSi.toLocaleString('en-IN')}`
      : sumAssuredBasis === SumAssuredBasis.SALARY_MULTIPLE
      ? `${salaryMultiple}×`
      : null;

  return (
    <div className={cn("rounded-2xl border bg-card shadow-md overflow-hidden transition-colors duration-500", allComplete ? "border-emerald-600/30" : stepsDone >= 1 ? "border-amber-400/40" : "border-border/70")}>

      {/* ── Identity ─────────────────────────────────── */}
      <div className={cn("px-5 pt-5 pb-4 bg-gradient-to-b transition-colors duration-500", allComplete ? "from-emerald-50/70 to-transparent" : stepsDone >= 1 ? "from-amber-50/50 to-transparent" : name.trim() ? "from-primary/[0.06] to-transparent" : "from-muted/40 to-transparent")}>

        {name ? (
          <h2 className="text-lg font-bold leading-snug text-foreground break-words">
            {name}
          </h2>
        ) : (
          <h2 className="text-lg font-bold leading-snug text-muted-foreground/40 italic select-none">
            Untitled template
          </h2>
        )}

        {description && (
          <p className="text-xs text-muted-foreground mt-1.5 leading-relaxed">
            {description}
          </p>
        )}

        <div className="flex flex-wrap items-center gap-1.5 mt-3">
          {productCode && (
            <span className="inline-flex items-center rounded border bg-background px-1.5 py-0.5 text-[10px] font-mono text-muted-foreground/80">
              {productCode}
            </span>
          )}
          {tags.map((t) => (
            <Badge key={t} variant="secondary" className="text-[10px] px-2 py-0 font-normal rounded-full">
              {t}
            </Badge>
          ))}
          {!productCode && tags.length === 0 && (
            <span className="text-[10px] text-muted-foreground/50 italic">No tags yet</span>
          )}
        </div>
      </div>

      <div className="h-px bg-border/40" />

      {/* ── Plan shape ─────────────────────────────── */}
      <div className="px-5 py-4">
        <p className="text-[9px] font-semibold uppercase tracking-[0.15em] text-muted-foreground/70 mb-3">
          Plan shape
        </p>

        {step1Done ? (
          <>
            <div className="flex items-center gap-3">
              <div className="rounded-xl border bg-muted/30 p-2.5 shrink-0">
                <BasisIcon className="size-5 text-foreground/70" />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-semibold text-foreground">{basisMeta.label}</p>
                <p className="text-[10px] text-muted-foreground leading-snug">{basisMeta.sub}</p>
              </div>
            </div>

            {basisValue && (
              <div className="mt-4 rounded-xl bg-muted/30 px-4 py-3">
                <p className="text-[9px] uppercase tracking-widest text-muted-foreground/70 mb-0.5">
                  {sumAssuredBasis === SumAssuredBasis.FLAT ? 'Default cover' : 'Salary multiple'}
                </p>
                <p className="text-3xl font-bold tabular-nums tracking-tight text-foreground leading-none">
                  {basisValue}
                  {sumAssuredBasis === SumAssuredBasis.SALARY_MULTIPLE && (
                    <span className="text-base font-normal text-muted-foreground ml-1.5">salary</span>
                  )}
                </p>
              </div>
            )}

            {censusAware && (
              <div className="mt-4 rounded-xl bg-muted/30 px-4 py-3">
                <p className="text-[9px] uppercase tracking-widest text-muted-foreground/70 mb-0.5">Slab list</p>
                <p className="text-xs text-muted-foreground italic">Seeded from census at wizard use</p>
              </div>
            )}
          </>
        ) : (
          <p className="text-xs text-muted-foreground/40">—</p>
        )}
      </div>

      <div className="h-px bg-border/40" />

      {/* ── UW seeds ────────────────────────────────── */}
      <div className="px-5 py-4">
        <p className="text-[9px] font-semibold uppercase tracking-[0.15em] text-muted-foreground/70 mb-3">
          UW seeds
        </p>
        {step2Done ? (
          <div className="space-y-3">
            <div className="flex items-baseline justify-between gap-2">
              <p className="text-[10px] text-muted-foreground shrink-0">FCL threshold</p>
              <p className="text-xs font-semibold tabular-nums text-right">
                ₹{fclThreshold.toLocaleString('en-IN')}
              </p>
            </div>
            <div className="flex items-baseline justify-between gap-2">
              <p className="text-[10px] text-muted-foreground shrink-0">FCL mode</p>
              <p className="text-xs font-semibold">{censusAware ? 'BY_GRADE' : 'BY_PLAN'}</p>
            </div>
            <div className="flex items-baseline justify-between gap-2">
              <p className="text-[10px] text-muted-foreground shrink-0">Evidence pack</p>
              <p className="text-xs font-semibold text-right">{EVIDENCE_SHORT[evidencePackRef]}</p>
            </div>
            <div className="flex items-baseline justify-between gap-2">
              <p className="text-[10px] text-muted-foreground shrink-0">UW method</p>
              <p className="text-xs font-semibold">STP</p>
            </div>
          </div>
        ) : (
          <p className="text-xs text-muted-foreground/40">—</p>
        )}
      </div>

      <div className="h-px bg-border/40" />

      {/* ── Eligibility stamp ─────────────────────────── */}
      <div className="px-5 py-4">
        <p className="text-[9px] font-semibold uppercase tracking-[0.15em] text-muted-foreground/70 mb-3">
          Eligibility — auto-stamped
        </p>
        {step2Done ? (
          <div className="rounded-xl border border-dashed border-border/60 bg-muted/25 p-3">
            <div className="grid grid-cols-2 gap-x-3 gap-y-2.5">
              {([
                ['Entry age',  '18–65'],
                ['Cessation',  '70'],
                ['Employment', 'Full-time'],
                ['Lives',      'Member only'],
                ['Min group',  '25 lives'],
                ['UW method',  'STP'],
              ] as const).map(([k, v]) => (
                <div key={k}>
                  <p className="text-[9px] uppercase tracking-wider text-muted-foreground/60">{k}</p>
                  <p className="text-[11px] font-medium text-muted-foreground">{v}</p>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <p className="text-xs text-muted-foreground/40">—</p>
        )}
      </div>

    </div>
  );
}

// ─── Stepper ─────────────────────────────────────────────────────────────────────

const STEPS = ['Identity', 'Plan shape', 'UW configuration'];

function isStepComplete(step: number, name: string): boolean {
  if (step === 0) return name.trim().length > 0;
  return true; // steps 1 & 2 always have defaults
}

function Stepper({
  current,
  visitedSteps,
  name,
  onStep,
}: {
  current: number;
  visitedSteps: number[];
  name: string;
  onStep: (idx: number) => void;
}) {
  const doneCount = STEPS.filter(
    (_, idx) => isStepComplete(idx, name) && idx !== current && visitedSteps.includes(idx),
  ).length;

  return (
    <div className="flex flex-col gap-1">
      <div className="text-[10px] text-muted-foreground mb-2 font-medium">
        {doneCount} / {STEPS.length} steps done
      </div>
      {STEPS.map((label, idx) => {
        const isCurrent = idx === current;
        const isDone = isStepComplete(idx, name) && !isCurrent && visitedSteps.includes(idx);
        const isClickable = isDone || isCurrent || visitedSteps.includes(idx);
        return (
          <button
            key={idx}
            type="button"
            disabled={!isClickable}
            onClick={() => isClickable && onStep(idx)}
            className={cn(
              'flex items-center gap-2.5 px-3 py-2 rounded-lg text-left text-xs transition-colors w-full min-w-0',
              isCurrent
                ? 'bg-primary/10 text-foreground font-semibold'
                : isDone
                ? 'text-foreground hover:bg-muted cursor-pointer'
                : isClickable
                ? 'text-muted-foreground hover:bg-muted cursor-pointer'
                : 'text-muted-foreground/40 cursor-not-allowed',
            )}
          >
            <span
              className={cn(
                'flex size-5 items-center justify-center rounded-full text-[10px] font-bold shrink-0',
                isCurrent
                  ? 'bg-primary/15 text-foreground'
                  : isDone
                  ? 'bg-primary/20 text-primary'
                  : 'bg-muted/30 text-muted-foreground/40',
              )}
            >
              {isDone ? <Check className="size-3" /> : idx + 1}
            </span>
            <span className="truncate min-w-0">{label}</span>
          </button>
        );
      })}
    </div>
  );
}

// ─── Page ──────────────────────────────────────────────────────────────────────

export default function NewPlanTemplatePage() {
  const router = useRouter();
  const { role, salesLevel } = useRole();
  const { version } = usePlanTemplateVersion();

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');
  const [productCode, setProductCode] = useState('GTL-STD-001');
  const [sumAssuredBasis, setSumAssuredBasis] = useState<SumAssuredBasis>(SumAssuredBasis.FLAT);
  const [flatSi, setFlatSi] = useState(1_000_000);
  const [salaryMultiple, setSalaryMultiple] = useState(3);
  const [fclThreshold, setFclThreshold] = useState(5_000_000);
  const [evidencePackRef, setEvidencePackRef] = useState<EvidencePack>(
    EvidencePack.WITHIN_FCL_MINIMAL,
  );

  const [nameError, setNameError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [step, setStep] = useState(0);
  const [visitedSteps, setVisitedSteps] = useState([0]);

  // ─── Guard ───────────────────────────────────────────────────────────────────

  if (!canAuthorTemplate(role, salesLevel)) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-3 text-center p-12">
        <p className="text-sm font-medium">Access restricted</p>
        <p className="text-xs text-muted-foreground">
          Template authoring requires Sales Supervisor (L4) or Admin access.
        </p>
        <Button variant="outline" size="sm" onClick={() => router.push('/rfq2/plan-templates')}>
          Back
        </Button>
      </div>
    );
  }

  // ─── Tag helpers ─────────────────────────────────────────────────────────────

  function commitTagInput() {
    const parts = tagInput
      .split(',')
      .map((s) => s.trim().toLowerCase())
      .filter(Boolean);
    setTags((prev) => Array.from(new Set([...prev, ...parts])));
    setTagInput('');
  }

  function removeTag(tag: string) {
    setTags((prev) => prev.filter((t) => t !== tag));
  }

  // ─── Submit ───────────────────────────────────────────────────────────────────

  function handleCreate() {
    setNameError(null);
    setSaveError(null);

    if (!name.trim()) {
      setNameError('Template name is required.');
      return;
    }

    const template: PlanTemplate = {
      id:              slugify(name),
      name:            name.trim(),
      description:     description.trim(),
      tags,
      isCustom:        true,
      censusAware:     sumAssuredBasis === SumAssuredBasis.GRADE_SLAB,
      sumAssuredBasis,
      productCode:     productCode.trim() || 'GTL-STD-001',
      ...(sumAssuredBasis === SumAssuredBasis.FLAT ? { defaultSumInsured: flatSi } : {}),
      ...(sumAssuredBasis === SumAssuredBasis.SALARY_MULTIPLE ? { salaryMultiple } : {}),
      uw: {
        fclThreshold,
        fclMode:
          sumAssuredBasis === SumAssuredBasis.GRADE_SLAB
            ? FclPattern.BY_GRADE
            : FclPattern.BY_GRADE,
        evidencePackRef,
        uwMethod: UwMethod.STP,
      },
      eligibility: {
        minEntryAge:            GTL_STANDARD_DEFAULTS.minEntryAge,
        maxEntryAge:            GTL_STANDARD_DEFAULTS.maxEntryAge,
        cessationAge:           GTL_STANDARD_DEFAULTS.cessationAge,
        allowedEmploymentTypes: [...GTL_STANDARD_DEFAULTS.allowedEmploymentTypes],
        livesCovered:           GTL_STANDARD_DEFAULTS.livesCovered,
        minGroupSize:           GTL_STANDARD_DEFAULTS.minGroupSize,
      },
    };

    try {
      upsertTemplate(template);
    } catch {
      setSaveError(
        'Could not save — storage unavailable or full. Try again or clear browser storage.',
      );
      return;
    }

    router.push('/rfq2/plan-templates');
  }

  const allStepsComplete = name.trim().length > 0 && visitedSteps.length === STEPS.length;
  const stepsDoneCount = STEPS.filter((_, idx) => isStepComplete(idx, name) && visitedSteps.includes(idx)).length;
  const isLastStep = step === STEPS.length - 1;

  function goNext() {
    if (step === 0 && !name.trim()) { setNameError('Template name is required.'); return; }
    const next = step + 1;
    setStep(next);
    setVisitedSteps((v) => v.includes(next) ? v : [...v, next]);
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">

      {/* Header bar */}
      <div className="shrink-0 border-b border-border/40">
        <PageHeader
          title="New plan template"
          subtitle="Define a reusable plan shape for the RFQ wizard"
          actions={
            <>
              <Button variant="ghost" size="sm" onClick={() => router.push('/rfq2/plan-templates')}>
                Cancel
              </Button>
              <Button size="sm" onClick={handleCreate} disabled={!allStepsComplete} className="gap-1.5">
                <Check className="size-3.5" />
                Create template
              </Button>
            </>
          }
        />
      </div>

      {/* 3-column body */}
      <div className="flex flex-1 min-h-0 overflow-hidden">

        {/* Left — stepper */}
        <div className="w-52 shrink-0 border-r border-border/40 px-3 py-4 overflow-y-auto overflow-x-hidden">
          <Stepper
            current={step}
            visitedSteps={visitedSteps}
            name={name}
            onStep={(idx) => setStep(idx)}
          />
        </div>

        {/* Center — form + footer */}
        <div className="flex-1 min-w-0 flex flex-col">
          <div className="flex-1 min-h-0 overflow-y-auto px-6 py-5">
            <div className="flex flex-col gap-5">

              {/* Save error */}
              {saveError && (
                <div className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
                  {saveError}
                </div>
              )}

              {/* ── STEP 0: Identity ──────────────────────────────── */}
              {step === 0 && (
                <div className="space-y-4">
                  <div>
                    <h2 className="text-sm font-semibold">Identity</h2>
                    <p className="text-xs text-muted-foreground mt-0.5">Name and categorise the template.</p>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <Field label="Template name" required>
                      <Input
                        placeholder="e.g. Standard GTL Staff"
                        value={name}
                        onChange={(e) => { setName(e.target.value); if (nameError) setNameError(null); }}
                        className={cn('text-sm', nameError && 'border-destructive')}
                      />
                      {nameError
                        ? <p className="text-xs text-destructive">{nameError}</p>
                        : <p className="text-[10px] text-muted-foreground">Saved as <code className="font-mono">custom-&#123;slug&#125;</code></p>
                      }
                    </Field>

                    <Field label="Product code" note="Unknown codes show a warning in the plan wizard.">
                      <Input
                        placeholder="GTL-STD-001"
                        value={productCode}
                        onChange={(e) => setProductCode(e.target.value)}
                        className="text-sm"
                      />
                    </Field>
                  </div>

                  <Field label="Description">
                    <Input
                      placeholder="One-line summary shown in the template picker"
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      className="text-sm"
                    />
                  </Field>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium">Tags</Label>
                    <div className="flex flex-wrap gap-1.5 rounded-md border bg-background px-3 py-2 min-h-[2.5rem] focus-within:ring-1 focus-within:ring-ring">
                      {tags.map((tag) => (
                        <Badge key={tag} variant="secondary" className="flex items-center gap-1 pr-1 text-xs">
                          {tag}
                          <button type="button" onClick={() => removeTag(tag)}
                            className="ml-0.5 rounded-full hover:text-destructive" aria-label={`Remove ${tag}`}>
                            <X className="size-3" />
                          </button>
                        </Badge>
                      ))}
                      <input
                        value={tagInput}
                        onChange={(e) => setTagInput(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); commitTagInput(); }
                        }}
                        onBlur={commitTagInput}
                        placeholder={tags.length === 0 ? 'Type a tag, then Enter or comma…' : ''}
                        className="flex-1 min-w-[8rem] bg-transparent text-sm outline-none placeholder:text-muted-foreground"
                      />
                    </div>
                    <div className="flex flex-wrap gap-1 pt-0.5">
                      {['flat', 'salary-multiple', 'grade-slab', 'standard', 'sme', 'executive', 'family', 'voluntary']
                        .filter((t) => !tags.includes(t))
                        .map((t) => (
                          <button key={t} type="button" onClick={() => setTags((p) => [...p, t])}
                            className="inline-flex items-center gap-0.5 text-[10px] border rounded-full px-2 py-0.5 text-muted-foreground hover:text-foreground hover:border-foreground/30 transition-colors">
                            + {t}
                          </button>
                        ))}
                    </div>
                  </div>
                </div>
              )}

              {/* ── STEP 1: Plan shape ───────────────────────────── */}
              {step === 1 && (
                <div className="space-y-4">
                  <div>
                    <h2 className="text-sm font-semibold">Plan shape</h2>
                    <p className="text-xs text-muted-foreground mt-0.5">Choose the sum-assured structure for this template.</p>
                  </div>

                  {version === 1 ? (
                    <>
                      <Field label="Sum assured basis">
                        <select
                          value={sumAssuredBasis}
                          onChange={(e) => setSumAssuredBasis(e.target.value as SumAssuredBasis)}
                          className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                        >
                          <option value={SumAssuredBasis.FLAT}>Flat sum insured</option>
                          <option value={SumAssuredBasis.SALARY_MULTIPLE}>Salary multiple</option>
                          <option value={SumAssuredBasis.GRADE_SLAB}>Grade slab</option>
                        </select>
                      </Field>
                      {sumAssuredBasis === SumAssuredBasis.FLAT && (
                        <Field label="Default flat sum insured">
                          <div className="relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground select-none">₹</span>
                            <Input type="number" min={0} step={100_000} placeholder="1000000" value={flatSi}
                              onChange={(e) => setFlatSi(Number(e.target.value))} className="pl-7 text-sm" />
                          </div>
                          <p className="text-[10px] text-muted-foreground">= ₹{flatSi.toLocaleString('en-IN')}</p>
                        </Field>
                      )}
                      {sumAssuredBasis === SumAssuredBasis.SALARY_MULTIPLE && (
                        <Field label="Default salary multiple">
                          <div className="relative">
                            <Input type="number" min={1} step={0.5} placeholder="3" value={salaryMultiple}
                              onChange={(e) => setSalaryMultiple(Number(e.target.value))} className="pr-[4.5rem] text-sm" />
                            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground select-none">× salary</span>
                          </div>
                          <p className="text-[10px] text-muted-foreground">Member cover = {salaryMultiple}× annual salary</p>
                        </Field>
                      )}
                      {sumAssuredBasis === SumAssuredBasis.GRADE_SLAB && (
                        <Field label="Grade slab" note="Ships with an empty slab list — seeded from the RFQ’s census grades at wizard use.">
                          <div className="h-8 rounded-md border border-border/40 bg-muted/30 px-3 flex items-center">
                            <span className="text-xs text-muted-foreground">FCL mode: BY_GRADE · census-seeded</span>
                          </div>
                        </Field>
                      )}
                    </>
                  ) : (
                    <>
                      <div className="grid grid-cols-3 gap-3">
                        {([
                          { value: SumAssuredBasis.FLAT,            icon: Banknote,    label: 'Flat sum insured',  desc: 'Same cover for every member regardless of grade' },
                          { value: SumAssuredBasis.SALARY_MULTIPLE, icon: TrendingUp,  label: 'Salary multiple',   desc: 'Cover = N× annual salary, scales with pay' },
                          { value: SumAssuredBasis.GRADE_SLAB,      icon: LayoutList,  label: 'Grade slab',        desc: 'Per-grade SI table seeded from census at use' },
                        ] as const).map(({ value, icon: Icon, label, desc }) => {
                          const selected = sumAssuredBasis === value;
                          return (
                            <button key={value} type="button" onClick={() => setSumAssuredBasis(value)}
                              className={cn(
                                'flex flex-col gap-2.5 rounded-xl border-2 p-4 text-left transition-all',
                                selected ? 'border-foreground/50 bg-muted/60 shadow-sm' : 'border-border bg-card hover:border-foreground/20 hover:bg-muted/40',
                              )}
                            >
                              <Icon className={cn('size-5', selected ? 'text-foreground' : 'text-muted-foreground')} />
                              <div>
                                <p className="text-xs font-semibold text-foreground">{label}</p>
                                <p className="text-[10px] text-muted-foreground mt-0.5 leading-snug">{desc}</p>
                              </div>
                            </button>
                          );
                        })}
                      </div>

                      {sumAssuredBasis === SumAssuredBasis.FLAT && (
                        <div className="rounded-xl border bg-muted/30 p-4">
                          <Field label="Default flat sum insured">
                            <div className="relative">
                              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground select-none">₹</span>
                              <Input type="number" min={0} step={100_000} placeholder="1000000" value={flatSi}
                                onChange={(e) => setFlatSi(Number(e.target.value))} className="pl-7 text-sm" />
                            </div>
                            <p className="text-[10px] text-muted-foreground">= ₹{flatSi.toLocaleString('en-IN')}</p>
                          </Field>
                        </div>
                      )}

                      {sumAssuredBasis === SumAssuredBasis.SALARY_MULTIPLE && (
                        <div className="rounded-xl border bg-muted/30 p-4">
                          <Field label="Default salary multiple">
                            <div className="relative">
                              <Input type="number" min={1} step={0.5} placeholder="3" value={salaryMultiple}
                                onChange={(e) => setSalaryMultiple(Number(e.target.value))} className="pr-[4.5rem] text-sm" />
                              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground select-none">× salary</span>
                            </div>
                            <p className="text-[10px] text-muted-foreground">Member cover = {salaryMultiple}× annual salary</p>
                          </Field>
                        </div>
                      )}

                      {sumAssuredBasis === SumAssuredBasis.GRADE_SLAB && (
                        <div className="rounded-xl border border-border/50 bg-muted/30 p-4 text-xs text-muted-foreground flex items-start gap-2">
                          <Info className="mt-0.5 size-3.5 shrink-0 text-muted-foreground/60" />
                          <div>
                            <p>Ships with an empty slab list — the plan wizard seeds the table from the RFQ&apos;s census grades at use.</p>
                            <p className="mt-1 font-medium text-foreground/70">FCL mode will be stamped as BY_GRADE.</p>
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </div>
              )}

              {/* ── STEP 2: UW configuration ─────────────────────── */}
              {step === 2 && (
                <div className="space-y-4">
                  <div>
                    <h2 className="text-sm font-semibold">UW configuration</h2>
                    <p className="text-xs text-muted-foreground mt-0.5">Set advisory UW seed values. The wizard will override from treaty schedules.</p>
                  </div>

                  {/* Auto-stamped read-only fields */}
                  <div className="rounded-xl border border-dashed border-border/50 bg-muted/20 p-4 space-y-3">
                    <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/60">
                      Auto-stamped
                    </p>
                    <div className="grid grid-cols-2 gap-x-3 gap-y-2.5">
                      {[
                        { label: 'UW method',     value: 'STP'                          },
                        { label: 'Cover pattern', value: 'LEVEL'                        },
                        { label: 'FCL mode',      value: sumAssuredBasis === SumAssuredBasis.GRADE_SLAB ? 'BY_GRADE' : 'BY_PLAN' },
                        { label: 'Entry age',     value: '18–65'                        },
                        { label: 'Cessation',     value: '70'                           },
                        { label: 'Employment',    value: 'Full-time'                    },
                        { label: 'Lives',         value: 'Member only'                  },
                        { label: 'Min group',     value: '25 lives'                     },
                      ].map(({ label, value }) => (
                        <div key={label} className="flex flex-col gap-1">
                          <span className="text-[10px] font-medium text-muted-foreground/70">{label}</span>
                          <div className="h-8 rounded-md border border-border/40 bg-muted/30 px-3 flex items-center">
                            <span className="text-xs text-muted-foreground font-medium">{value}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <Field label="FCL threshold (₹)" note="Advisory — wizard overrides with treaty-governed value.">
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground select-none">₹</span>
                      <Input type="number" min={0} step={100_000} placeholder="5000000" value={fclThreshold}
                        onChange={(e) => setFclThreshold(Number(e.target.value))} className="pl-7 text-sm" />
                    </div>
                    <p className="text-[10px] text-muted-foreground">= ₹{fclThreshold.toLocaleString('en-IN')}</p>
                  </Field>

                  {version === 1 ? (
                    <Field label="Evidence pack">
                      <select
                        value={evidencePackRef}
                        onChange={(e) => setEvidencePackRef(e.target.value as EvidencePack)}
                        className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                      >
                        <option value={EvidencePack.WITHIN_FCL_MINIMAL}>Within-FCL Minimal</option>
                        <option value={EvidencePack.EOI_STANDARD}>EOI Standard</option>
                        <option value={EvidencePack.EOI_FULL}>EOI Full</option>
                        <option value={EvidencePack.EOI_JUMBO}>EOI Jumbo</option>
                      </select>
                    </Field>
                  ) : (
                    <div className="space-y-1.5">
                      <Label className="text-xs font-medium">Evidence pack</Label>
                      <div className="grid grid-cols-2 gap-2">
                        {([
                          { value: EvidencePack.WITHIN_FCL_MINIMAL, label: 'Within-FCL Minimal', desc: 'Default · no extra docs needed' },
                          { value: EvidencePack.EOI_STANDARD,       label: 'EOI Standard',       desc: 'Evidence of Insurability' },
                          { value: EvidencePack.EOI_FULL,           label: 'EOI Full',            desc: 'Full medical evidence pack' },
                          { value: EvidencePack.EOI_JUMBO,          label: 'EOI Jumbo',           desc: 'For very large sum insured' },
                        ] as const).map(({ value, label, desc }) => {
                          const selected = evidencePackRef === value;
                          return (
                            <button key={value} type="button" onClick={() => setEvidencePackRef(value)}
                              className={cn(
                                'flex flex-col gap-0.5 rounded-lg border-2 p-3 text-left transition-all',
                                selected ? 'border-foreground/50 bg-muted/60' : 'border-border bg-card hover:border-foreground/20 hover:bg-muted/30',
                              )}
                            >
                              <p className="text-xs font-semibold text-foreground">{label}</p>
                              <p className="text-[10px] text-muted-foreground leading-snug">{desc}</p>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              )}

            </div>
          </div>

          {/* Step footer */}
          <div className="shrink-0 flex items-center justify-between px-6 py-3.5 border-t border-border/40">
            <Button variant="outline" size="sm" onClick={() => setStep((s) => s - 1)}
              disabled={step === 0} className="gap-1.5">
              <ChevronLeft className="size-3.5" /> Previous
            </Button>
            <Button size="sm" onClick={isLastStep ? undefined : goNext} disabled={isLastStep} className="gap-1.5">
              Next <ChevronRight className="size-3.5" />
            </Button>
          </div>
        </div>

        {/* Right — live summary */}
        <div className="w-72 shrink-0 border-l border-border/40 bg-muted/5 overflow-y-auto px-3 py-4">
          {version === 1 && (
            <LiveSummaryV1
              name={name}
              description={description}
              tags={tags}
              productCode={productCode}
              sumAssuredBasis={sumAssuredBasis}
              flatSi={flatSi}
              salaryMultiple={salaryMultiple}
              fclThreshold={fclThreshold}
              evidencePackRef={evidencePackRef}
              visitedSteps={visitedSteps}
            />
          )}
          {version === 2 && (
            <LiveSummaryV2
              name={name}
              description={description}
              tags={tags}
              productCode={productCode}
              sumAssuredBasis={sumAssuredBasis}
              flatSi={flatSi}
              salaryMultiple={salaryMultiple}
              fclThreshold={fclThreshold}
              evidencePackRef={evidencePackRef}
              visitedSteps={visitedSteps}
            />
          )}
          {version === 3 && (
            <LiveSummaryV3
              name={name}
              description={description}
              tags={tags}
              productCode={productCode}
              sumAssuredBasis={sumAssuredBasis}
              flatSi={flatSi}
              salaryMultiple={salaryMultiple}
              fclThreshold={fclThreshold}
              evidencePackRef={evidencePackRef}
              allComplete={allStepsComplete}
              stepsDone={stepsDoneCount}
              visitedSteps={visitedSteps}
            />
          )}
        </div>

      </div>
    </div>
  );
}
