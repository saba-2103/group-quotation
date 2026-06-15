'use client';

/**
 * Step 3 — Eligibility & Sum Insured
 */

import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ConfigurableRuleBuilder, ConfigurableRuleValue } from './ConfigurableRuleBuilder';

// ─────────────────────────────────────────────────────────────────────────────

export interface Step3State {
  minEntryAge: number;
  maxEntryAge: number;
  exitAge: number;
  employeeCategories: string;
  dependantCategories: string;
  siRule: ConfigurableRuleValue;
}

interface Props {
  value: Step3State;
  onChange: (v: Step3State) => void;
  readOnly?: boolean;
}

// ─────────────────────────────────────────────────────────────────────────────

export const DEFAULT_STEP3: Step3State = {
  minEntryAge: 18,
  maxEntryAge: 60,
  exitAge: 65,
  employeeCategories: 'All Employees',
  dependantCategories: 'Spouse, Children',
  siRule: {
    ruleType: 'FIXED',
    spec: { type: 'FIXED', value: 2000000 },
  },
};

// ─────────────────────────────────────────────────────────────────────────────

function NumberField({
  label,
  value,
  onChange,
  min,
  max,
  readOnly,
}: {
  label: string;
  value: number;
  onChange: (n: number) => void;
  min?: number;
  max?: number;
  readOnly?: boolean;
}) {
  return (
    <div className="flex flex-col gap-1">
      <Label className="text-xs">{label}</Label>
      <Input
        type="number"
        value={value}
        min={min}
        max={max}
        readOnly={readOnly}
        onChange={(e) => onChange(Number(e.target.value))}
        className="h-8 w-28 text-xs"
      />
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────

export function Step3EligibilitySI({ value, onChange, readOnly }: Props) {
  const u = (patch: Partial<Step3State>) => onChange({ ...value, ...patch });

  return (
    <div className="flex flex-col gap-8">
      {/* Eligibility */}
      <section>
        <p className="mb-3 text-sm font-semibold">Eligibility</p>
        <div className="flex flex-wrap gap-4">
          <NumberField
            label="Min Entry Age"
            value={value.minEntryAge}
            min={14}
            max={30}
            readOnly={readOnly}
            onChange={(n) => u({ minEntryAge: n })}
          />
          <NumberField
            label="Max Entry Age"
            value={value.maxEntryAge}
            min={40}
            max={70}
            readOnly={readOnly}
            onChange={(n) => u({ maxEntryAge: n })}
          />
          <NumberField
            label="Exit Age"
            value={value.exitAge}
            min={55}
            max={75}
            readOnly={readOnly}
            onChange={(n) => u({ exitAge: n })}
          />
        </div>
        <div className="mt-4 flex flex-col gap-3 sm:flex-row">
          <div className="flex flex-1 flex-col gap-1">
            <Label className="text-xs">Employee Categories</Label>
            <Input
              value={value.employeeCategories}
              readOnly={readOnly}
              onChange={(e) => u({ employeeCategories: e.target.value })}
              placeholder="e.g. All Employees, Management Only"
              className="h-8 text-xs"
            />
          </div>
          <div className="flex flex-1 flex-col gap-1">
            <Label className="text-xs">Dependant Categories</Label>
            <Input
              value={value.dependantCategories}
              readOnly={readOnly}
              onChange={(e) => u({ dependantCategories: e.target.value })}
              placeholder="e.g. Spouse, Children"
              className="h-8 text-xs"
            />
          </div>
        </div>
      </section>

      {/* SI rule */}
      <section>
        <p className="mb-1 text-sm font-semibold">Sum Insured Rule</p>
        <p className="mb-3 text-xs text-muted-foreground">
          Defines how the sum insured is calculated for members on this plan.
        </p>
        <ConfigurableRuleBuilder
          value={value.siRule}
          onChange={(r) => u({ siRule: r })}
          readOnly={readOnly}
          defaultType="FIXED"
        />
      </section>
    </div>
  );
}
