'use client';

/**
 * Step 5 — Rate Card (Pricing)
 * Includes member-to-plan mapping rule when multiple plans exist.
 */

import { useState } from 'react';
import { CheckCircle2, ChevronDown, ChevronRight } from 'lucide-react';
import { ConfigurableRuleBuilder, ConfigurableRuleValue } from './ConfigurableRuleBuilder';

// ─────────────────────────────────────────────────────────────────────────────

export interface Step5State {
  rateCardRule: ConfigurableRuleValue;
  mappingRule: ConfigurableRuleValue;
}

interface Props {
  value: Step5State;
  onChange: (v: Step5State) => void;
  readOnly?: boolean;
  pricingApproved?: boolean;
  /** Number of plans on this version — if >1, show mapping rule section */
  totalPlansCount: number;
}

// ─────────────────────────────────────────────────────────────────────────────

export const DEFAULT_STEP5: Step5State = {
  rateCardRule: {
    ruleType: 'GRID',
    spec: { type: 'GRID', tableId: 'RC-DEFAULT', rowKey: 'AGE_BAND', columnKey: 'GENDER' },
  },
  mappingRule: {
    ruleType: 'FORMULA',
    spec: {
      type: 'FORMULA',
      expression: 'salary > 100000 ? "PLAN-002" : "PLAN-001"',
      variables: ['salary'],
    },
  },
};

// ─────────────────────────────────────────────────────────────────────────────

export function Step5RateCard({ value, onChange, readOnly, pricingApproved, totalPlansCount }: Props) {
  const [mappingOpen, setMappingOpen] = useState(false);

  return (
    <div className="flex flex-col gap-6">
      {/* Pricing approved banner */}
      {pricingApproved && (
        <div className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3">
          <CheckCircle2 className="size-4 text-emerald-600" />
          <div>
            <p className="text-sm font-semibold text-emerald-800">Pricing Approved</p>
            <p className="text-xs text-emerald-700">
              The rate card was approved during the pricing round. Editing will reset pricing
              approval and require a new pricing review.
            </p>
          </div>
        </div>
      )}

      {/* Rate card */}
      <section>
        <p className="mb-1 text-sm font-semibold">Rate Card</p>
        <p className="mb-3 text-xs text-muted-foreground">
          Defines the premium rate table used to price members on this plan.
          Typically a GRID of age band × gender → rate per ₹1,000 SI.
        </p>
        <ConfigurableRuleBuilder
          value={value.rateCardRule}
          onChange={(r) => onChange({ ...value, rateCardRule: r })}
          readOnly={readOnly || pricingApproved}
          defaultType="GRID"
        />
      </section>

      {/* Member-to-plan mapping (multi-plan only) */}
      {totalPlansCount > 1 && (
        <section className="rounded-lg border">
          <button
            className="flex w-full items-center justify-between px-4 py-3 text-left"
            onClick={() => setMappingOpen((p) => !p)}
          >
            <div>
              <p className="text-sm font-semibold">Member-to-Plan Mapping</p>
              <p className="text-xs text-muted-foreground">
                Rule that assigns each member to a plan based on their attributes (e.g. salary,
                grade, category).
              </p>
            </div>
            {mappingOpen ? (
              <ChevronDown className="size-4 text-muted-foreground" />
            ) : (
              <ChevronRight className="size-4 text-muted-foreground" />
            )}
          </button>

          {mappingOpen && (
            <div className="border-t px-4 pb-4 pt-3">
              <ConfigurableRuleBuilder
                value={value.mappingRule}
                onChange={(r) => onChange({ ...value, mappingRule: r })}
                readOnly={readOnly || pricingApproved}
                defaultType="FORMULA"
              />
            </div>
          )}
        </section>
      )}
    </div>
  );
}
