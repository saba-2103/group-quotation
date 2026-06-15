'use client';

/**
 * Step 4 — UW Values (FCL / NML)
 */

import { CheckCircle2 } from 'lucide-react';
import { ConfigurableRuleBuilder, ConfigurableRuleValue } from './ConfigurableRuleBuilder';

// ─────────────────────────────────────────────────────────────────────────────

export interface Step4State {
  fclRule: ConfigurableRuleValue;
  nmlRule: ConfigurableRuleValue;
}

interface Props {
  value: Step4State;
  onChange: (v: Step4State) => void;
  readOnly?: boolean;
  uwApproved?: boolean;
}

// ─────────────────────────────────────────────────────────────────────────────

export const DEFAULT_STEP4: Step4State = {
  fclRule: {
    ruleType: 'FIXED',
    spec: { type: 'FIXED', value: 2000000 },
  },
  nmlRule: {
    ruleType: 'FIXED',
    spec: { type: 'FIXED', value: 3000000 },
  },
};

// ─────────────────────────────────────────────────────────────────────────────

export function Step4UWValues({ value, onChange, readOnly, uwApproved }: Props) {
  return (
    <div className="flex flex-col gap-6">
      {/* UW Approved banner */}
      {uwApproved && (
        <div className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3">
          <CheckCircle2 className="size-4 text-emerald-600" />
          <div>
            <p className="text-sm font-semibold text-emerald-800">UW Approved</p>
            <p className="text-xs text-emerald-700">
              These values were approved by Underwriting. Editing FCL or NML will reset UW approval
              and require a new review.
            </p>
          </div>
        </div>
      )}

      <div className="grid gap-8 md:grid-cols-2">
        {/* FCL */}
        <section>
          <div className="mb-1 flex items-center gap-2">
            <p className="text-sm font-semibold">Free Cover Limit (FCL)</p>
            <span
              title="The maximum sum insured up to which no medical evidence is required. Members with SI ≤ FCL are auto-approved."
              className="cursor-help text-xs text-muted-foreground underline decoration-dotted"
            >
              What is FCL?
            </span>
          </div>
          <p className="mb-3 text-xs text-muted-foreground">
            Members with sum insured at or below this amount need no medical examination.
          </p>
          <ConfigurableRuleBuilder
            value={value.fclRule}
            onChange={(r) => onChange({ ...value, fclRule: r })}
            readOnly={readOnly || uwApproved}
          />
        </section>

        {/* NML */}
        <section>
          <div className="mb-1 flex items-center gap-2">
            <p className="text-sm font-semibold">Non-Medical Limit (NML)</p>
            <span
              title="The maximum sum insured for which simplified medical underwriting (no full exam) is required. Above NML = full medical required."
              className="cursor-help text-xs text-muted-foreground underline decoration-dotted"
            >
              What is NML?
            </span>
          </div>
          <p className="mb-3 text-xs text-muted-foreground">
            Members between FCL and NML require simplified medical evidence only.
          </p>
          <ConfigurableRuleBuilder
            value={value.nmlRule}
            onChange={(r) => onChange({ ...value, nmlRule: r })}
            readOnly={readOnly || uwApproved}
          />
        </section>
      </div>
    </div>
  );
}
