import React from 'react';
import { WidgetConfig } from '@/types/widget';
import { useSmartQuery } from '@/hooks/useSmartQuery';
import { Badge } from '@/components/ui/badge';
import * as Icons from 'lucide-react';

export const KeyValueGrid: React.FC<{ config: WidgetConfig }> = ({ config }) => {
    const { props = {}, dataSource } = config;
    const { fields = [] } = props;

    // Fetch data implicitly if dataSource is provided
    const { data, isLoading, error } = useSmartQuery(dataSource);

    if (isLoading) {
        return <div className="p-6 text-sm text-muted-foreground animate-pulse">Loading summary...</div>;
    }

    if (error) {
        return <div className="p-6 text-sm text-destructive">Failed to load data</div>;
    }

    // Resolve data root using valueKey if provided
    const sourceData = dataSource?.valueKey && data ? (data as any)[dataSource.valueKey] : data;

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
