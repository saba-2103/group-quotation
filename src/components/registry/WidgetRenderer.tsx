"use client";

import React from 'react';
import { WidgetConfig } from '@/types/widget';
import { getWidgetComponent } from './WidgetRegistry';
import { cn } from '@/lib/utils';
import { useSmartQuery } from '@/hooks/useSmartQuery';

interface WidgetRendererProps {
    config: WidgetConfig;
}

export const WidgetRenderer: React.FC<WidgetRendererProps> = ({ config }) => {
    const Component = getWidgetComponent(config.type);

    // Basic Data Fetching if configured
    const { data, isLoading, error } = useSmartQuery(config.dataSource);

    if (config.layout?.hidden) return null;

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
        <div className={cn("widget-wrapper", colSpanClass)}>
            <Component {...enhancedProps} />
        </div>
    );
};
