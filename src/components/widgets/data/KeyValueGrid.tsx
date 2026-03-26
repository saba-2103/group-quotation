import React from 'react';
import { WidgetConfig } from '@/types/widget';
import { useSmartQuery } from '@/hooks/useSmartQuery';
import { Badge } from '@/components/ui/badge';
import { DateDisplay } from '@/components/widgets/controls/dateWidget/DateDisplay';

interface KeyValueField {
    id: string;
    label: string;
    accessorKey: string;
    type?: string;
    icon?: string;
}

interface BadgeValue {
    label: string;
    variant?: string;
}

type FieldValue = string | number | boolean | BadgeValue | null | undefined;

export const KeyValueGrid: React.FC<{ config: WidgetConfig }> = ({ config }) => {
    const { props = {}, dataSource } = config;
    const fields = (props.fields ?? []) as KeyValueField[];

    const { data, isLoading, error } = useSmartQuery(dataSource);

    if (isLoading) {
        return <div className="p-6 text-sm text-muted-foreground animate-pulse">Loading summary...</div>;
    }

    if (error) {
        return <div className="p-6 text-sm text-destructive">Failed to load data</div>;
    }

    const sourceData = data as Record<string, FieldValue> | null;

    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 p-6 bg-card rounded-lg border shadow-sm">
            {fields.map((field) => {
                const value = sourceData ? sourceData[field.accessorKey] : undefined;

                return (
                    <div key={field.id} className="flex flex-col space-y-1.5">
                        <div className="flex items-center text-xs text-muted-foreground space-x-1.5 font-medium uppercase tracking-wider">
                            <span>{field.label}</span>
                        </div>
                        <div className="text-sm font-semibold text-foreground">
                            {field.type === 'badge' ? (() => {
                                const badgeVal = value as BadgeValue | null | undefined;
                                return (
                                    <Badge variant={badgeVal?.variant as Parameters<typeof Badge>[0]['variant']}>
                                        {badgeVal?.label ?? '-'}
                                    </Badge>
                                );
                            })() : field.type === 'date' ? (
                                <DateDisplay value={value ? String(value) : ''} />
                            ) : (
                                <span>{value ? String(value) : '-'}</span>
                            )}
                        </div>
                    </div>
                );
            })}
        </div>
    );
};
