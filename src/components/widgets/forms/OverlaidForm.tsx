import React, { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { WidgetRenderer } from '@/components/registry/WidgetRenderer';
import { WidgetConfig } from '@/types/widget';
import { useOverlayStore } from '@/hooks/useOverlayStore';
import { substituteEndpointParams } from '@/lib/endpointUtils';

interface OverlaidFormProps {
    formId: string;
}

type FieldConfig = {
    name: string;
    defaultValue?: unknown;
    // Optional pre-fill source. When the form field's id doesn't directly map to
    // a top-level rowData key (e.g. the field is nested inside a stringified
    // JSON blob on the entity), declare `sourcePath` to read from a dotted path.
    // Set `sourceParseJson: true` to JSON.parse a string at the path before
    // drilling further (mirrors KeyValueGrid's parseJson + subPath pattern).
    sourcePath?: string;
    sourceParseJson?: boolean;
    sourceSubPath?: string;
    // Optional dropdown-options source from the parent rowData. Avoids a second
    // network round-trip when the modal already has the data it needs (e.g.
    // the DMN rules editor pulling plans off the open quote). Resolves to
    // `field.options: [{value,label}]` so the renderer treats them as static.
    optionsFromRowData?: {
        path: string;
        valueField: string;
        labelField: string;
    };
    options?: Array<{ value: string; label: string }>;
    [key: string]: unknown;
};
type SubmitActionConfig = {
    api?: { endpoint?: string; [key: string]: unknown };
    refreshKey?: string;
    [key: string]: unknown;
};

function getNested(source: unknown, path?: string): unknown {
    if (source == null || !path) return source;
    return path.split('.').reduce<unknown>(
        (acc, key) =>
            acc != null && typeof acc === 'object' && key in (acc as object)
                ? (acc as Record<string, unknown>)[key]
                : undefined,
        source,
    );
}

function resolvePreFill(field: FieldConfig, rowData: Record<string, unknown>): unknown {
    // Default: read by field name (existing behaviour for scalar forms).
    if (!field.sourcePath) return rowData[field.name];
    let value = getNested(rowData, field.sourcePath);
    if (field.sourceParseJson && typeof value === 'string' && value.length > 0) {
        try {
            value = JSON.parse(value);
        } catch {
            // leave as-is so the user can still edit the malformed blob
        }
    }
    if (field.sourceSubPath) value = getNested(value, field.sourceSubPath);
    return value;
}

// Exported for unit tests — covers the rowData-substitution contract
// (`:id` placeholders in `api.endpoint` and `refreshKey`, pre-fill from
// `sourcePath` + `sourceSubPath`).
function resolveOptions(
    field: FieldConfig,
    rowData: Record<string, unknown>,
): Array<{ value: string; label: string }> | undefined {
    const cfg = field.optionsFromRowData;
    if (!cfg) return field.options;
    const raw = getNested(rowData, cfg.path);
    if (!Array.isArray(raw)) return field.options;
    return raw
        .map((row) => {
            if (row == null || typeof row !== "object") return null;
            const r = row as Record<string, unknown>;
            const value = r[cfg.valueField];
            const label = r[cfg.labelField];
            if (value === undefined || value === null) return null;
            return {
                value: String(value),
                label: label != null ? String(label) : String(value),
            };
        })
        .filter((o): o is { value: string; label: string } => o !== null);
}

export function injectRowData(node: WidgetConfig, rowData: Record<string, unknown>): WidgetConfig {
    const propsWithFields = node.props?.fields
        ? {
              ...node.props,
              fields: (node.props.fields as FieldConfig[]).map((field) => {
                  const resolvedOptions = resolveOptions(field, rowData);
                  return {
                      ...field,
                      defaultValue: resolvePreFill(field, rowData) ?? field.defaultValue,
                      ...(resolvedOptions ? { options: resolvedOptions } : {}),
                  };
              }),
          }
        : node.props;

    const enrichedProps = propsWithFields?.actions
        ? {
              ...propsWithFields,
              actions: (propsWithFields.actions as SubmitActionConfig[]).map((action) => {
                  let next: SubmitActionConfig = action;
                  if (action.api?.endpoint) {
                      next = {
                          ...next,
                          api: { ...action.api, endpoint: substituteEndpointParams(action.api.endpoint, rowData) },
                      };
                  }
                  // `refreshKey` participates in the same `:id` placeholder
                  // contract as `api.endpoint`. Without substitution, the
                  // invalidation predicate compares literal ":id" against
                  // queryKeys that hold real UUIDs and matches nothing — the
                  // KeyValueGrid above the form keeps stale data after a
                  // 204-success PUT.
                  if (typeof action.refreshKey === "string" && action.refreshKey.includes(":")) {
                      next = {
                          ...next,
                          refreshKey: substituteEndpointParams(action.refreshKey, rowData),
                      };
                  }
                  return next;
              }),
          }
        : propsWithFields;

    return {
        ...node,
        props: enrichedProps,
        children: node.children?.map((child) => injectRowData(child, rowData)),
    };
}

// Dynamic fetcher that hits our Next.js API route to load physical JSON schemas
const fetchFormConfig = async (formId: string): Promise<WidgetConfig> => {
    const res = await fetch(`/api/forms/${formId}`);
    if (!res.ok) {
        throw new Error(`Failed to fetch schema for ${formId}`);
    }
    return res.json();
};

export const OverlaidForm: React.FC<OverlaidFormProps> = ({ formId }) => {
    const overlayData = useOverlayStore(
        (state) => state.openOverlays[formId]?.data as Record<string, unknown> | undefined
    );

    const { data: config, isLoading, error } = useQuery({
        queryKey: ['form-schema', formId],
        queryFn: () => fetchFormConfig(formId)
    });

    const enrichedConfig = useMemo(() => {
        if (!config || !overlayData) return config;
        return injectRowData(config, overlayData);
    }, [config, overlayData]);

    if (isLoading) {
        return (
            <div className="flex h-40 items-center justify-center">
                <p className="text-muted-foreground animate-pulse">Loading form schema...</p>
            </div>
        );
    }

    if (error || !enrichedConfig) {
        return (
            <div className="flex h-40 items-center justify-center flex-col gap-2">
                <p className="text-destructive font-medium">Failed to load form configuration.</p>
                <p className="text-muted-foreground text-sm">{error instanceof Error ? error.message : "Unknown error"}</p>
            </div>
        );
    }

    return <WidgetRenderer config={enrichedConfig} />;
};
