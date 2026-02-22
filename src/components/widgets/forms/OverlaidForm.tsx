import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { WidgetRenderer } from '@/components/registry/WidgetRenderer';
import { WidgetConfig } from '@/types/widget';

interface OverlaidFormProps {
    formId: string;
}

// Temporary Mock fetcher until the real schema fetcher is implemented.
const fetchFormConfig = async (formId: string): Promise<WidgetConfig> => {
    // In production, this hits the Cloudflare KV store holding form schemas
    // For now, we simulate network latency
    await new Promise(resolve => setTimeout(resolve, 500));

    return {
        id: formId,
        type: "stack-layout",
        props: { className: "p-4" },
        children: [
            {
                id: `${formId}-header`,
                type: "page-header",
                props: { title: `Loaded Form: ${formId}` }
            }
        ]
    };
};

export const OverlaidForm: React.FC<OverlaidFormProps> = ({ formId }) => {
    const { data: config, isLoading, error } = useQuery({
        queryKey: ['form-schema', formId],
        queryFn: () => fetchFormConfig(formId)
    });

    if (isLoading) {
        return (
            <div className="flex h-40 items-center justify-center">
                <p className="text-muted-foreground animate-pulse">Loading form schema...</p>
            </div>
        );
    }

    if (error || !config) {
        return (
            <div className="flex h-40 items-center justify-center flex-col gap-2">
                <p className="text-destructive font-medium">Failed to load form configuration.</p>
                <p className="text-muted-foreground text-sm">{error instanceof Error ? error.message : "Unknown error"}</p>
            </div>
        );
    }

    return <WidgetRenderer config={config} />;
};
