import React from 'react';
import { WidgetConfig } from '@/types/widget';
import { cn } from '@/lib/utils';
// Assuming lucide-react is installed, import specific icons here
import * as Icons from 'lucide-react';
import { TrendingUp, TrendingDown } from "lucide-react";

// Priority styles extracted from original `getPriorityStyles` helper
const PRIORITY_STYLES = {
    1: {
        container: "h-32",
        value: "text-3xl",
        shadow: "shadow-md",
    },
    2: {
        container: "h-28",
        value: "text-2xl",
        shadow: "shadow-sm",
    },
    3: {
        container: "h-24",
        value: "text-xl",
        shadow: "",
    },
};

const LucideIcon = ({ name, className }: { name: string, className?: string }) => {
    const IconComponent = (Icons as any)[name];
    if (!IconComponent) return null;
    return <IconComponent className={className} />;
};

interface MetricCardProps {
    config: WidgetConfig;
}

export const MetricCard: React.FC<MetricCardProps> = ({ config }) => {
    const { label, icon, format, showTrend, priority, isLoading, error } = config.props || {};
    const data = config.props?.data || { value: 0 };

    if (error) {
        return <div className="p-4 border rounded text-red-500">Error loading metric</div>;
    }

    const safePriority: 1 | 2 | 3 = [1, 2, 3].includes(priority) ? (priority as 1 | 2 | 3) : 3;
    const styles = PRIORITY_STYLES[safePriority];

    const formattedValue = isLoading
        ? "..."
        : format === "currency"
            ? new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(data.value)
            : format === "percentage"
                ? `${data.value}%`
                : data.value.toLocaleString();

    return (
        <div
            className={cn(
                "flex flex-col justify-between rounded-lg border bg-card p-5 hover:shadow-lg transition-all", // Added bg-card and p-5
                styles.container,
                styles.shadow
            )}
        >
            <div className="flex items-center justify-between">
                <span className={cn("text-sm font-medium text-muted-foreground")}>
                    {label}
                </span>
                {icon && <LucideIcon name={icon} className={cn("h-5 w-5 text-muted-foreground")} />}
            </div>
            <div className="flex items-end justify-between">
                <span className={cn("font-bold text-foreground", styles.value)}>{formattedValue}</span>
                {showTrend && data.trend !== undefined && !isLoading && (
                    <div
                        className={cn(
                            "flex items-center gap-1 text-sm font-medium",
                            data.trend >= 0 ? "text-green-600" : "text-red-600"
                        )}
                    >
                        {data.trend >= 0 ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
                        <span>{Math.abs(data.trend)}%</span>
                    </div>
                )}
            </div>
        </div>
    );
};
