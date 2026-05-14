"use client";

import React, { useState } from 'react';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { WidgetConfig } from '@/types/widget';
import { cn } from '@/lib/utils';
import { ActionRenderer } from '../../controls/ActionRenderer';
import { ActionConfig } from '@/types/widget';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Badge, BadgeProps } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ErrorBanner } from '../../items/ErrorBanner';
import { useSmartQuery } from '@/hooks/useSmartQuery';

interface ValidAction {
    code: string;
    label: string;
}

interface TranStatus {
    label: string;
    variant: BadgeProps['variant'];
}

interface PageHeaderConfig {
    title?: string;
    description?: string;
    actions?: ActionConfig[];
    validActions?: ValidAction[];
    validButtons?: ActionConfig[];
    hasWorkflow?: boolean;
    tranStatus?: TranStatus;
    backendErrors?: { error_code: string; error_desc: string }[];
    className?: string;
    // Optional back-link; renders a compact "Back" button before the title.
    // Use a relative URL (e.g. "/quotation") so router prefetching works.
    backHref?: string;
    backLabel?: string;
    // When set, the title is interpolated from the entity fetched via
    // `config.dataSource`. `{accessor}` placeholders pull dotted paths off the
    // response and fall back to `{accessor|fallback}` (e.g. `Quote
    // {quoteNumber|id}`) when the primary path is blank. While the fetch is in
    // flight the literal `title` shows so the page header doesn't flash empty.
    titleTemplate?: string;
}

function getNested(source: unknown, path: string): unknown {
    if (source == null || !path) return undefined;
    return path
        .split('.')
        .reduce<unknown>(
            (acc, key) =>
                acc != null && typeof acc === 'object' && key in (acc as object)
                    ? (acc as Record<string, unknown>)[key]
                    : undefined,
            source,
        );
}

function isBlank(v: unknown): boolean {
    return v === undefined || v === null || v === '';
}

function applyTitleTemplate(template: string, data: unknown): string {
    return template.replace(/\{([^}]+)\}/g, (_, expr: string) => {
        const keys = expr.split('|').map((k) => k.trim());
        for (const key of keys) {
            const v = getNested(data, key);
            if (!isBlank(v)) return String(v);
        }
        return '';
    });
}

export const PageHeader: React.FC<{ config: WidgetConfig }> = ({ config }) => {
    const {
        title,
        description,
        actions = [],
        validActions = [],
        validButtons = [],
        hasWorkflow,
        tranStatus,
        backendErrors = [],
        className,
        backHref,
        backLabel,
        titleTemplate,
    } = (config.props ?? {}) as PageHeaderConfig;

    const [screenAction, setScreenAction] = useState(validActions[0]?.code ?? '');

    // Only fetch when a titleTemplate is declared — keeps PageHeader cheap for
    // pages that just want a static title.
    const { data: titleData } = useSmartQuery(titleTemplate ? config.dataSource : undefined);
    const resolvedTitle = titleTemplate && titleData
        ? applyTitleTemplate(titleTemplate, titleData) || title
        : title;

    return (
        <div className={cn('flex flex-col gap-3', className)}>

            {backendErrors.length > 0 && (
                <ErrorBanner config={{
                    id: `${config.id}-error-banner`,
                    type: 'error-banner',
                    props: { errors: backendErrors },
                }} />
            )}

            <header className="flex flex-col gap-2">
                {backHref && (
                    <Button asChild variant="ghost" size="sm" className="self-start -ml-2 text-muted-foreground hover:text-foreground">
                        <Link href={backHref}>
                            <ArrowLeft className="size-4" />
                            {backLabel ?? 'Back'}
                        </Link>
                    </Button>
                )}
                <div className="flex flex-wrap items-center justify-between gap-3">

                    <div className="flex items-center gap-3">
                        <div>
                            <h1 className="text-2xl font-semibold text-foreground">{resolvedTitle}</h1>
                            {description && <p className="text-muted-foreground mt-1">{description}</p>}
                        </div>
                        {hasWorkflow && tranStatus && (
                            <Badge variant={tranStatus.variant}>{tranStatus.label}</Badge>
                        )}
                    </div>

                    <div className="flex items-center gap-2">
                        {validActions.length > 0 && (
                            <Select value={screenAction} onValueChange={setScreenAction}>
                                <SelectTrigger className="w-36">
                                    <SelectValue placeholder="Action" />
                                </SelectTrigger>
                                <SelectContent>
                                    {validActions.map((act) => (
                                        <SelectItem key={act.code} value={act.code}>
                                            {act.label}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        )}

                        {actions.map((action) => (
                            <ActionRenderer key={action.id} action={action} />
                        ))}

                        {validButtons.map((btn) => (
                            <ActionRenderer key={btn.id} action={btn} />
                        ))}
                    </div>
                </div>
            </header>
        </div>
    );
};
