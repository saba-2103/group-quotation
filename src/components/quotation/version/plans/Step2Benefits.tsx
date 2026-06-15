'use client';

/**
 * Step 2 — Benefits
 *
 * Grouped by product (BASE + selected riders).
 * Mandatory benefits are non-removable.
 * Optional benefits can be toggled.
 * Inline parameter overrides with constraint-aware inputs.
 */

import { useState } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { PRODUCT_CATALOG } from '@/mocks/group-pas/quotation/data';
import type {
  PlanBenefitV2,
  ParameterOverride,
  ParameterConstraint,
  SchemeType,
} from '@/types/group-pas/quotation-v2';
import type { Step1State } from './Step1ProductsRiders';

// ─────────────────────────────────────────────────────────────────────────────

export interface BenefitWithOverrides {
  benefit: PlanBenefitV2;
  enabled: boolean;
  overrides: ParameterOverride[];
}

export interface Step2State {
  benefitMap: Record<string, BenefitWithOverrides>; // key = benefit.code
}

interface Props {
  schemeType: SchemeType;
  step1: Step1State;
  value: Step2State;
  onChange: (v: Step2State) => void;
  readOnly?: boolean;
}

// ─────────────────────────────────────────────────────────────────────────────
// Default overrides per benefit code (demo mock)
// ─────────────────────────────────────────────────────────────────────────────

const BENEFIT_DEFAULT_OVERRIDES: Record<string, ParameterOverride[]> = {
  DEATH_BENEFIT: [
    {
      parameterId: 'min_entry_age',
      parameterName: 'Min Entry Age',
      originalValue: 18,
      overrideValue: 18,
      constraint: { type: 'RANGE', min: 14, max: 25 },
    },
    {
      parameterId: 'max_entry_age',
      parameterName: 'Max Entry Age',
      originalValue: 60,
      overrideValue: 60,
      constraint: { type: 'RANGE', min: 55, max: 70 },
    },
  ],
  TPD: [
    {
      parameterId: 'tpd_definition',
      parameterName: 'TPD Definition',
      originalValue: 'OWN_OCCUPATION',
      overrideValue: 'OWN_OCCUPATION',
      constraint: { type: 'LIST', allowedValues: ['OWN_OCCUPATION', 'ANY_OCCUPATION'] },
    },
  ],
  ADB: [
    {
      parameterId: 'adb_multiplier',
      parameterName: 'ADB Multiplier (x SI)',
      originalValue: 1,
      overrideValue: 1,
      constraint: { type: 'RANGE', min: 1, max: 3 },
    },
  ],
  HOSPITALISATION: [
    {
      parameterId: 'room_category',
      parameterName: 'Room Category',
      originalValue: 'SHARED',
      overrideValue: 'SHARED',
      constraint: {
        type: 'LIST',
        allowedValues: ['SHARED', 'SINGLE', 'TWIN_SHARING'],
      },
    },
    {
      parameterId: 'co_pay_percent',
      parameterName: 'Co-pay %',
      originalValue: 0,
      overrideValue: 0,
      constraint: { type: 'RANGE', min: 0, max: 30 },
    },
  ],
};

// ─────────────────────────────────────────────────────────────────────────────
// Constraint input
// ─────────────────────────────────────────────────────────────────────────────

function ConstraintInput({
  override,
  onChange,
  readOnly,
}: {
  override: ParameterOverride;
  onChange: (v: ParameterOverride) => void;
  readOnly?: boolean;
}) {
  const { constraint, overrideValue } = override;
  const c = constraint;

  if (readOnly) {
    return (
      <span className="rounded bg-muted px-2 py-0.5 text-xs text-muted-foreground">
        {String(overrideValue)}
      </span>
    );
  }

  if (c.type === 'RANGE') {
    return (
      <div className="flex items-center gap-2">
        <Input
          type="number"
          value={Number(overrideValue)}
          min={c.min}
          max={c.max}
          onChange={(e) => onChange({ ...override, overrideValue: Number(e.target.value) })}
          className="h-7 w-24 text-xs"
        />
        <span className="text-[10px] text-muted-foreground">
          [{c.min} – {c.max}]
        </span>
      </div>
    );
  }

  if (c.type === 'DIRECTION') {
    return (
      <div className="flex items-center gap-2">
        <Input
          type="number"
          value={Number(overrideValue)}
          min={c.direction === 'UP_ONLY' ? c.baseValue : undefined}
          max={c.direction === 'DOWN_ONLY' ? c.baseValue : undefined}
          onChange={(e) => onChange({ ...override, overrideValue: Number(e.target.value) })}
          className="h-7 w-24 text-xs"
        />
        <span className="text-[10px] text-muted-foreground">
          {c.direction === 'UP_ONLY' ? `≥ ${c.baseValue}` : `≤ ${c.baseValue}`}
        </span>
      </div>
    );
  }

  if (c.type === 'LIST') {
    return (
      <select
        value={String(overrideValue)}
        onChange={(e) => onChange({ ...override, overrideValue: e.target.value })}
        className="h-7 rounded border border-input bg-background px-2 text-xs focus:outline-none focus:ring-2 focus:ring-ring"
      >
        {c.allowedValues.map((v) => (
          <option key={String(v)} value={String(v)}>
            {String(v)}
          </option>
        ))}
      </select>
    );
  }

  if (c.type === 'LIST_MULTI') {
    const selected = String(overrideValue)
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
    return (
      <div className="flex flex-wrap gap-2">
        {c.allowedValues.map((v) => {
          const checked = selected.includes(String(v));
          return (
            <label key={String(v)} className="flex items-center gap-1 text-xs cursor-pointer">
              <input
                type="checkbox"
                checked={checked}
                onChange={() => {
                  const next = checked
                    ? selected.filter((s) => s !== String(v))
                    : [...selected, String(v)];
                  onChange({ ...override, overrideValue: next.join(', ') });
                }}
                className="size-3 rounded"
              />
              {String(v)}
            </label>
          );
        })}
      </div>
    );
  }

  // FREE
  return (
    <Input
      value={String(overrideValue)}
      onChange={(e) => onChange({ ...override, overrideValue: e.target.value })}
      className="h-7 w-48 text-xs"
    />
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Benefit row
// ─────────────────────────────────────────────────────────────────────────────

function BenefitRow({
  item,
  onToggle,
  onOverrideChange,
  readOnly,
}: {
  item: BenefitWithOverrides;
  onToggle: () => void;
  onOverrideChange: (overrides: ParameterOverride[]) => void;
  readOnly?: boolean;
}) {
  const [expanded, setExpanded] = useState(false);
  const { benefit, enabled, overrides } = item;

  function updateOverride(idx: number, updated: ParameterOverride) {
    onOverrideChange(overrides.map((o, i) => (i === idx ? updated : o)));
  }

  return (
    <div className="rounded-lg border bg-background">
      <div className="flex items-center gap-3 px-3 py-2.5">
        {/* Toggle */}
        <input
          type="checkbox"
          checked={enabled}
          disabled={benefit.mandatory || readOnly}
          onChange={onToggle}
          className="size-3.5 rounded accent-indigo-600"
          title={benefit.mandatory ? 'Mandatory — cannot be removed' : undefined}
        />

        {/* Name */}
        <span
          className={`flex-1 text-sm font-medium ${
            !enabled ? 'text-muted-foreground line-through' : 'text-foreground'
          }`}
        >
          {benefit.name}
        </span>

        {/* Badges */}
        <div className="flex items-center gap-1.5">
          {benefit.mandatory && (
            <Badge variant="secondary" className="text-[10px]">
              Mandatory
            </Badge>
          )}
          {benefit.productType === 'RIDER' && (
            <Badge variant="outline" className="text-[10px]">
              Rider
            </Badge>
          )}
        </div>

        {/* Expand overrides */}
        {overrides.length > 0 && enabled && (
          <button
            onClick={() => setExpanded((p) => !p)}
            className="flex items-center gap-0.5 text-[11px] text-muted-foreground hover:text-foreground"
          >
            {expanded ? (
              <ChevronDown className="size-3.5" />
            ) : (
              <ChevronRight className="size-3.5" />
            )}
            {overrides.length} override{overrides.length !== 1 ? 's' : ''}
          </button>
        )}
      </div>

      {/* Overrides panel */}
      {expanded && enabled && overrides.length > 0 && (
        <div className="border-t bg-muted/30 px-4 py-3">
          <div className="flex flex-col gap-2.5">
            {overrides.map((o, i) => (
              <div key={o.parameterId} className="flex items-center gap-3">
                <Label className="w-44 shrink-0 text-xs text-muted-foreground">
                  {o.parameterName}
                </Label>
                <ConstraintInput
                  override={o}
                  onChange={(updated) => updateOverride(i, updated)}
                  readOnly={readOnly}
                />
                {!readOnly && (
                  <Input
                    value={o.overrideReason ?? ''}
                    onChange={(e) =>
                      updateOverride(i, { ...o, overrideReason: e.target.value })
                    }
                    placeholder="Reason (optional)"
                    className="h-7 flex-1 text-xs"
                  />
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Step 2 main
// ─────────────────────────────────────────────────────────────────────────────

export function buildDefaultStep2(step1: Step1State, schemeType: SchemeType): Step2State {
  const allProducts = [
    ...PRODUCT_CATALOG.filter(
      (p) => p.productCode === step1.baseProductCode,
    ),
    ...PRODUCT_CATALOG.filter(
      (p) =>
        p.productType === 'RIDER' &&
        step1.selectedRiderCodes.includes(p.productCode),
    ),
  ];

  const benefitMap: Record<string, BenefitWithOverrides> = {};
  for (const product of allProducts) {
    for (const benefit of product.defaultBenefits) {
      benefitMap[benefit.code] = {
        benefit,
        enabled: benefit.mandatory,
        overrides: BENEFIT_DEFAULT_OVERRIDES[benefit.code] ?? [],
      };
    }
  }
  return { benefitMap };
}

export function Step2Benefits({ schemeType, step1, value, onChange, readOnly }: Props) {
  const baseProducts = PRODUCT_CATALOG.filter(
    (p) => p.productCode === step1.baseProductCode,
  );
  const riderProducts = PRODUCT_CATALOG.filter(
    (p) =>
      p.productType === 'RIDER' &&
      step1.selectedRiderCodes.includes(p.productCode),
  );
  const allGroups = [...baseProducts, ...riderProducts];

  function updateItem(code: string, updated: BenefitWithOverrides) {
    onChange({
      benefitMap: { ...value.benefitMap, [code]: updated },
    });
  }

  if (allGroups.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        No products selected. Go back to Step 1.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {allGroups.map((product) => (
        <div key={product.productCode}>
          <div className="mb-2 flex items-center gap-2">
            <p className="text-sm font-semibold">{product.productName}</p>
            <Badge variant={product.productType === 'BASE' ? 'secondary' : 'outline'} className="text-[10px]">
              {product.productType}
            </Badge>
          </div>
          <div className="flex flex-col gap-2">
            {product.defaultBenefits.map((b) => {
              const item = value.benefitMap[b.code] ?? {
                benefit: b,
                enabled: b.mandatory,
                overrides: BENEFIT_DEFAULT_OVERRIDES[b.code] ?? [],
              };
              return (
                <BenefitRow
                  key={b.code}
                  item={item}
                  onToggle={() =>
                    updateItem(b.code, { ...item, enabled: !item.enabled })
                  }
                  onOverrideChange={(overrides) =>
                    updateItem(b.code, { ...item, overrides })
                  }
                  readOnly={readOnly}
                />
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
