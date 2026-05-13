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
    [key: string]: unknown;
};
type SubmitActionConfig = { api?: { endpoint?: string; [key: string]: unknown }; [key: string]: unknown };

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

function injectRowData(node: WidgetConfig, rowData: Record<string, unknown>): WidgetConfig {
    const propsWithFields = node.props?.fields
        ? {
              ...node.props,
              fields: (node.props.fields as FieldConfig[]).map((field) => ({
                  ...field,
                  defaultValue: resolvePreFill(field, rowData) ?? field.defaultValue,
              })),
          }
        : node.props;

    const enrichedProps = propsWithFields?.actions
        ? {
              ...propsWithFields,
              actions: (propsWithFields.actions as SubmitActionConfig[]).map((action) =>
                  action.api?.endpoint
                      ? { ...action, api: { ...action.api, endpoint: substituteEndpointParams(action.api.endpoint, rowData) } }
                      : action
              ),
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
