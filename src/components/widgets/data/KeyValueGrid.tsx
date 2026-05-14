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

// Best-effort JSON-string parse. Returns the original value if not a string
// or if parsing throws.
function tryParseJson(v: unknown): unknown {
  if (typeof v !== 'string' || v.length === 0) return v;
  try {
    return JSON.parse(v);
  } catch {
    return v;
  }
}

// Resolves a field's value from raw row data, applying parseJson / subPath /
// nestedParseAt transforms in order. Backend DTOs in this codebase serialize
// composite shapes as escaped JSON strings (productsJson, censusFileFormatJson,
// memberToPlanMappingJson) — these flags let schemas drill into them without a
// per-shape custom renderer.
function resolveFieldValue(field: KeyValueField, source: unknown): unknown {
  let value = getNested(source, field.accessorKey);
  if (
    field.fallbackKey &&
    (value === undefined || value === null || value === '')
  ) {
    value = getNested(source, field.fallbackKey);
  }
  if (field.parseJson) value = tryParseJson(value);
  if (field.subPath) value = getNested(value, field.subPath);
  if (field.nestedParseAt && value != null && typeof value === 'object') {
    const nested = getNested(value, field.nestedParseAt);
    const parsed = tryParseJson(nested);
    // Replace the nested string with its parsed form so downstream renderers
    // see a real object/array.
    if (parsed !== nested) {
      const segments = field.nestedParseAt.split('.');
      const last = segments.pop()!;
      const parent = segments.length
        ? (getNested(value, segments.join('.')) as Record<string, unknown> | null)
        : (value as Record<string, unknown>);
      if (parent && typeof parent === 'object') {
        (parent as Record<string, unknown>)[last] = parsed;
      }
    }
  }
  return value;
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
          {n} {n === 1 ? field.unit ?? "item" : field.unitPlural ?? `${field.unit ?? "items"}`}
        </span>
      );
    }
    case "list": {
      // Render arrays as a comma-separated inline string. If `itemPath` is
      // declared, drill that path inside each item; otherwise stringify.
      // Keeps long lists from blowing layout — wraps as plain text.
      if (!Array.isArray(value) || value.length === 0) {
        return <span className="text-muted-foreground">—</span>;
      }
      const formatted = value.map((item) => {
        if (field.itemPath) {
          const sub = getNested(item, field.itemPath);
          if (sub === undefined || sub === null || sub === "") return null;
          return String(sub);
        }
        if (typeof item === "object" || typeof item === "function") return null;
        return String(item);
      }).filter((s): s is string => s !== null);
      if (formatted.length === 0) return <span className="text-muted-foreground">—</span>;
      return <span>{formatted.join(", ")}</span>;
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
        const value = resolveFieldValue(field, sourceData);

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
