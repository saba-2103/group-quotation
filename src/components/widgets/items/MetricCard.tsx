import React from 'react';
import { WidgetConfig } from '@/types/widget';
import { cn } from '@/lib/utils';
import * as Icons from 'lucide-react';
import { TrendingUp, TrendingDown } from "lucide-react";
import { useSmartQuery } from '@/hooks/useSmartQuery';
import { PRIORITY_STYLES } from './constants';

const LucideIcon = ({ name, className }: { name: string; className?: string }) => {
    const IconComponent = (Icons as unknown as Record<string, React.ComponentType<{ className?: string }>>)[name];
    if (!IconComponent) return null;
    return <IconComponent className={className} />;
};

interface MetricData {
    value: number;
    trend?: number;
}

interface MetricCardProps {
    config: WidgetConfig;
}

export const MetricCard: React.FC<MetricCardProps> = ({ config }) => {
    const { label, icon, showTrend, priority, trendUnit, errorText } = config.props || {};

    const { data, isLoading, error } = useSmartQuery(config.dataSource);
    const { value, trend } = (data as MetricData) ?? {};

    if (error) {
        return (
            <div className="p-4 border rounded text-destructive">
                {errorText ?? "Error loading metric"}
            </div>
        );
    }

    const styles = PRIORITY_STYLES[priority] ?? PRIORITY_STYLES.default;

    return (
        <div
            className={cn(
                "flex flex-col justify-between rounded-lg border bg-card p-5 hover:shadow-lg transition-all",
                styles.container,
                styles.shadow
            )}
        >
            <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-muted-foreground">{label}</span>
                {icon && <LucideIcon name={icon} className="h-5 w-5 text-muted-foreground" />}
            </div>
            <div className="flex items-end justify-between">
                <span className={cn("font-bold text-foreground", styles.value)}>{isLoading ? "..." : value}</span>
                {showTrend && trend !== undefined && !isLoading && (
                    <div className={cn(
                        "flex items-center gap-1 text-sm font-medium",
                        trend >= 0 ? "text-green-600" : "text-red-600"
                    )}>
                        {trend >= 0
                            ? <TrendingUp className="h-4 w-4" />
                            : <TrendingDown className="h-4 w-4" />
                        }
                        <span>{Math.abs(trend)}{trendUnit ?? '%'}</span>
                    </div>
                )}
            </div>
        </div>
    );
};
