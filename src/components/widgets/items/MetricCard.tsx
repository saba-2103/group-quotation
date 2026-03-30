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

interface MetricCardProps {
    config: WidgetConfig;
}

export const MetricCard: React.FC<MetricCardProps> = ({ config }) => {
    const {
        label, icon, format, showTrend, priority,
        isLoading: propsIsLoading,
        error: propsError,
        data: propsData,
        locale,
        currency,
        maximumFractionDigits,
        trendUnit,
        errorText,
    } = config.props || {};

    const { data: queryData, isLoading: queryLoading, error: queryError } = useSmartQuery(config.dataSource);

    const isLoading: boolean = config.dataSource ? queryLoading : (propsIsLoading ?? false);
    const hasError: boolean = config.dataSource ? !!queryError : !!propsError;
    const data = (config.dataSource ? queryData : propsData) ?? propsData ?? { value: 0 };

    if (hasError) {
        return (
            <div className="p-4 border rounded text-destructive">
                {errorText ?? "Error loading metric"}
            </div>
        );
    }

    const styles = PRIORITY_STYLES[priority] ?? PRIORITY_STYLES.default;

    const formattedValue = isLoading
        ? "..."
        : format === "currency"
            ? new Intl.NumberFormat(locale ?? "en-US", {
                style: "currency",
                currency: currency ?? "USD",
                maximumFractionDigits: maximumFractionDigits ?? 0,
              }).format(data.value)
            : format === "percentage"
                ? `${data.value}%`
                : data.value.toLocaleString();

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
                <span className={cn("font-bold text-foreground", styles.value)}>{formattedValue}</span>
                {showTrend && data.trend !== undefined && !isLoading && (
                    <div className={cn(
                        "flex items-center gap-1 text-sm font-medium",
                        data.trend >= 0 ? "text-green-600" : "text-red-600"
                    )}>
                        {data.trend >= 0
                            ? <TrendingUp className="h-4 w-4" />
                            : <TrendingDown className="h-4 w-4" />
                        }
                        <span>{Math.abs(data.trend)}{trendUnit ?? '%'}</span>
                    </div>
                )}
            </div>
        </div>
    );
};
