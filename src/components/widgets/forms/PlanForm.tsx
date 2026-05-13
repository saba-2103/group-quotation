"use client";

import React, { useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useOverlayStore } from "@/hooks/useOverlayStore";
import { useActionHandler } from "@/hooks/useActionHandler";
import {
  AmountFormulaField,
  type AmountFormulaValue,
} from "./AmountFormulaField";

// PlanForm — bespoke structured editor for a Quote `Plan` (DSL shape in
// docs/spec/common/CommonData.data). Handles the nested `products[]` array
// with sub-arrays for benefits/exclusions plus a discriminated-union
// AmountFormula sub-form for cover and free-cover formulas.
//
// Lives outside the scalar-only FormContainer (types.ts: FormFieldValue =
// string|number|boolean) deliberately — see context/ARCH_TRANSITION.md
// "Bespoke plan-form" entry. A future generic `repeater` field type retires
// this widget by collapsing it into a schema-driven FormContainer form.

interface PlanBenefitDraft {
  code: string;
  name: string;
  mandatory: boolean;
}

interface PlanExclusionDraft {
  code: string;
  name: string;
}

interface PlanProductDraft {
  productCode: string;
  productName: string;
  productType: string;
  benefits: PlanBenefitDraft[];
  exclusions: PlanExclusionDraft[];
}

interface PlanFormState {
  planNo: string;
  planName: string;
  rateCardFile: string;
  products: PlanProductDraft[];
  coverAmountFormula: AmountFormulaValue;
  freeCoverEnabled: boolean;
  freeCoverLimitFormula: AmountFormulaValue;
}

// rowData payload coming through useOverlayStore — set by PlanCard's Edit
// click or by an Add-plan trigger (`_mode: 'add'` or `'edit'`).
interface OverlayPlanPayload {
  _mode?: "edit" | "add";
  quoteId?: string;
  // existing plan fields when editing:
  planNo?: string;
  planName?: string;
  rateCardFile?: string;
  productsJson?: string;
  coverAmountFormulaJson?: string;
  freeCoverLimitFormulaJson?: string;
  products?: unknown;
  coverAmountFormula?: unknown;
  freeCoverLimitFormula?: unknown;
}

const PRODUCT_TYPES = ["TERM", "RIDER", "WAIVER", "OTHER"];
const FORM_OVERLAY_ID = "plan-edit-form";

const emptyFormula = (): AmountFormulaValue => ({ type: "FIXED", fixedAmount: undefined });

const emptyProduct = (): PlanProductDraft => ({
  productCode: "",
  productName: "",
  productType: "TERM",
  benefits: [],
  exclusions: [],
});

function tryParse<T>(v: unknown): T | null {
  if (v == null) return null;
  if (typeof v === "object") return v as T;
  if (typeof v !== "string" || v.length === 0) return null;
  try {
    return JSON.parse(v) as T;
  } catch {
    return null;
  }
}

function normalizeProducts(input: unknown): PlanProductDraft[] {
  const arr = Array.isArray(input) ? input : tryParse<unknown[]>(input) ?? [];
  return arr.map((raw): PlanProductDraft => {
    const p = raw as Record<string, unknown>;
    const benefits = Array.isArray(p.benefits)
      ? (p.benefits as Record<string, unknown>[]).map((b) => ({
          code: String(b.code ?? ""),
          name: String(b.name ?? ""),
          mandatory: Boolean(b.mandatory),
        }))
      : [];
    const exclusions = Array.isArray(p.exclusions)
      ? (p.exclusions as Record<string, unknown>[]).map((e) => ({
          code: String(e.code ?? ""),
          name: String(e.name ?? ""),
        }))
      : [];
    return {
      productCode: String(p.productCode ?? ""),
      productName: String(p.productName ?? ""),
      productType: String(p.productType ?? "TERM"),
      benefits,
      exclusions,
    };
  });
}

function normalizeFormula(input: unknown): AmountFormulaValue | null {
  const f = (typeof input === "object" && input !== null
    ? input
    : tryParse<unknown>(input)) as Record<string, unknown> | null;
  if (!f) return null;
  const type = f.type as AmountFormulaValue["type"] | undefined;
  if (!type) return null;
  return {
    type,
    multiplicationFactor:
      typeof f.multiplicationFactor === "number" ? f.multiplicationFactor : undefined,
    memberAttributeName:
      typeof f.memberAttributeName === "string" ? f.memberAttributeName : undefined,
    lookupTableJson:
      typeof f.lookupTableJson === "string" ? f.lookupTableJson : undefined,
    fixedAmount: typeof f.fixedAmount === "number" ? f.fixedAmount : undefined,
    dmnTableFile: typeof f.dmnTableFile === "string" ? f.dmnTableFile : undefined,
  };
}

function buildInitialState(payload: OverlayPlanPayload | undefined): PlanFormState {
  if (!payload || payload._mode === "add") {
    return {
      planNo: "",
      planName: "",
      rateCardFile: "",
      products: [emptyProduct()],
      coverAmountFormula: emptyFormula(),
      freeCoverEnabled: false,
      freeCoverLimitFormula: emptyFormula(),
    };
  }
  const products = normalizeProducts(payload.products ?? payload.productsJson);
  const cover =
    normalizeFormula(payload.coverAmountFormula ?? payload.coverAmountFormulaJson) ??
    emptyFormula();
  const fcl = normalizeFormula(
    payload.freeCoverLimitFormula ?? payload.freeCoverLimitFormulaJson,
  );
  return {
    planNo: payload.planNo ?? "",
    planName: payload.planName ?? "",
    rateCardFile: payload.rateCardFile ?? "",
    products: products.length > 0 ? products : [emptyProduct()],
    coverAmountFormula: cover,
    freeCoverEnabled: fcl != null,
    freeCoverLimitFormula: fcl ?? emptyFormula(),
  };
}

interface FormErrors {
  planNo?: string;
  rateCardFile?: string;
  products?: string;
  coverAmountFormula?: string;
  freeCoverLimitFormula?: string;
}

function validateFormula(f: AmountFormulaValue): string | null {
  switch (f.type) {
    case "MULTIPLE_OF_MEMBER_ATTRIBUTE":
      if (!f.memberAttributeName) return "Member attribute is required";
      if (f.multiplicationFactor == null || Number(f.multiplicationFactor) <= 0)
        return "Multiplication factor must be positive";
      return null;
    case "LOOKUP_ON_MEMBER_ATTRIBUTE":
      if (!f.memberAttributeName) return "Member attribute is required";
      if (!f.lookupTableJson) return "Lookup table reference is required";
      return null;
    case "FIXED":
      if (f.fixedAmount == null || Number(f.fixedAmount) <= 0)
        return "Fixed amount must be positive";
      return null;
    case "DMN_TABLE":
      if (!f.dmnTableFile) return "DMN table file is required";
      return null;
    default:
      return "Formula type required";
  }
}

function validate(state: PlanFormState): FormErrors {
  const errors: FormErrors = {};
  if (!state.planNo.trim()) errors.planNo = "Plan number is required";
  if (!state.rateCardFile.trim()) errors.rateCardFile = "Rate card file is required";
  if (state.products.length === 0) {
    errors.products = "At least one product is required";
  } else {
    const productIssues = state.products
      .map((p, i) => {
        if (!p.productCode.trim()) return `Product ${i + 1}: code required`;
        if (!p.productType.trim()) return `Product ${i + 1}: type required`;
        if (p.benefits.length === 0) return `Product ${i + 1}: at least one benefit required`;
        const benefitIssue = p.benefits.find((b) => !b.code.trim());
        if (benefitIssue) return `Product ${i + 1}: benefit code required`;
        const exclusionIssue = p.exclusions.find((e) => !e.code.trim());
        if (exclusionIssue) return `Product ${i + 1}: exclusion code required`;
        return null;
      })
      .filter((m): m is string => m != null);
    if (productIssues.length > 0) errors.products = productIssues.join("; ");
  }
  const coverIssue = validateFormula(state.coverAmountFormula);
  if (coverIssue) errors.coverAmountFormula = coverIssue;
  if (state.freeCoverEnabled) {
    const fclIssue = validateFormula(state.freeCoverLimitFormula);
    if (fclIssue) errors.freeCoverLimitFormula = fclIssue;
  }
  return errors;
}

function serializeFormula(f: AmountFormulaValue) {
  return {
    type: f.type,
    multiplicationFactor:
      f.multiplicationFactor != null && f.multiplicationFactor !== ""
        ? Number(f.multiplicationFactor)
        : undefined,
    memberAttributeName: f.memberAttributeName || undefined,
    lookupTableJson: f.lookupTableJson || undefined,
    fixedAmount:
      f.fixedAmount != null && f.fixedAmount !== ""
        ? Number(f.fixedAmount)
        : undefined,
    dmnTableFile: f.dmnTableFile || undefined,
  };
}

export const PlanForm: React.FC = () => {
  const params = useParams<{ id?: string }>();
  const dispatch = useActionHandler();
  const closeOverlay = useOverlayStore((s) => s.close);
  const overlayPayload = useOverlayStore(
    (s) => s.openOverlays[FORM_OVERLAY_ID]?.data as OverlayPlanPayload | undefined,
  );

  const isEdit = overlayPayload?._mode === "edit" || Boolean(overlayPayload?.planNo);
  const quoteId = overlayPayload?.quoteId ?? params?.id;

  const [state, setState] = useState<PlanFormState>(() => buildInitialState(overlayPayload));
  const [submitting, setSubmitting] = useState(false);
  const errors = useMemo(() => validate(state), [state]);
  const isValid = Object.keys(errors).length === 0;

  const update = (patch: Partial<PlanFormState>) => setState((prev) => ({ ...prev, ...patch }));

  const setProduct = (idx: number, patch: Partial<PlanProductDraft>) =>
    setState((prev) => ({
      ...prev,
      products: prev.products.map((p, i) => (i === idx ? { ...p, ...patch } : p)),
    }));

  const addProduct = () =>
    setState((prev) => ({ ...prev, products: [...prev.products, emptyProduct()] }));

  const removeProduct = (idx: number) =>
    setState((prev) => ({
      ...prev,
      products: prev.products.filter((_, i) => i !== idx),
    }));

  const addBenefit = (productIdx: number) =>
    setProduct(productIdx, {
      benefits: [
        ...state.products[productIdx].benefits,
        { code: "", name: "", mandatory: false },
      ],
    });

  const setBenefit = (
    productIdx: number,
    benefitIdx: number,
    patch: Partial<PlanBenefitDraft>,
  ) =>
    setProduct(productIdx, {
      benefits: state.products[productIdx].benefits.map((b, i) =>
        i === benefitIdx ? { ...b, ...patch } : b,
      ),
    });

  const removeBenefit = (productIdx: number, benefitIdx: number) =>
    setProduct(productIdx, {
      benefits: state.products[productIdx].benefits.filter((_, i) => i !== benefitIdx),
    });

  const addExclusion = (productIdx: number) =>
    setProduct(productIdx, {
      exclusions: [...state.products[productIdx].exclusions, { code: "", name: "" }],
    });

  const setExclusion = (
    productIdx: number,
    exclusionIdx: number,
    patch: Partial<PlanExclusionDraft>,
  ) =>
    setProduct(productIdx, {
      exclusions: state.products[productIdx].exclusions.map((e, i) =>
        i === exclusionIdx ? { ...e, ...patch } : e,
      ),
    });

  const removeExclusion = (productIdx: number, exclusionIdx: number) =>
    setProduct(productIdx, {
      exclusions: state.products[productIdx].exclusions.filter((_, i) => i !== exclusionIdx),
    });

  const onSubmit = async () => {
    if (!isValid || !quoteId) return;
    setSubmitting(true);
    try {
      const body = {
        planNo: state.planNo,
        planName: state.planName || undefined,
        rateCardFile: state.rateCardFile,
        products: state.products.map((p) => ({
          productCode: p.productCode,
          productName: p.productName || undefined,
          productType: p.productType,
          benefits: p.benefits.map((b) => ({
            code: b.code,
            name: b.name || undefined,
            mandatory: b.mandatory,
          })),
          exclusions: p.exclusions.map((e) => ({
            code: e.code,
            name: e.name || undefined,
          })),
        })),
        coverAmountFormula: serializeFormula(state.coverAmountFormula),
        freeCoverLimitFormula: state.freeCoverEnabled
          ? serializeFormula(state.freeCoverLimitFormula)
          : undefined,
      };

      const endpoint = isEdit
        ? `/api/quotation/quotes/${quoteId}/plans/${encodeURIComponent(state.planNo)}`
        : `/api/quotation/quotes/${quoteId}/plans`;

      await dispatch({
        id: isEdit ? "submit-edit-plan" : "submit-add-plan",
        type: "api-mutation",
        api: { endpoint, method: isEdit ? "PUT" : "POST", body },
        refreshKey: `/api/quotation/quotes/${quoteId}`,
        successMessage: isEdit ? `Plan ${state.planNo} updated` : `Plan ${state.planNo} added`,
        onSuccess: [{ type: "trigger-event", target: FORM_OVERLAY_ID }],
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold">
          {isEdit ? `Edit plan ${state.planNo}` : "Add plan"}
        </h2>
        <p className="text-sm text-muted-foreground">
          Plans drive premium calculation. All edits require Quote to be in DRAFT and
          the Census file format to be set.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label htmlFor="plan-no">Plan number</Label>
          <Input
            id="plan-no"
            value={state.planNo}
            onChange={(e) => update({ planNo: e.target.value })}
            disabled={isEdit}
            placeholder="01"
          />
          {errors.planNo && <p className="mt-1 text-xs text-destructive">{errors.planNo}</p>}
        </div>
        <div>
          <Label htmlFor="plan-name">Plan name</Label>
          <Input
            id="plan-name"
            value={state.planName}
            onChange={(e) => update({ planName: e.target.value })}
            placeholder="Executive"
          />
        </div>
      </div>

      <div>
        <Label htmlFor="rate-card">Rate card file</Label>
        <Input
          id="rate-card"
          value={state.rateCardFile}
          onChange={(e) => update({ rateCardFile: e.target.value })}
          placeholder="ratecard-2026-exec.csv"
        />
        {errors.rateCardFile && (
          <p className="mt-1 text-xs text-destructive">{errors.rateCardFile}</p>
        )}
      </div>

      <section>
        <div className="mb-2 flex items-center justify-between">
          <h3 className="text-sm font-semibold">Products</h3>
          <Button type="button" size="sm" variant="outline" onClick={addProduct}>
            <Plus className="mr-1 h-3.5 w-3.5" />
            Add product
          </Button>
        </div>
        {errors.products && <p className="mb-2 text-xs text-destructive">{errors.products}</p>}
        <div className="space-y-3">
          {state.products.map((p, pi) => (
            <div key={pi} className="rounded border border-border/60 p-3">
              <div className="mb-2 flex items-center justify-between">
                <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  Product {pi + 1}
                </span>
                {state.products.length > 1 && (
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    onClick={() => removeProduct(pi)}
                  >
                    <X className="h-3.5 w-3.5" />
                  </Button>
                )}
              </div>
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <Label className="text-xs">Code</Label>
                  <Input
                    value={p.productCode}
                    onChange={(e) => setProduct(pi, { productCode: e.target.value })}
                    placeholder="LIFE"
                  />
                </div>
                <div>
                  <Label className="text-xs">Name</Label>
                  <Input
                    value={p.productName}
                    onChange={(e) => setProduct(pi, { productName: e.target.value })}
                    placeholder="Group Term Life"
                  />
                </div>
                <div>
                  <Label className="text-xs">Type</Label>
                  <Select
                    value={p.productType}
                    onValueChange={(v) => setProduct(pi, { productType: v })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Type" />
                    </SelectTrigger>
                    <SelectContent>
                      {PRODUCT_TYPES.map((t) => (
                        <SelectItem key={t} value={t}>
                          {t}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="mt-3">
                <div className="mb-1 flex items-center justify-between">
                  <Label className="text-xs">Benefits</Label>
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    onClick={() => addBenefit(pi)}
                  >
                    <Plus className="mr-1 h-3 w-3" />
                    Add benefit
                  </Button>
                </div>
                <div className="space-y-1.5">
                  {p.benefits.map((b, bi) => (
                    <div key={bi} className="flex items-center gap-2">
                      <Input
                        className="flex-1"
                        value={b.code}
                        onChange={(e) => setBenefit(pi, bi, { code: e.target.value })}
                        placeholder="DEATH"
                      />
                      <Input
                        className="flex-1"
                        value={b.name}
                        onChange={(e) => setBenefit(pi, bi, { name: e.target.value })}
                        placeholder="Death cover"
                      />
                      <label className="flex shrink-0 items-center gap-1 text-xs">
                        <input
                          type="checkbox"
                          checked={b.mandatory}
                          onChange={(e) =>
                            setBenefit(pi, bi, { mandatory: e.target.checked })
                          }
                          className="h-4 w-4"
                        />
                        Mandatory
                      </label>
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        onClick={() => removeBenefit(pi, bi)}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  ))}
                  {p.benefits.length === 0 && (
                    <p className="text-xs text-muted-foreground">No benefits added.</p>
                  )}
                </div>
              </div>

              <div className="mt-3">
                <div className="mb-1 flex items-center justify-between">
                  <Label className="text-xs">Exclusions</Label>
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    onClick={() => addExclusion(pi)}
                  >
                    <Plus className="mr-1 h-3 w-3" />
                    Add exclusion
                  </Button>
                </div>
                <div className="space-y-1.5">
                  {p.exclusions.map((e, ei) => (
                    <div key={ei} className="flex items-center gap-2">
                      <Input
                        className="flex-1"
                        value={e.code}
                        onChange={(ev) => setExclusion(pi, ei, { code: ev.target.value })}
                        placeholder="WAR"
                      />
                      <Input
                        className="flex-1"
                        value={e.name}
                        onChange={(ev) => setExclusion(pi, ei, { name: ev.target.value })}
                        placeholder="War risk"
                      />
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        onClick={() => removeExclusion(pi, ei)}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  ))}
                  {p.exclusions.length === 0 && (
                    <p className="text-xs text-muted-foreground">No exclusions.</p>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section>
        <h3 className="mb-2 text-sm font-semibold">Cover formula</h3>
        <AmountFormulaField
          value={state.coverAmountFormula}
          onChange={(v) => update({ coverAmountFormula: v })}
        />
        {errors.coverAmountFormula && (
          <p className="mt-1 text-xs text-destructive">{errors.coverAmountFormula}</p>
        )}
      </section>

      <section>
        <label className="mb-2 flex items-center gap-2 text-sm font-semibold">
          <input
            type="checkbox"
            checked={state.freeCoverEnabled}
            onChange={(e) => update({ freeCoverEnabled: e.target.checked })}
            className="h-4 w-4"
          />
          Configure free cover limit formula
        </label>
        {state.freeCoverEnabled && (
          <>
            <AmountFormulaField
              value={state.freeCoverLimitFormula}
              onChange={(v) => update({ freeCoverLimitFormula: v })}
            />
            {errors.freeCoverLimitFormula && (
              <p className="mt-1 text-xs text-destructive">{errors.freeCoverLimitFormula}</p>
            )}
          </>
        )}
      </section>

      <div className="flex justify-end gap-2 border-t border-border/60 pt-4">
        <Button type="button" variant="outline" onClick={() => closeOverlay(FORM_OVERLAY_ID)}>
          Cancel
        </Button>
        <Button type="button" onClick={onSubmit} disabled={!isValid || submitting || !quoteId}>
          {submitting ? "Saving…" : isEdit ? "Save plan" : "Add plan"}
        </Button>
      </div>
    </div>
  );
};
