"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { ChevronDown, Plus, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
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
import * as productCatalog from "@/lib/api/productCatalog";
import type {
  AmountFormula,
  Plan,
  PlanBenefit,
  PlanExclusion,
  PlanProduct,
} from "@/types/group-pas/common";
import {
  AmountFormulaField,
  type AmountFormulaValue,
} from "./AmountFormulaField";

// PlanForm — structured editor for a Quote `Plan` (DSL shape in
// docs/spec/common/CommonData.data). PROP-0014 reworked this from raw-JSON
// textareas to a compose flow driven by the Product Catalog
// (/api/product-catalog/{plans,products,benefits}). Per
// context/ARCH_TRANSITION.md "Bespoke plan-form" entry, this widget lives
// outside the scalar-only FormContainer until a future schema-driven
// `repeater` field type retires it.

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

interface OverlayPlanPayload {
  _mode?: "edit" | "add";
  quoteId?: string;
  id?: string;
  planNo?: string;
  planName?: string;
  rateCardFile?: string;
  productsJson?: string;
  coverAmountFormulaJson?: string;
  freeCoverLimitFormulaJson?: string;
  products?: unknown;
  coverAmountFormula?: unknown;
  freeCoverLimitFormula?: unknown;
  // Parent quote fields the ActionBar passes through as rowData. We only
  // read `censusFileFormat` to gate submit per the backend constraint
  // (POST /quotes/{id}/plans rejects when the format is unset).
  censusFileFormat?: unknown;
  censusFileFormatJson?: unknown;
}

function hasCensusFileFormat(payload: OverlayPlanPayload | undefined): boolean {
  if (!payload) return true; // edit-only path or missing context — don't over-block
  if (payload.censusFileFormat && typeof payload.censusFileFormat === "object") return true;
  const blob = payload.censusFileFormatJson;
  if (!blob) return false;
  if (typeof blob === "string" && blob.length > 0 && blob !== "null") return true;
  return false;
}

const FORM_OVERLAY_ID = "plan-edit-form";

const emptyFormula = (): AmountFormulaValue => ({ type: "FIXED", fixedAmount: undefined });

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

function benefitToDraft(b: PlanBenefit): PlanBenefitDraft {
  return { code: b.code, name: b.name ?? "", mandatory: b.mandatory };
}

function exclusionToDraft(e: PlanExclusion): PlanExclusionDraft {
  return { code: e.code, name: e.name ?? "" };
}

function productToDraft(p: PlanProduct): PlanProductDraft {
  return {
    productCode: p.productCode,
    productName: p.productName ?? "",
    productType: p.productType,
    benefits: p.benefits.map(benefitToDraft),
    exclusions: p.exclusions.map(exclusionToDraft),
  };
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
      productType: String(p.productType ?? "BASE"),
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

function formulaToValue(f: AmountFormula): AmountFormulaValue {
  return {
    type: f.type,
    multiplicationFactor: f.multiplicationFactor,
    memberAttributeName: f.memberAttributeName,
    lookupTableJson: f.lookupTableJson,
    fixedAmount: f.fixedAmount,
    dmnTableFile: f.dmnTableFile,
  };
}

function buildInitialState(payload: OverlayPlanPayload | undefined): PlanFormState {
  if (!payload || payload._mode === "add") {
    return {
      planNo: "",
      planName: "",
      rateCardFile: "",
      products: [],
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
    products,
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
        if (p.benefits.length === 0) return `${p.productCode}: at least one benefit required`;
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

// Order BASE products before RIDER for the add-product dropdown.
function compareProducts(a: PlanProduct, b: PlanProduct) {
  if (a.productType === b.productType) return a.productCode.localeCompare(b.productCode);
  if (a.productType === "BASE") return -1;
  if (b.productType === "BASE") return 1;
  return a.productType.localeCompare(b.productType);
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
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [advancedJson, setAdvancedJson] = useState("");
  const [advancedError, setAdvancedError] = useState<string | null>(null);
  const [templateChoice, setTemplateChoice] = useState<string>("");
  const [productPicker, setProductPicker] = useState<string>("");

  const plansQuery = useQuery({
    queryKey: ["product-catalog", "plans"],
    queryFn: productCatalog.listPlans,
    staleTime: 5 * 60 * 1000,
  });
  const productsQuery = useQuery({
    queryKey: ["product-catalog", "products"],
    queryFn: productCatalog.listProducts,
    staleTime: 5 * 60 * 1000,
  });

  const errors = useMemo(() => validate(state), [state]);
  const isValid = Object.keys(errors).length === 0;

  // When the overlay payload changes (open/edit switching), rebuild state.
  useEffect(() => {
    setState(buildInitialState(overlayPayload));
    setTemplateChoice("");
    setProductPicker("");
    setAdvancedOpen(false);
    setAdvancedJson("");
    setAdvancedError(null);
  }, [overlayPayload]);

  const update = (patch: Partial<PlanFormState>) =>
    setState((prev) => ({ ...prev, ...patch }));

  const applyTemplate = (planNo: string) => {
    const tpl = plansQuery.data?.find((p) => p.planNo === planNo);
    if (!tpl) return;
    if (
      state.products.length > 0 &&
      !window.confirm("Replace current products with template?")
    ) {
      return;
    }
    setState((prev) => ({
      ...prev,
      // Don't overwrite a custom plan number; only seed it when blank or in edit-of-template
      planNo: prev.planNo || tpl.planNo,
      planName: prev.planName || tpl.planName || "",
      rateCardFile: tpl.rateCardFile,
      products: tpl.products.map(productToDraft),
      coverAmountFormula: formulaToValue(tpl.coverAmountFormula),
      freeCoverEnabled: !!tpl.freeCoverLimitFormula,
      freeCoverLimitFormula: tpl.freeCoverLimitFormula
        ? formulaToValue(tpl.freeCoverLimitFormula)
        : emptyFormula(),
    }));
    setTemplateChoice(planNo);
  };

  const addProductByCode = (code: string) => {
    const src = productsQuery.data?.find((p) => p.productCode === code);
    if (!src) return;
    if (state.products.some((p) => p.productCode === code)) return;
    setState((prev) => ({
      ...prev,
      products: [...prev.products, productToDraft(src)],
    }));
    setProductPicker("");
  };

  const removeProduct = (idx: number) =>
    setState((prev) => ({
      ...prev,
      products: prev.products.filter((_, i) => i !== idx),
    }));

  const removeBenefit = (productIdx: number, benefitIdx: number) =>
    setState((prev) => ({
      ...prev,
      products: prev.products.map((p, i) =>
        i === productIdx
          ? { ...p, benefits: p.benefits.filter((_, bi) => bi !== benefitIdx) }
          : p,
      ),
    }));

  const removeExclusion = (productIdx: number, exclusionIdx: number) =>
    setState((prev) => ({
      ...prev,
      products: prev.products.map((p, i) =>
        i === productIdx
          ? { ...p, exclusions: p.exclusions.filter((_, ei) => ei !== exclusionIdx) }
          : p,
      ),
    }));

  const applyAdvancedJson = () => {
    try {
      const parsed = JSON.parse(advancedJson);
      if (!Array.isArray(parsed)) throw new Error("Expected an array of products");
      const drafts = normalizeProducts(parsed);
      if (drafts.length === 0) throw new Error("Array must contain at least one product");
      setState((prev) => ({ ...prev, products: drafts }));
      setAdvancedError(null);
    } catch (e) {
      setAdvancedError(e instanceof Error ? e.message : "Invalid JSON");
    }
  };

  const onSubmit = async () => {
    if (!isValid || !quoteId) return;
    setSubmitting(true);
    try {
      const body: Plan = {
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
        coverAmountFormula: serializeFormula(state.coverAmountFormula) as AmountFormula,
        freeCoverLimitFormula: state.freeCoverEnabled
          ? (serializeFormula(state.freeCoverLimitFormula) as AmountFormula)
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

  const availableProducts = useMemo(() => {
    const taken = new Set(state.products.map((p) => p.productCode));
    return [...(productsQuery.data ?? [])]
      .filter((p) => !taken.has(p.productCode))
      .sort(compareProducts);
  }, [productsQuery.data, state.products]);

  const catalogUnavailable = plansQuery.isError && productsQuery.isError;
  const censusReady = hasCensusFileFormat(overlayPayload);
  const submitBlockReason = !censusReady
    ? "Set the Census file format on the Census tab before adding a plan."
    : null;

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold">
          {isEdit ? `Edit plan ${state.planNo}` : "Add plan"}
        </h2>
        <p className="text-sm text-muted-foreground">
          Compose a plan by picking a template or adding products from the catalog.
          All edits require Quote to be in DRAFT and the Census file format set.
        </p>
        {!censusReady && (
          <p
            data-testid="census-format-warning"
            className="mt-2 rounded-md border border-warning/40 bg-warning/10 p-2 text-xs text-warning-foreground"
          >
            Census file format is not set on this quote. The backend will reject
            the plan until you configure it on the Census tab.
          </p>
        )}
        {catalogUnavailable && (
          <p
            data-testid="catalog-unavailable"
            className="mt-2 rounded-md border border-warning/40 bg-warning/10 p-2 text-xs text-warning-foreground"
          >
            Product catalog is unavailable — you can still edit the rate card and
            cover formula, or paste a product list under Advanced.
          </p>
        )}
      </div>

      {!isEdit && (
        <section>
          <Label className="text-xs uppercase tracking-wider text-muted-foreground">
            Start from template
          </Label>
          <Select
            value={templateChoice}
            onValueChange={(v) => applyTemplate(v)}
            disabled={plansQuery.isLoading || plansQuery.isError}
          >
            <SelectTrigger data-testid="template-trigger" className="mt-1">
              <SelectValue
                placeholder={
                  plansQuery.isLoading
                    ? "Loading templates…"
                    : plansQuery.isError
                    ? "Templates unavailable"
                    : "Choose a starting template (optional)"
                }
              />
            </SelectTrigger>
            <SelectContent>
              {(plansQuery.data ?? []).map((p) => (
                <SelectItem key={p.planNo} value={p.planNo}>
                  {p.planNo} — {p.planName ?? "Untitled plan"}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="mt-1 text-xs text-muted-foreground">
            Picking a template seeds products, formulas, and rate card. You can edit
            anything after.
          </p>
        </section>
      )}

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

      <section>
        <div className="mb-2 flex items-center justify-between gap-3">
          <h3 className="text-sm font-semibold">Products</h3>
          <div className="flex items-center gap-2">
            <Select
              value={productPicker}
              onValueChange={(v) => addProductByCode(v)}
              disabled={
                productsQuery.isLoading ||
                productsQuery.isError ||
                availableProducts.length === 0
              }
            >
              <SelectTrigger
                data-testid="add-product-trigger"
                className="h-8 w-56 text-xs"
              >
                <SelectValue
                  placeholder={
                    productsQuery.isLoading
                      ? "Loading products…"
                      : productsQuery.isError
                      ? "Products unavailable"
                      : availableProducts.length === 0
                      ? "All products added"
                      : "Add product…"
                  }
                />
              </SelectTrigger>
              <SelectContent>
                {availableProducts.map((p) => (
                  <SelectItem key={p.productCode} value={p.productCode}>
                    [{p.productType}] {p.productCode} — {p.productName ?? ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        {errors.products && <p className="mb-2 text-xs text-destructive">{errors.products}</p>}
        {state.products.length === 0 && (
          <p
            data-testid="products-empty"
            className="rounded border border-dashed border-border/60 p-4 text-center text-xs text-muted-foreground"
          >
            No products yet. Pick a template or add a product from the catalog.
          </p>
        )}
        <div className="space-y-3">
          {state.products.map((p, pi) => (
            <div
              key={`${p.productCode}-${pi}`}
              data-testid={`product-card-${p.productCode}`}
              className="rounded border border-border/60 p-3"
            >
              <div className="mb-2 flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Badge variant={p.productType === "BASE" ? "default" : "secondary"}>
                    {p.productType}
                  </Badge>
                  <span className="text-sm font-medium">{p.productCode}</span>
                  {p.productName && (
                    <span className="text-xs text-muted-foreground">— {p.productName}</span>
                  )}
                </div>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  onClick={() => removeProduct(pi)}
                  aria-label={`Remove ${p.productCode}`}
                >
                  <X className="h-3.5 w-3.5" />
                </Button>
              </div>

              <div className="mt-2">
                <Label className="text-xs">Benefits</Label>
                <div className="mt-1 space-y-1">
                  {p.benefits.map((b, bi) => (
                    <div
                      key={b.code}
                      data-testid={`benefit-row-${b.code}`}
                      className="flex items-start justify-between gap-2 rounded bg-muted/40 px-2 py-1.5"
                    >
                      <div className="min-w-0">
                        <span className="font-mono text-xs">{b.code}</span>
                        {b.name && (
                          <span className="ml-2 text-xs text-muted-foreground">{b.name}</span>
                        )}
                      </div>
                      <div className="flex shrink-0 items-center gap-1">
                        {b.mandatory ? (
                          <Badge variant="outline" className="text-[10px]">
                            Mandatory
                          </Badge>
                        ) : (
                          <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            onClick={() => removeBenefit(pi, bi)}
                            aria-label={`Remove benefit ${b.code}`}
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                  {p.benefits.length === 0 && (
                    <p className="text-xs text-destructive">At least one benefit required.</p>
                  )}
                </div>
              </div>

              {p.exclusions.length > 0 && (
                <div className="mt-3">
                  <Label className="text-xs">Exclusions</Label>
                  <div className="mt-1 flex flex-wrap gap-1.5">
                    {p.exclusions.map((e, ei) => (
                      <Badge
                        key={e.code}
                        variant="outline"
                        className="gap-1 font-normal"
                        data-testid={`exclusion-chip-${e.code}`}
                      >
                        <span className="font-mono text-[10px]">{e.code}</span>
                        <button
                          type="button"
                          onClick={() => removeExclusion(pi, ei)}
                          aria-label={`Remove exclusion ${e.code}`}
                          className="ml-1 text-muted-foreground hover:text-foreground"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
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

      <div>
        <Label htmlFor="rate-card">Rate card file</Label>
        <Input
          id="rate-card"
          value={state.rateCardFile}
          onChange={(e) => update({ rateCardFile: e.target.value })}
          placeholder="rate-cards/gtl-standard-2026.dmn"
        />
        {errors.rateCardFile && (
          <p className="mt-1 text-xs text-destructive">{errors.rateCardFile}</p>
        )}
      </div>

      <details
        className="rounded border border-border/60"
        open={advancedOpen}
        onToggle={(e) => setAdvancedOpen((e.target as HTMLDetailsElement).open)}
      >
        <summary className="flex cursor-pointer items-center gap-2 px-3 py-2 text-xs font-medium text-muted-foreground">
          <ChevronDown className="h-3 w-3" />
          Advanced — paste product JSON (escape hatch for catalog gaps)
        </summary>
        <div className="space-y-2 border-t border-border/60 p-3">
          <p className="text-xs text-muted-foreground">
            Paste a JSON array of <code>PlanProduct</code> objects to replace the
            composed product list. Use this only if a needed product is not in the
            catalog.
          </p>
          <textarea
            value={advancedJson}
            onChange={(e) => setAdvancedJson(e.target.value)}
            className="h-32 w-full rounded border border-border/60 p-2 font-mono text-xs"
            placeholder='[{"productCode":"CUSTOM","productType":"BASE","benefits":[{"code":"X","mandatory":true}],"exclusions":[]}]'
          />
          {advancedError && (
            <p className="text-xs text-destructive">{advancedError}</p>
          )}
          <div className="flex items-center gap-2">
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={applyAdvancedJson}
              disabled={!advancedJson.trim()}
            >
              <Plus className="mr-1 h-3 w-3" /> Apply JSON
            </Button>
            <span className="text-xs text-muted-foreground">
              This replaces the current product list.
            </span>
          </div>
        </div>
      </details>

      <div className="flex justify-end gap-2 border-t border-border/60 pt-4">
        <Button type="button" variant="outline" onClick={() => closeOverlay(FORM_OVERLAY_ID)}>
          Cancel
        </Button>
        <Button
          type="button"
          onClick={onSubmit}
          disabled={!isValid || submitting || !quoteId || !censusReady}
          data-testid="plan-form-submit"
          title={submitBlockReason ?? undefined}
        >
          {submitting ? "Saving…" : isEdit ? "Save plan" : "Add plan"}
        </Button>
      </div>
    </div>
  );
};
