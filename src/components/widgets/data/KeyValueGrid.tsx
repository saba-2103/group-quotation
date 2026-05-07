import React from "react";
import { WidgetConfig } from "@/types/widget";
import { useSmartQuery } from "@/hooks/useSmartQuery";
import { KeyValueGridWidgetProps, ApiResponseData, DataRecord, KeyValueField, FieldValue, BadgeValueMapping } from "./types";
import { Badge } from "@/components/ui/badge";
import { LoadingState } from "@/components/ui/loading-state";
import { ErrorState } from "@/components/ui/error-state";
import { DateDisplay } from "@/components/widgets/controls/dateWidget/DateDisplay";
import { BADGE_COLOR_TO_VARIANT } from "./DataTable/constants";

// Walks dotted accessor keys (e.g. "estimatedPremium.totalAmount") so the
// schema can pull nested DTO fields without flattening.
function getNested(source: unknown, path: string): unknown {
  if (source == null || !path) return undefined;
  return path
    .split('.')
    .reduce<unknown>(
      (acc, key) =>
        acc != null && typeof acc === 'object' && key in (acc as object)
          ? (acc as Record<string, unknown>)[key]
          : undefined,
      source,
    );
}

function isEmpty(v: unknown): boolean {
  if (v === null || v === undefined) return true;
  if (typeof v === 'string') return v.length === 0 || v === 'null';
  if (Array.isArray(v)) return v.length === 0;
  if (typeof v === 'object') return Object.keys(v as object).length === 0;
  return false;
}

function renderFieldValue(field: KeyValueField, value: unknown): React.ReactNode {
  // `presence` — render Configured / Not configured chip based on whether
  // the source has a meaningful value. Used for opaque blobs (DMN ref,
  // census-format JSON) where the demo just needs a "is it set" signal.
  if (field.type === "presence") {
    return isEmpty(value) ? (
      <Badge variant="grey">Not configured</Badge>
    ) : (
      <Badge variant="success">Configured</Badge>
    );
  }

  if (value === null || value === undefined) {
    return <span className="text-muted-foreground">—</span>;
  }

  switch (field.type) {
    case "badge": {
      const badgeMapping: BadgeValueMapping | undefined = field.valueMapping?.find(
        (m) => m.value === String(value)
      );
      const resolvedVariant =
        badgeMapping?.variant ??
        BADGE_COLOR_TO_VARIANT[badgeMapping?.color ?? ""] ??
        "outline";
      return (
        <Badge variant={resolvedVariant as Parameters<typeof Badge>[0]["variant"]}>
          {badgeMapping?.label ?? String(value)}
        </Badge>
      );
    }
    case "date":
      return <DateDisplay value={String(value)} />;
    case "currency": {
      const num = Number(value);
      if (Number.isNaN(num)) return <span>{String(value)}</span>;
      const currency = (field as { currency?: string }).currency ?? "INR";
      return (
        <span>
          {new Intl.NumberFormat("en-IN", {
            style: "currency",
            currency,
            maximumFractionDigits: 0,
          }).format(num)}
        </span>
      );
    }
    case "count": {
      const arr = Array.isArray(value) ? value : null;
      const n = arr ? arr.length : Number(value) || 0;
      return (
        <span>
          {n} {n === 1 ? (field as { unit?: string }).unit ?? "item" : (field as { unitPlural?: string }).unitPlural ?? `${(field as { unit?: string }).unit ?? "items"}`}
        </span>
      );
    }
    default:
      // Empty strings render as "—" so a blank field reads consistently with
      // null/undefined ones.
      if (typeof value === "string" && value.length === 0) {
        return <span className="text-muted-foreground">—</span>;
      }
      // Objects / arrays without an explicit type render as "—" rather than
      // dumping JSON. Schemas should declare a type for non-scalar values.
      if (typeof value === "object") {
        return <span className="text-muted-foreground">—</span>;
      }
      return <span>{String(value)}</span>;
  }
}

export const KeyValueGrid: React.FC<{ config: WidgetConfig }> = ({ config }) => {
  const { props = {}, dataSource } = config;
  const {
    fields = [],
    columns = 4,
    loadingMessage = "Loading",
    errorMessage = "Failed to load data",
    data: propsData,
    isLoading: propsLoading,
    error: propsError,
  } = props as KeyValueGridWidgetProps;

  const {
    data: queryData,
    isLoading: queryIsLoading,
    error: queryError
  } = useSmartQuery(propsData == null ? dataSource : undefined);

  const isLoading = propsLoading ?? queryIsLoading;
  const error = propsError ?? queryError;

  if (isLoading) return <LoadingState message={loadingMessage} />;
  if (error) return <ErrorState message={errorMessage} />;

  const rawData = propsData ?? (queryData as ApiResponseData | null) ?? undefined;
  const nestedValue = dataSource?.valueKey && rawData ? rawData[dataSource.valueKey] : undefined;
  const sourceData: DataRecord | undefined =
    nestedValue !== null && nestedValue !== undefined && typeof nestedValue === "object"
      ? nestedValue
      : (rawData as DataRecord | undefined);

  return (
    <div
      className="grid gap-6 p-6 bg-card rounded-lg border border-border/80 shadow-sm transition-all duration-200 hover:shadow-md hover:border-border animate-in fade-in slide-in-from-bottom-1 duration-300"
      style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}
    >
      {fields.map((field: KeyValueField) => {
        const value = getNested(sourceData, field.accessorKey);

        return (
          <div key={field.id} className="flex flex-col space-y-1.5">
            <div className="flex items-center text-xs text-muted-foreground space-x-1.5 font-medium uppercase tracking-wider">
              <span>{field.label}</span>
            </div>
            <div className="text-sm font-semibold text-foreground">
              {renderFieldValue(field, value)}
            </div>
          </div>
        );
      })}
    </div>
  );
};
