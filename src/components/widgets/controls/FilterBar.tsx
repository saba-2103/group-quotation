"use client";

import React from 'react';
import { WidgetConfig } from '@/types/widget';
import { useActionHandler } from '@/hooks/useActionHandler';
import { useWidgetState } from '@/hooks/useWidgetState';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
    DropdownMenu,
    DropdownMenuCheckboxItem,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuSub,
    DropdownMenuSubContent,
    DropdownMenuSubTrigger,
    DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import { Search, ListFilter, X } from 'lucide-react';

interface FilterOption {
    value: string;
    label: string;
}

interface FilterConfig {
    id: string;
    label: string;
    type: string;
    field?: string;
    placeholder?: string;
    options?: FilterOption[];
}

interface ResolvedFilterBarConfig {
    filters: FilterConfig[];
    stateKey: string;
    searchKey: string;
    searchPlaceholder: string;
    filterLabel: string;
    filterByLabel: string;
    clearAllLabel: string;
}

function resolveConfig(props: WidgetConfig['props'], id: string): ResolvedFilterBarConfig {
    return {
        filters: (props?.filters ?? []) as FilterConfig[],
        stateKey: props?.stateKey ?? id,
        searchKey: props?.searchKey ?? 'q',
        searchPlaceholder: props?.placeholder ?? "Search...",
        filterLabel: props?.filterLabel ?? "Filter",
        filterByLabel: props?.filterByLabel ?? "Filter by",
        clearAllLabel: props?.clearAllLabel ?? "Clear all",
    };
}

export const FilterBar: React.FC<{ config: WidgetConfig }> = ({ config }) => {
    const handleAction = useActionHandler();
    const { getValue } = useWidgetState();

    const { filters, stateKey, searchKey, searchPlaceholder, filterLabel, filterByLabel, clearAllLabel } =
        resolveConfig(config.props, config.id);

    const currentValues = getValue(stateKey, {});

    const handleFilterChange = (key: string, value: string) => {
        handleAction({
            type: "update-widget-state",
            props: { key: stateKey, operation: "patch", value: { [key]: value } }
        });
    };

    const handleRemoveFilter = (key: string) => {
        handleAction({
            type: "update-widget-state",
            props: { key: stateKey, operation: "patch", value: { [key]: "" } }
        });
    };

    const resetFilters = () => {
        handleAction({
            type: "update-widget-state",
            props: { key: stateKey, operation: "set", value: {} }
        });
    };

    const appliedFilters = Object.entries(currentValues)
        .map(([key, value]) => {
            if (!value || key === searchKey) return null;
            const filterDef = filters.find((f) => f.id === key);
            if (!filterDef) return null;
            let displayValue = value as string;
            if (filterDef.options) {
                const opt = filterDef.options.find((o) => o.value === value);
                displayValue = opt?.label ?? String(value);
            }
            return { key, label: `${filterDef.label}: ${displayValue}` };
        })
        .filter((x): x is { key: string; label: string } => x !== null);

    const renderFilter = (filter: FilterConfig) => {
        const currentValue = currentValues[filter.id];

        if (filter.type === 'date') {
            return (
                <DropdownMenuSub key={filter.id}>
                    <DropdownMenuSubTrigger>{filter.label}</DropdownMenuSubTrigger>
                    <DropdownMenuSubContent>
                        <div className="p-2">
                            <Input
                                type="date"
                                placeholder={filter.placeholder}
                                value={currentValue || ''}
                                onChange={(e) => handleFilterChange(filter.id, e.target.value)}
                                className="h-8 text-sm"
                            />
                        </div>
                        {currentValue && (
                            <>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem onSelect={() => handleRemoveFilter(filter.id)}>
                                    Clear {filter.label}
                                </DropdownMenuItem>
                            </>
                        )}
                    </DropdownMenuSubContent>
                </DropdownMenuSub>
            );
        }

        if (filter.type === 'select' && filter.options) {
            return (
                <DropdownMenuSub key={filter.id}>
                    <DropdownMenuSubTrigger>{filter.label}</DropdownMenuSubTrigger>
                    <DropdownMenuSubContent>
                        {filter.options.map((opt) => (
                            <DropdownMenuCheckboxItem
                                key={opt.value}
                                checked={currentValue === opt.value}
                                onCheckedChange={(checked) => handleFilterChange(filter.id, checked ? opt.value : '')}
                            >
                                {opt.label}
                            </DropdownMenuCheckboxItem>
                        ))}
                        {currentValue && (
                            <>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem onSelect={() => handleRemoveFilter(filter.id)}>
                                    Clear {filter.label}
                                </DropdownMenuItem>
                            </>
                        )}
                    </DropdownMenuSubContent>
                </DropdownMenuSub>
            );
        }

        return null;
    };

    return (
        <>
            <div className="flex flex-wrap items-center gap-2">
                <div className="relative flex-1 min-w-[220px]">
                    <Search className="pointer-events-none absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                        value={currentValues[searchKey] || ''}
                        onChange={(e) => handleFilterChange(searchKey, e.target.value)}
                        placeholder={searchPlaceholder}
                        className="bg-card pl-8"
                    />
                </div>

                {filters.length > 0 && (
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="outline" className="gap-1">
                                <ListFilter className="h-3.5 w-3.5" />
                                <span className="sr-only sm:not-sr-only sm:whitespace-nowrap">{filterLabel}</span>
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="min-w-[220px]">
                            <DropdownMenuLabel>{filterByLabel}</DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            {filters.map(renderFilter)}
                        </DropdownMenuContent>
                    </DropdownMenu>
                )}
            </div>

            {appliedFilters.length > 0 && (
                <div className="flex flex-wrap items-center gap-2">
                    {appliedFilters.map((chip) => (
                        <Badge key={chip.key} variant="secondary" className="gap-1 pr-1 py-1">
                            {chip.label}
                            <button
                                type="button"
                                onClick={() => handleRemoveFilter(chip.key)}
                                className="rounded-full bg-background p-0.5 transition hover:bg-muted"
                            >
                                <X className="h-3 w-3" />
                            </button>
                        </Badge>
                    ))}
                    <Button
                        variant="ghost"
                        className="h-auto p-1.5 text-sm text-muted-foreground hover:bg-transparent"
                        onClick={resetFilters}
                    >
                        {clearAllLabel}
                    </Button>
                </div>
            )}
        </>
    );
};
