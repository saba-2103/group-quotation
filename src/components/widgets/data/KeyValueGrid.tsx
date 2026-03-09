import React from 'react';
import { WidgetConfig } from '@/types/widget';
import { useSmartQuery } from '@/hooks/useSmartQuery';
import { Badge } from '@/components/ui/badge';
import * as Icons from 'lucide-react';

export const KeyValueGrid: React.FC<{ config: WidgetConfig }> = ({ config }) => {
    const { props = {}, dataSource } = config;
    const { fields = [], data: propsData, isLoading: propsLoading, error: propsError } = props as any;

    // Fetch data implicitly if dataSource is provided
    const { data: queryData, isLoading: queryIsLoading, error: queryError } = useSmartQuery(dataSource);

    const isLoading = propsLoading || queryIsLoading;
    const error = propsError || queryError;

    if (isLoading) {
        return <div className="p-6 text-sm text-muted-foreground animate-pulse border rounded-lg bg-card">Loading summary...</div>;
    }

    if (error) {
        return <div className="p-6 text-sm text-destructive border rounded-lg bg-red-50/50">Failed to load data</div>;
    }

    // Resolve data root using valueKey if provided, prioritizing static data
    const rawData = propsData || queryData;
    const sourceData = dataSource?.valueKey && rawData ? (rawData as any)[dataSource.valueKey] : rawData;

    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 p-6 bg-card rounded-lg border shadow-sm">
            {fields.map((field: any) => {
                const IconComponent = field.icon ? (Icons as any)[field.icon] : null;
                const value = sourceData ? sourceData[field.accessorKey] : undefined;

                return (
                    <div key={field.id} className="flex flex-col space-y-1.5">
                        <div className="flex items-center text-xs text-muted-foreground space-x-1.5 font-medium uppercase tracking-wider">
                            {IconComponent && <IconComponent className="h-3.5 w-3.5" />}
                            <span>{field.label}</span>
                        </div>
                        <div className="text-sm font-semibold text-foreground">
                            {field.type === 'badge' ? (
                                <Badge variant={value === 'Yes' ? 'default' : 'secondary'}>{value || '-'}</Badge>
                            ) : (
                                <span>{value || '-'}</span>
                            )}
                        </div>
                    </div>
                );
            })}
        </div>
    );
};
