"use client";

import React from 'react';
import { WidgetConfig } from '@/types/widget';
import { getWidgetComponent } from './WidgetRegistry';
import { cn } from '@/lib/utils';
import { useSmartQuery } from '@/hooks/useSmartQuery';
import { useRole } from '@/hooks/useRole';
import { useWidgetState } from '@/hooks/useWidgetState';
import { evaluateCondition } from '@/lib/conditions';
import { ParentDataSourceContext } from '@/contexts/ParentDataSourceContext';

interface WidgetRendererProps {
    config: WidgetConfig;
}

export const WidgetRenderer: React.FC<WidgetRendererProps> = ({ config }) => {
    const Component = getWidgetComponent(config.type);
    const { role } = useRole();
    const { values } = useWidgetState();

    // Role-visibility gate evaluated BEFORE useSmartQuery so hidden widgets
    // don't pay fetch / polling cost. An empty `visibleRoles` array means
    // "no role can see it" (caller probably meant to omit the prop entirely
    // and we surface the misconfiguration as silence rather than an error).
    //
    // NOT a security boundary — see widget.ts JSDoc. Cosmetic gating only.
    const isRoleHidden = Array.isArray(config.visibleRoles)
        && !config.visibleRoles.includes(role);

    // Dev-mode signal for the "composed an empty list by accident" footgun.
    // Empty array silently hides the widget from every role, which is rarely
    // what the schema author intended. Fire once per render with the widget id
    // so the console points at the offending node.
    if (
        process.env.NODE_ENV !== "production"
        && Array.isArray(config.visibleRoles)
        && config.visibleRoles.length === 0
    ) {
        // eslint-disable-next-line no-console
        console.warn(
            `WidgetRenderer: widget "${config.id}" has visibleRoles: [] — `
            + `this hides the widget from every role. If you meant "no role `
            + `constraint", omit the prop entirely.`,
        );
    }

    // Generic visibleWhen gate. Evaluated against the shared widget-state
    // store so any widget can react to siblings/ancestors that publish keys
    // via `useWidgetState.setValue` (or a `state-publisher` dataSource —
    // see STATE_MANAGEMENT_GUIDE.md §8.2). Runs BEFORE useSmartQuery so
    // hidden widgets skip their fetch and polling cost. Skipped entirely
    // when `visibleRoles` already hid the widget — role wins.
    //
    // Context source: if `dataSource.stateDependencies` is set, the eval
    // context is sliced to just those keys (declarative, cheaper); else
    // we pass the full snapshot and unbound `var` lookups resolve to
    // `null` per jsonLogic.
    //
    // Error fallback: a predicate that throws (malformed jsonLogic, etc.)
    // defaults to *visible* with a dev-mode warning. Visible-but-wrong is
    // debuggable; hidden-and-wrong is silent.
    let isConditionHidden = false;
    if (!isRoleHidden && config.visibleWhen) {
        try {
            const deps = config.dataSource?.stateDependencies;
            const context = deps && deps.length > 0
                ? deps.reduce<Record<string, unknown>>((acc, key) => {
                    acc[key] = values[key];
                    return acc;
                }, {})
                : values;
            isConditionHidden = !evaluateCondition(config.visibleWhen, context);
        } catch (err) {
            if (process.env.NODE_ENV !== "production") {
                console.warn(
                    `WidgetRenderer: visibleWhen evaluation threw for widget "${config.id}" — defaulting to visible.`,
                    err,
                );
            }
            isConditionHidden = false;
        }
    }

    // Basic Data Fetching if configured. Pass `undefined` to skip the query
    // entirely when the widget is hidden — useSmartQuery short-circuits with
    // `enabled: false` and never fires.
    const { data, isLoading, error, queryKey } = useSmartQuery(
        isRoleHidden || isConditionHidden ? undefined : config.dataSource,
    );

    if (config.layout?.hidden) return null;
    if (isRoleHidden) return null;
    if (isConditionHidden) return null;

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

    // Page-envelope plumbing: only own-fetch widgets seed the
    // ParentDataSourceContext for their descendants. `fromParent` widgets are
    // transparent — they don't wrap, so the context naturally falls through
    // to whatever the real ancestor provided.
    const ownsFetch = !!config.dataSource?.api && !config.dataSource?.fromParent;
    const rendered = <Component {...enhancedProps} />;
    const wrapped = ownsFetch ? (
        <ParentDataSourceContext.Provider value={queryKey}>
            {rendered}
        </ParentDataSourceContext.Provider>
    ) : rendered;

    return (
        <div className={cn("widget-wrapper min-w-0 w-full", colSpanClass)}>
            {wrapped}
        </div>
    );
};
