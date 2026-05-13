"use client";

import React from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

// AmountFormulaField — discriminated-union sub-form for the DSL `AmountFormula`
// (docs/spec/common/CommonData.data). Used by PlanForm for cover-amount and
// free-cover-limit formulas. Renders a `type` select and shows the subset of
// sub-fields the selected type requires. NOT a generic field type — internal
// to PlanForm so we can ship a structured editor without overhauling the
// scalar-only FormContainer.

export type AmountFormulaType =
  | "MULTIPLE_OF_MEMBER_ATTRIBUTE"
  | "LOOKUP_ON_MEMBER_ATTRIBUTE"
  | "FIXED"
  | "DMN_TABLE";

export interface AmountFormulaValue {
  type: AmountFormulaType;
  multiplicationFactor?: number | string;
  memberAttributeName?: string;
  lookupTableJson?: string;
  fixedAmount?: number | string;
  dmnTableFile?: string;
}

interface AmountFormulaFieldProps {
  value: AmountFormulaValue;
  onChange: (next: AmountFormulaValue) => void;
  disabled?: boolean;
  errors?: Partial<Record<keyof AmountFormulaValue, string>>;
}

const TYPE_OPTIONS: Array<{ value: AmountFormulaType; label: string }> = [
  { value: "MULTIPLE_OF_MEMBER_ATTRIBUTE", label: "Multiple of member attribute" },
  { value: "LOOKUP_ON_MEMBER_ATTRIBUTE", label: "Lookup on member attribute" },
  { value: "FIXED", label: "Fixed amount" },
  { value: "DMN_TABLE", label: "DMN table" },
];

const ATTRIBUTE_OPTIONS = [
  { value: "salary", label: "salary" },
  { value: "dob", label: "dob" },
  { value: "gender", label: "gender" },
  { value: "occupation", label: "occupation" },
];

export const AmountFormulaField: React.FC<AmountFormulaFieldProps> = ({
  value,
  onChange,
  disabled,
  errors,
}) => {
  const set = (patch: Partial<AmountFormulaValue>) => onChange({ ...value, ...patch });

  return (
    <div className="space-y-3 rounded border border-border/60 p-3">
      <div>
        <Label className="text-xs">Type</Label>
        <Select
          value={value.type}
          onValueChange={(v) => set({ type: v as AmountFormulaType })}
          disabled={disabled}
        >
          <SelectTrigger>
            <SelectValue placeholder="Choose formula type" />
          </SelectTrigger>
          <SelectContent>
            {TYPE_OPTIONS.map((o) => (
              <SelectItem key={o.value} value={o.value}>
                {o.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {value.type === "MULTIPLE_OF_MEMBER_ATTRIBUTE" && (
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label className="text-xs">Member attribute</Label>
            <Select
              value={value.memberAttributeName ?? ""}
              onValueChange={(v) => set({ memberAttributeName: v })}
              disabled={disabled}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select attribute" />
              </SelectTrigger>
              <SelectContent>
                {ATTRIBUTE_OPTIONS.map((o) => (
                  <SelectItem key={o.value} value={o.value}>
                    {o.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors?.memberAttributeName && (
              <p className="mt-1 text-xs text-destructive">{errors.memberAttributeName}</p>
            )}
          </div>
          <div>
            <Label className="text-xs">Multiplication factor</Label>
            <Input
              type="number"
              step="0.1"
              value={value.multiplicationFactor ?? ""}
              onChange={(e) =>
                set({
                  multiplicationFactor:
                    e.target.value === "" ? undefined : Number(e.target.value),
                })
              }
              disabled={disabled}
              placeholder="e.g. 3"
            />
            {errors?.multiplicationFactor && (
              <p className="mt-1 text-xs text-destructive">{errors.multiplicationFactor}</p>
            )}
          </div>
        </div>
      )}

      {value.type === "LOOKUP_ON_MEMBER_ATTRIBUTE" && (
        <div className="space-y-3">
          <div>
            <Label className="text-xs">Member attribute</Label>
            <Select
              value={value.memberAttributeName ?? ""}
              onValueChange={(v) => set({ memberAttributeName: v })}
              disabled={disabled}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select attribute" />
              </SelectTrigger>
              <SelectContent>
                {ATTRIBUTE_OPTIONS.map((o) => (
                  <SelectItem key={o.value} value={o.value}>
                    {o.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors?.memberAttributeName && (
              <p className="mt-1 text-xs text-destructive">{errors.memberAttributeName}</p>
            )}
          </div>
          <div>
            <Label className="text-xs">Lookup table JSON</Label>
            <Input
              type="text"
              value={value.lookupTableJson ?? ""}
              onChange={(e) => set({ lookupTableJson: e.target.value })}
              disabled={disabled}
              placeholder="lookup-table-ref or inline JSON"
            />
            {errors?.lookupTableJson && (
              <p className="mt-1 text-xs text-destructive">{errors.lookupTableJson}</p>
            )}
          </div>
        </div>
      )}

      {value.type === "FIXED" && (
        <div>
          <Label className="text-xs">Fixed amount</Label>
          <Input
            type="number"
            step="1"
            value={value.fixedAmount ?? ""}
            onChange={(e) =>
              set({ fixedAmount: e.target.value === "" ? undefined : Number(e.target.value) })
            }
            disabled={disabled}
            placeholder="e.g. 2500000"
          />
          {errors?.fixedAmount && (
            <p className="mt-1 text-xs text-destructive">{errors.fixedAmount}</p>
          )}
        </div>
      )}

      {value.type === "DMN_TABLE" && (
        <div>
          <Label className="text-xs">DMN table file</Label>
          <Input
            type="text"
            value={value.dmnTableFile ?? ""}
            onChange={(e) => set({ dmnTableFile: e.target.value })}
            disabled={disabled}
            placeholder="ratecard-band.dmn"
          />
          {errors?.dmnTableFile && (
            <p className="mt-1 text-xs text-destructive">{errors.dmnTableFile}</p>
          )}
        </div>
      )}
    </div>
  );
};
