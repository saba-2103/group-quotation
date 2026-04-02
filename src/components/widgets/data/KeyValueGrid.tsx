import React from 'react';
import { WidgetConfig } from '@/types/widget';
import { useSmartQuery } from '@/hooks/useSmartQuery';
import { KeyValueGridWidgetProps, ApiResponseData, DataRecord, KeyValueField } from './types';
import { Badge } from '@/components/ui/badge';
import { LoadingState } from '@/components/ui/loading-state';
import { ErrorState } from '@/components/ui/error-state';
import * as Icons from 'lucide-react';

export const KeyValueGrid: React.FC<{ config: WidgetConfig }> = ({ config }) => {
    const { props = {}, dataSource } = config;
    const {
        fields = [],
        data: propsData,
        isLoading: propsLoading,
        error: propsError,
    } = props as KeyValueGridWidgetProps;

    const { data: queryData, isLoading: queryIsLoading, error: queryError } = useSmartQuery(
        propsData == null ? dataSource : undefined,
    );

    const isLoading = propsLoading ?? queryIsLoading;
    const error = propsError ?? queryError;

    if (isLoading) return <LoadingState message="Loading" />;
    if (error) return <ErrorState message="Failed to load data" />;

    const rawData = (propsData ?? (queryData as ApiResponseData | null)) ?? undefined;
    const nestedValue = dataSource?.valueKey && rawData ? rawData[dataSource.valueKey] : undefined;
    const sourceData: DataRecord | undefined =
        nestedValue !== null && nestedValue !== undefined && typeof nestedValue === 'object'
            ? nestedValue
            : (rawData as DataRecord | undefined);

    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 p-6 bg-card rounded-lg border shadow-sm">
            {fields.map((field: KeyValueField) => {
                const iconKey = field.icon as keyof typeof Icons;
                const IconComponent = field.icon
                    ? (Icons[iconKey] as React.ComponentType<{ className?: string }>) ?? null
                    : null;
                const value = sourceData ? sourceData[field.accessorKey] : undefined;

                return (
                    <div key={field.id} className="flex flex-col space-y-1.5">
                        <div className="flex items-center text-xs text-muted-foreground space-x-1.5 font-medium uppercase tracking-wider">
                            {IconComponent && <IconComponent className="h-3.5 w-3.5" />}
                            <span>{field.label}</span>
                        </div>
                        <div className="text-sm font-semibold text-foreground">
                            {field.type === 'badge' ? (
                                <Badge variant={value === 'Yes' ? 'default' : 'secondary'}>{value ?? '-'}</Badge>
                            ) : (
                                <span>{value ?? '-'}</span>
                            )}
                        </div>
                    </div>
                );
            })}
        </div>
    );
};
