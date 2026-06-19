'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { AlertTriangle, ChevronRight, Info, X } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';

import { EvidencePack, FclPattern, LivesCovered, SumAssuredBasis, UwMethod } from '@/lib/types';
import type { PlanTemplate } from '@/lib/types';
import {
  GTL_STANDARD_DEFAULTS,
  EVIDENCE_PACK_LABELS,
  slugify,
  upsertTemplate,
} from '@/lib/templateRegistry';

// ─── Types ────────────────────────────────────────────────────────────────────

interface TemplateFormProps {
  mode: 'new' | 'edit';
  initialTemplate?: PlanTemplate;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function TemplateForm({ mode, initialTemplate }: TemplateFormProps) {
  const router = useRouter();

  // Form state — defaults from spec; overridden by initialTemplate in edit mode
  const [name, setName] = useState(initialTemplate?.name ?? '');
  const [description, setDescription] = useState(initialTemplate?.description ?? '');
  const [tags, setTags] = useState<string[]>(initialTemplate?.tags ?? []);
  const [tagInput, setTagInput] = useState('');
  const [productCode, setProductCode] = useState(
    initialTemplate?.productCode ?? 'GTL-STD-001',
  );
  const [sumAssuredBasis, setSumAssuredBasis] = useState<SumAssuredBasis>(
    initialTemplate?.sumAssuredBasis ?? SumAssuredBasis.FLAT,
  );
  const [flatSi, setFlatSi] = useState<number>(
    initialTemplate?.defaultSumInsured ?? 1_000_000,
  );
  const [salaryMultiple, setSalaryMultiple] = useState<number>(
    initialTemplate?.salaryMultiple ?? 3,
  );
  const [fclThreshold, setFclThreshold] = useState<number>(
    initialTemplate?.uw?.fclThreshold ?? 5_000_000,
  );
  const [evidencePackRef, setEvidencePackRef] = useState<EvidencePack>(
    (initialTemplate?.uw?.evidencePackRef as EvidencePack) ??
      EvidencePack.WITHIN_FCL_MINIMAL,
  );

  const [nameError, setNameError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);

  // ─── Tag helpers ───────────────────────────────────────────────────────────

  function commitTagInput() {
    const parts = tagInput
      .split(',')
      .map((s) => s.trim().toLowerCase())
      .filter(Boolean);
    const merged = Array.from(new Set([...tags, ...parts]));
    setTags(merged);
    setTagInput('');
  }

  function removeTag(tag: string) {
    setTags(tags.filter((t) => t !== tag));
  }

  function handleTagKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      commitTagInput();
    }
  }

  // ─── Basis change ──────────────────────────────────────────────────────────

  function handleBasisChange(basis: SumAssuredBasis) {
    setSumAssuredBasis(basis);
  }

  // ─── Submit ────────────────────────────────────────────────────────────────

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setNameError(null);
    setSaveError(null);

    if (!name.trim()) {
      setNameError('Template name is required.');
      return;
    }

    const template: PlanTemplate = {
      id: slugify(name),
      name: name.trim(),
      description: description.trim(),
      tags,
      isCustom: true,
      censusAware: sumAssuredBasis === SumAssuredBasis.GRADE_SLAB,
      sumAssuredBasis,
      productCode: productCode.trim() || 'GTL-STD-001',
      ...(sumAssuredBasis === SumAssuredBasis.FLAT
        ? { defaultSumInsured: flatSi }
        : {}),
      ...(sumAssuredBasis === SumAssuredBasis.SALARY_MULTIPLE
        ? { salaryMultiple }
        : {}),
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
        'Could not save the template — storage unavailable or full. Try again or clear browser storage.',
      );
      return;
    }

    router.push('/plan-templates');
  }

  function handleCancel() {
    router.push('/plan-templates');
  }

  // ─── Render ────────────────────────────────────────────────────────────────

  const isEdit = mode === 'edit';
  const screenTitle = isEdit
    ? `Edit template — ${initialTemplate?.name ?? ''}`
    : 'New template';
  const submitLabel = isEdit ? 'Save template' : 'Create template';

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 space-y-6">

      {/* P-CRUMB: Breadcrumb */}
      <nav className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <button
          type="button"
          onClick={() => router.push('/plan-templates')}
          className="hover:text-foreground hover:underline"
        >
          Plan Templates
        </button>
        {isEdit && initialTemplate && (
          <>
            <ChevronRight className="size-3" />
            <span>{initialTemplate.name}</span>
          </>
        )}
        <ChevronRight className="size-3" />
        <span className="text-foreground font-medium">
          {isEdit ? 'Edit' : 'New template'}
        </span>
      </nav>

      {/* P-HEADER: Screen header */}
      <div className="space-y-1">
        <h1 className="text-xl font-bold tracking-tight">{screenTitle}</h1>
        <p className="text-sm text-muted-foreground">
          Define the plan shape the wizard will pre-fill when reps pick this
          template on any RFQ.
        </p>
      </div>

      <form onSubmit={handleSubmit} noValidate className="space-y-6">

      {/* P-PROMPT: Defaults guidance */}
      <div className="rounded-md border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900">
        <div className="flex items-start gap-2">
          <Info className="mt-0.5 size-4 shrink-0 text-amber-600" />
          <div className="space-y-1.5">
            <p className="font-medium">Defaults stamped on save</p>
            <p>
              This form captures only the differentiating shape. The following
              blocks are stamped from GTL standard defaults on save and do not
              need to be entered here:
            </p>
            <ul className="ml-4 list-disc space-y-0.5">
              <li>
                <strong>Eligibility:</strong> Entry age 18–65, cessation 70,
                full-time employment, member-only lives covered, minimum group
                size 25.
              </li>
              <li>
                <strong>UW block:</strong> STP method, BY_PLAN FCL mode
                (BY_GRADE for grade-slab shapes), no treaty override.
              </li>
              <li>
                <strong>Cover pattern:</strong> LEVEL.
              </li>
              <li>
                <strong>Grade-slab shapes</strong> ship with an empty slab
                list — the plan wizard seeds the table from the consuming
                RFQ&apos;s census grades at use.
              </li>
            </ul>
          </div>
        </div>
      </div>

      {/* Save error */}
      {saveError && (
        <div className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
          {saveError}
        </div>
      )}

      {/* ── Field: Name ──────────────────────────────────────────────────────── */}
      <div className="space-y-1.5">
        <Label htmlFor="tmpl-name">
          Template name <span className="text-destructive">*</span>
        </Label>
        <Input
          id="tmpl-name"
          placeholder="e.g. Standard GTL Staff"
          value={name}
          onChange={(e) => {
            setName(e.target.value);
            if (nameError) setNameError(null);
          }}
          aria-invalid={!!nameError}
          className={cn(nameError && 'border-destructive')}
        />
        {nameError && (
          <p className="text-sm text-destructive">{nameError}</p>
        )}
        <p className="text-xs text-muted-foreground">
          The template id is derived from this name as a slug (
          <code className="font-mono">custom-&#123;slug&#125;</code>). If
          another custom template has the same slug it will be silently
          replaced.
        </p>
      </div>

      {/* ── Field: Description ───────────────────────────────────────────────── */}
      <div className="space-y-1.5">
        <Label htmlFor="tmpl-desc">Description</Label>
        <Input
          id="tmpl-desc"
          placeholder="One-line summary shown in the template picker"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
      </div>

      {/* ── Field: Tags ──────────────────────────────────────────────────────── */}
      <div className="space-y-1.5">
        <Label htmlFor="tmpl-tags">Tags</Label>
        <div className="flex flex-wrap gap-1.5 rounded-md border bg-background px-3 py-2 min-h-[2.5rem]">
          {tags.map((tag) => (
            <Badge
              key={tag}
              variant="secondary"
              className="flex items-center gap-1 pr-1"
            >
              {tag}
              <button
                type="button"
                onClick={() => removeTag(tag)}
                className="ml-0.5 rounded-full hover:text-destructive focus-visible:outline-none"
                aria-label={`Remove tag ${tag}`}
              >
                <X className="size-3" />
              </button>
            </Badge>
          ))}
          <input
            id="tmpl-tags"
            value={tagInput}
            onChange={(e) => setTagInput(e.target.value)}
            onKeyDown={handleTagKeyDown}
            onBlur={commitTagInput}
            placeholder={tags.length === 0 ? 'e.g. flat, standard, sme' : ''}
            className="flex-1 min-w-[8rem] bg-transparent text-sm outline-none placeholder:text-muted-foreground"
          />
        </div>
        <p className="text-xs text-muted-foreground">
          Type a tag and press Enter or comma to add. Multiple tags can be pasted comma-separated.
        </p>
      </div>

      {/* ── Field: Product code ──────────────────────────────────────────────── */}
      <div className="space-y-1.5">
        <Label htmlFor="tmpl-product-code">Product code</Label>
        <Input
          id="tmpl-product-code"
          placeholder="GTL-STD-001"
          value={productCode}
          onChange={(e) => setProductCode(e.target.value)}
        />
        <p className="text-xs text-muted-foreground">
          Enter the product code this template is designed for. Not validated
          against the catalogue — an unknown or closed product code will show a
          gating notice in the plan wizard.
        </p>
      </div>

      {/* ── Field: Sum-assured basis ─────────────────────────────────────────── */}
      <div className="space-y-2">
        <Label>
          Sum-assured basis <span className="text-destructive">*</span>
        </Label>
        <div className="space-y-2">
          {(
            [
              [SumAssuredBasis.FLAT,            'Flat sum insured'],
              [SumAssuredBasis.SALARY_MULTIPLE,  'Salary multiple'],
              [SumAssuredBasis.GRADE_SLAB,       'Grade slab (census-seeded)'],
            ] as const
          ).map(([value, label]) => (
            <label
              key={value}
              className="flex cursor-pointer items-center gap-2 text-sm"
            >
              <input
                type="radio"
                name="sumAssuredBasis"
                value={value}
                checked={sumAssuredBasis === value}
                onChange={() => handleBasisChange(value)}
                className="accent-primary"
              />
              {label}
            </label>
          ))}
        </div>

        {/* Basis-specific sub-field */}
        {sumAssuredBasis === SumAssuredBasis.FLAT && (
          <div className="ml-6 mt-2 space-y-1.5">
            <Label htmlFor="tmpl-flat-si">Default flat sum insured (₹)</Label>
            <Input
              id="tmpl-flat-si"
              type="number"
              min={0}
              step={100_000}
              placeholder="e.g. 1000000 for ₹10 L"
              value={flatSi}
              onChange={(e) => setFlatSi(Number(e.target.value))}
            />
          </div>
        )}

        {sumAssuredBasis === SumAssuredBasis.SALARY_MULTIPLE && (
          <div className="ml-6 mt-2 space-y-1.5">
            <Label htmlFor="tmpl-salary-mult">Default salary multiple</Label>
            <Input
              id="tmpl-salary-mult"
              type="number"
              min={1}
              step={0.5}
              placeholder="e.g. 3 for 3× salary"
              value={salaryMultiple}
              onChange={(e) => setSalaryMultiple(Number(e.target.value))}
            />
          </div>
        )}

        {sumAssuredBasis === SumAssuredBasis.GRADE_SLAB && (
          <div className="ml-6 mt-2 rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800 space-y-1">
            <div className="flex items-start gap-2">
              <AlertTriangle className="mt-0.5 size-4 shrink-0 text-amber-600" />
              <div className="space-y-1">
                <p>
                  Grade-slab templates ship with an empty slab list. The plan
                  wizard seeds the table from the consuming RFQ&apos;s census
                  grades.
                </p>
                <p className="text-xs">
                  FCL mode will be set to <strong>BY_GRADE</strong> (not
                  BY_PLAN) for this shape.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ── Field: FCL threshold ─────────────────────────────────────────────── */}
      <div className="space-y-1.5">
        <Label htmlFor="tmpl-fcl">FCL threshold (₹) — UW seed</Label>
        <Input
          id="tmpl-fcl"
          type="number"
          min={0}
          step={100_000}
          placeholder="e.g. 5000000 for ₹50 L"
          value={fclThreshold}
          onChange={(e) => setFclThreshold(Number(e.target.value))}
        />
        <p className="text-xs text-muted-foreground">
          Seeded into the UW block as a starting point. The plan wizard derives
          the governed threshold from the treaty schedule and will override this
          value — treat this as an indicative default only.
        </p>
      </div>

      {/* ── Field: Evidence pack ─────────────────────────────────────────────── */}
      <div className="space-y-1.5">
        <Label htmlFor="tmpl-evidence-pack">Evidence pack — UW seed</Label>
        <Select
          value={evidencePackRef}
          onValueChange={(v) => setEvidencePackRef(v as EvidencePack)}
        >
          <SelectTrigger id="tmpl-evidence-pack" className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {(Object.keys(EVIDENCE_PACK_LABELS) as EvidencePack[]).map(
              (key) => (
                <SelectItem key={key} value={key}>
                  {EVIDENCE_PACK_LABELS[key]}
                </SelectItem>
              ),
            )}
          </SelectContent>
        </Select>
      </div>

      {/* ── Footer: actions ──────────────────────────────────────────────────── */}
      <div className="flex items-center justify-end gap-3 border-t pt-4">
        <Button type="button" variant="outline" onClick={handleCancel}>
          Cancel
        </Button>
        <Button type="submit">{submitLabel}</Button>
      </div>
    </form>
    </div>
  );
}
