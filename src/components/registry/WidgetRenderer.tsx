"use client";

import React from 'react';
import { WidgetConfig } from '@/types/widget';
import { getWidgetComponent } from './WidgetRegistry';
import { cn } from '@/lib/utils';
import { useSmartQuery } from '@/hooks/useSmartQuery';
import { useRole } from '@/hooks/useRole';

interface WidgetRendererProps {
    config: WidgetConfig;
}

export const WidgetRenderer: React.FC<WidgetRendererProps> = ({ config }) => {
    const Component = getWidgetComponent(config.type);
    const { role } = useRole();

    // Role-visibility gate evaluated BEFORE useSmartQuery so hidden widgets
    // don't pay fetch / polling cost. An empty `visibleRoles` array means
    // "no role can see it" (caller probably meant to omit the prop entirely
    // and we surface the misconfiguration as silence rather than an error).
    const isRoleHidden = Array.isArray(config.visibleRoles)
        && !config.visibleRoles.includes(role);

    // Basic Data Fetching if configured. Pass `undefined` to skip the query
    // entirely when the widget is hidden — useSmartQuery short-circuits with
    // `enabled: false` and never fires.
    const { data, isLoading, error } = useSmartQuery(
        isRoleHidden ? undefined : config.dataSource,
    );

    if (config.layout?.hidden) return null;
    if (isRoleHidden) return null;

    // Enhancing props with data
    const enhancedProps = {
        config: {
            ...config,
            props: {
                ...config.props,
                data: data || config.props?.data, // Inject fetched data
                isLoading,
                error
            }
        },
        ...config.props // Flatten props for direct access if supported by component
    };

    const colSpanClasses: Record<number, string> = {
        1: "col-span-1 md:col-span-1",
        2: "col-span-1 md:col-span-2",
        3: "col-span-1 md:col-span-3",
        4: "col-span-1 md:col-span-4",
    };

    const colSpanClass = config.layout?.colSpan ? colSpanClasses[config.layout.colSpan] : "";

    return (
        <div className={cn("widget-wrapper min-w-0 w-full", colSpanClass)}>
            <Component {...enhancedProps} />
        </div>
    );
};
