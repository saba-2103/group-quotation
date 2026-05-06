import React, { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { WidgetRenderer } from '@/components/registry/WidgetRenderer';
import { WidgetConfig } from '@/types/widget';
import { useOverlayStore } from '@/hooks/useOverlayStore';
import { substituteEndpointParams } from '@/lib/endpointUtils';

interface OverlaidFormProps {
    formId: string;
}

type FieldConfig = { name: string; defaultValue?: unknown; [key: string]: unknown };
type SubmitActionConfig = { api?: { endpoint?: string; [key: string]: unknown }; [key: string]: unknown };

function injectRowData(node: WidgetConfig, rowData: Record<string, unknown>): WidgetConfig {
    const propsWithFields = node.props?.fields
        ? {
              ...node.props,
              fields: (node.props.fields as FieldConfig[]).map((field) => ({
                  ...field,
                  defaultValue: rowData[field.name] ?? field.defaultValue,
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
