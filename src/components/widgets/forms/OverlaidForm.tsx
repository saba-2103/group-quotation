import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { WidgetRenderer } from '@/components/registry/WidgetRenderer';
import { WidgetConfig } from '@/types/widget';

interface OverlaidFormProps {
    formId: string;
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
