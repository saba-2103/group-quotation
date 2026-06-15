"use client";

import React, { useMemo } from "react";
import { Pencil, Trash2, FileText, Star } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { useRole } from "@/hooks/useRole";
import { useActionHandler } from "@/hooks/useActionHandler";

// DSL canonical shapes (docs/spec/common/CommonData.data). The wire delivers
// `products`, `coverAmountFormula`, `freeCoverLimitFormula` as stringified JSON
// (productsJson, etc.) — we parse on render.

interface PlanBenefit {
  code: string;
  name?: string;
  mandatory?: boolean;
}

interface PlanExclusion {
  code: string;
  name?: string;
}

interface PlanProduct {
  productCode: string;
  productName?: string;
  productType?: string;
  benefits?: PlanBenefit[];
  exclusions?: PlanExclusion[];
}

type AmountFormulaType =
  | "MULTIPLE_OF_MEMBER_ATTRIBUTE"
  | "LOOKUP_ON_MEMBER_ATTRIBUTE"
  | "FIXED"
  | "DMN_TABLE";

interface AmountFormula {
  type: AmountFormulaType;
  multiplicationFactor?: number;
  memberAttributeName?: string;
  lookupTableJson?: string;
  fixedAmount?: number;
  dmnTableFile?: string;
}

interface PlanItem {
  planNo: string;
  planName?: string;
  rateCardFile?: string;
  // OpenAPI wire shape — stringified JSON for the three composite fields:
  productsJson?: string;
  coverAmountFormulaJson?: string;
  freeCoverLimitFormulaJson?: string;
  // DSL native shape (if ever returned typed):
  products?: PlanProduct[];
  coverAmountFormula?: AmountFormula;
  freeCoverLimitFormula?: AmountFormula | null;
}

interface QuoteParent {
  id?: string;
  status?: string;
  censusFileFormatJson?: string | null;
  censusFileFormat?: unknown;
}

interface PlanCardProps {
  item: PlanItem;
  parent?: QuoteParent;
  quoteId?: string;
}

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

function formatFormula(formula: AmountFormula | null | undefined): string {
  if (!formula) return "(not configured)";
  switch (formula.type) {
    case "MULTIPLE_OF_MEMBER_ATTRIBUTE": {
      const factor = formula.multiplicationFactor;
      const attr = formula.memberAttributeName ?? "?";
      return factor != null ? `${factor} × ${attr}` : `multiple of ${attr}`;
    }
    case "LOOKUP_ON_MEMBER_ATTRIBUTE":
      return `lookup on ${formula.memberAttributeName ?? "?"}`;
    case "FIXED":
      return formula.fixedAmount != null
        ? `Fixed: ${new Intl.NumberFormat("en-IN", {
            style: "currency",
            currency: "INR",
            maximumFractionDigits: 0,
          }).format(formula.fixedAmount)}`
        : "Fixed (amount unset)";
    case "DMN_TABLE":
      return `DMN: ${formula.dmnTableFile ?? "(no file)"}`;
    default:
      return String((formula as { type?: string }).type ?? "unknown");
  }
}

function hasCensusFileFormat(parent?: QuoteParent): boolean {
  if (!parent) return true; // be permissive when context is unknown
  if (parent.censusFileFormat && typeof parent.censusFileFormat === "object") return true;
  const blob = parent.censusFileFormatJson;
  if (!blob) return false;
  if (typeof blob === "string" && blob.length > 0 && blob !== "null") return true;
  return false;
}

export const PlanCard: React.FC<PlanCardProps & { config?: { props?: PlanCardProps } }> = (incoming) => {
  // Read from flattened props (set by WidgetRenderer / CardGrid) with config
  // fallback for direct WidgetRenderer use.
  const flat = incoming as PlanCardProps;
  const nested = incoming.config?.props;
  const item = flat.item ?? nested?.item;
  const parent = flat.parent ?? nested?.parent;
  const quoteId = flat.quoteId ?? nested?.quoteId ?? parent?.id;

  const { role } = useRole();
  const dispatch = useActionHandler();

  const products = useMemo<PlanProduct[] | null>(
    () => item?.products ?? tryParse<PlanProduct[]>(item?.productsJson),
    [item?.products, item?.productsJson],
  );
  const coverFormula = useMemo<AmountFormula | null>(
    () => item?.coverAmountFormula ?? tryParse<AmountFormula>(item?.coverAmountFormulaJson),
    [item?.coverAmountFormula, item?.coverAmountFormulaJson],
  );
  const fclFormula = useMemo<AmountFormula | null>(
    () => item?.freeCoverLimitFormula ?? tryParse<AmountFormula>(item?.freeCoverLimitFormulaJson),
    [item?.freeCoverLimitFormula, item?.freeCoverLimitFormulaJson],
  );

  if (!item) {
    return (
      <Card>
        <CardContent className="p-4 text-sm text-muted-foreground">
          plan-card: missing `item` prop
        </CardContent>
      </Card>
    );
  }

  const isDraft = parent?.status === "DRAFT";
  const canEditPlans = (role as string) === "sales";
  const fileFormatSet = hasCensusFileFormat(parent);
  const editEnabled = isDraft && canEditPlans && fileFormatSet;
  const editDisabledReason = !isDraft
    ? "Plans are read-only outside DRAFT"
    : !canEditPlans
      ? "Only Sales can edit plans"
      : !fileFormatSet
        ? "Set the Census file format first (Census tab)"
        : "";

  const handleEdit = () => {
    dispatch(
      { id: "edit-plan", type: "open-modal", target: "plan-edit-form", size: "3xl" },
      { ...item, quoteId, _mode: "edit" },
    );
  };

  const handleDelete = () => {
    if (!quoteId) return;
    dispatch(
      {
        id: "delete-plan",
        type: "api-mutation",
        api: {
          endpoint: `/api/quotation/quotes/${quoteId}/plans/${encodeURIComponent(item.planNo)}`,
          method: "DELETE",
        },
        confirm: {
          title: `Delete plan ${item.planNo}?`,
          message:
            "Removing a plan also clears its census headcount allocation. Continue?",
        },
        refreshKey: `/api/quotation/quotes/${quoteId}`,
        successMessage: `Plan ${item.planNo} deleted`,
      },
    );
  };

  return (
    <Card className="overflow-hidden">
      <CardHeader className="flex flex-row items-start justify-between gap-3 pb-3">
        <div className="min-w-0">
          <div className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Plan {item.planNo}
          </div>
          <div className="truncate text-base font-semibold text-foreground">
            {item.planName ?? "(unnamed plan)"}
          </div>
        </div>
        {isDraft && canEditPlans && (
          <div className="flex shrink-0 items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={handleEdit}
              disabled={!editEnabled}
              title={editEnabled ? "Edit plan" : editDisabledReason}
            >
              <Pencil className="mr-1 h-3.5 w-3.5" />
              Edit
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={handleDelete}
              title="Delete plan"
              className="text-destructive hover:bg-destructive/10"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        )}
      </CardHeader>

      <CardContent className="space-y-4 pt-0 text-sm">
        <section>
          <div className="mb-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Products
          </div>
          {products && products.length > 0 ? (
            <ul className="space-y-3">
              {products.map((p, i) => (
                <li key={`${p.productCode}-${i}`} className="rounded border border-border/60 p-3">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold">{p.productCode}</span>
                    {p.productName && (
                      <span className="text-muted-foreground">— {p.productName}</span>
                    )}
                    {p.productType && (
                      <Badge variant="outline" className="ml-auto">
                        {p.productType}
                      </Badge>
                    )}
                  </div>
                  {p.benefits && p.benefits.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      <span className="text-xs text-muted-foreground">Benefits:</span>
                      {p.benefits.map((b, bi) => (
                        <Badge
                          key={`${b.code}-${bi}`}
                          variant={b.mandatory ? "info" : "secondary"}
                          className="gap-1"
                        >
                          {b.mandatory && <Star className="h-3 w-3 fill-current" />}
                          {b.code}
                          {b.name ? ` · ${b.name}` : ""}
                        </Badge>
                      ))}
                    </div>
                  )}
                  {p.exclusions && p.exclusions.length > 0 && (
                    <div className="mt-1.5 flex flex-wrap gap-1.5">
                      <span className="text-xs text-muted-foreground">Exclusions:</span>
                      {p.exclusions.map((e, ei) => (
                        <Badge
                          key={`${e.code}-${ei}`}
                          variant="grey"
                          className="font-normal"
                        >
                          {e.code}
                          {e.name ? ` · ${e.name}` : ""}
                        </Badge>
                      ))}
                    </div>
                  )}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-muted-foreground">No products configured.</p>
          )}
        </section>

        <section className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <div className="mb-1 text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Cover formula
            </div>
            <div className="font-medium">{formatFormula(coverFormula)}</div>
            {coverFormula?.type && (
              <div className="text-xs text-muted-foreground">{coverFormula.type}</div>
            )}
          </div>
          <div>
            <div className="mb-1 text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Free cover limit
            </div>
            <div className="font-medium">{formatFormula(fclFormula)}</div>
            {fclFormula?.type && (
              <div className="text-xs text-muted-foreground">{fclFormula.type}</div>
            )}
          </div>
        </section>

        {item.rateCardFile && (
          <section>
            <div className="mb-1 text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Rate card
            </div>
            <div className="inline-flex items-center gap-1.5 rounded border border-border/60 bg-muted/30 px-2 py-1 font-mono text-xs">
              <FileText className="h-3.5 w-3.5 text-muted-foreground" />
              {item.rateCardFile}
            </div>
          </section>
        )}
      </CardContent>
    </Card>
  );
};
