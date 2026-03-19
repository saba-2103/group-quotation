"use client";

import React, { useState } from 'react';
import { WidgetConfig } from '@/types/widget';
import { useRouter, useSearchParams } from 'next/navigation';
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
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Search, ListFilter, X, RotateCcw } from 'lucide-react';

export const FilterBar: React.FC<{ config: WidgetConfig }> = ({ config }) => {
    const router = useRouter();
    const searchParams = useSearchParams();

    const filters = config.props?.filters || [];
    const mode: 'client' | 'server' = config.props?.mode ?? 'client';

    // Server mode: buffer criteria locally until Search is clicked
    const [serverCriteria, setServerCriteria] = useState<Record<string, string>>({});

    // ── Client mode helpers ────────────────────────────────────────────────

    const handleClientFilterChange = (key: string, value: string) => {
        const params = new URLSearchParams(searchParams.toString());
        if (value) params.set(key, value); else params.delete(key);
        router.push(`?${params.toString()}`);
    };

    const handleClientRemoveFilter = (key: string) => {
        const params = new URLSearchParams(searchParams.toString());
        params.delete(key);
        router.push(`?${params.toString()}`);
    };

    const resetClientFilters = () => router.push('?');

    const appliedFilters = Array.from(searchParams.entries())
        .filter(([key]) => key !== 'q' && key !== 'page')
        .map(([key, value]) => {
            const filterDef = filters.find((f: any) => f.id === key);
            if (!filterDef) return null;
            let displayValue = value;
            if (filterDef.options) {
                const opt = filterDef.options.find((o: any) => o.value === value || o === value);
                displayValue = opt?.label || opt || value;
            }
            return { key, label: `${filterDef.label}: ${displayValue}` };
        })
        .filter(Boolean);

    // ── Server mode helpers ────────────────────────────────────────────────

    const handleServerCriteriaChange = (key: string, value: string) => {
        setServerCriteria((prev) => {
            const next = { ...prev };
            if (value) next[key] = value; else delete next[key];
            return next;
        });
    };

    const handleSearch = () => {
        const params = new URLSearchParams();
        Object.entries(serverCriteria).forEach(([k, v]) => params.set(k, v));
        router.push(`?${params.toString()}`);
    };

    const handleReset = () => {
        setServerCriteria({});
        router.push('?');
    };

    const hasServerCriteria = Object.keys(serverCriteria).length > 0;

    // ── Server mode render ─────────────────────────────────────────────────

    if (mode === 'server') {
        return (
            <div className="rounded-lg border bg-card shadow-sm">
                {/* Filter grid */}
                <div className="grid grid-cols-2 gap-x-6 gap-y-4 p-5 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
                    {/* Text search always first */}
                    <div className="flex flex-col gap-1.5">
                        <label className="text-xs font-medium text-muted-foreground">Search</label>
                        <div className="relative">
                            <Search className="pointer-events-none absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                            <Input
                                value={serverCriteria['q'] || ''}
                                onChange={(e) => handleServerCriteriaChange('q', e.target.value)}
                                placeholder="Search..."
                                className="pl-8 h-9 text-sm"
                                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                            />
                        </div>
                    </div>

                    {/* Date filters */}
                    {filters
                        .filter((f: any) => f.type === 'date')
                        .map((filter: any) => (
                            <div key={filter.id} className="flex flex-col gap-1.5">
                                <label className="text-xs font-medium text-muted-foreground">{filter.label}</label>
                                <Input
                                    type="date"
                                    value={serverCriteria[filter.id] || ''}
                                    onChange={(e) => handleServerCriteriaChange(filter.id, e.target.value)}
                                    className="h-9 text-sm"
                                />
                            </div>
                        ))
                    }

                    {/* Select filters */}
                    {filters
                        .filter((f: any) => f.type === 'select' && f.options)
                        .map((filter: any) => (
                            <div key={filter.id} className="flex flex-col gap-1.5">
                                <label className="text-xs font-medium text-muted-foreground">{filter.label}</label>
                                <Select
                                    value={serverCriteria[filter.id] || ''}
                                    onValueChange={(val) => handleServerCriteriaChange(filter.id, val === '__all__' ? '' : val)}
                                >
                                    <SelectTrigger className="h-9 text-sm">
                                        <SelectValue placeholder={filter.placeholder || `All ${filter.label}`} />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="__all__">{filter.placeholder || `All ${filter.label}`}</SelectItem>
                                        {filter.options.map((opt: any) => (
                                            <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        ))
                    }
                </div>

                {/* Footer: actions */}
                <Separator />
                <div className="flex items-center justify-end gap-2 px-5 py-3">
                    {hasServerCriteria && (
                        <Button variant="ghost" size="sm" onClick={handleReset} className="gap-1.5 text-muted-foreground">
                            <RotateCcw className="h-3.5 w-3.5" />
                            Reset
                        </Button>
                    )}
                    <Button size="sm" onClick={handleSearch} className="gap-1.5">
                        <Search className="h-3.5 w-3.5" />
                        Search
                    </Button>
                </div>
            </div>
        );
    }

    // ── Client mode render (unchanged) ────────────────────────────────────

    return (
        <>
            <div className="flex flex-wrap items-center gap-2">
                <div className="relative flex-1 min-w-[220px]">
                    <Search className="pointer-events-none absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                        value={searchParams.get('q') || ''}
                        onChange={(e) => handleClientFilterChange('q', e.target.value)}
                        placeholder="Search..."
                        className="bg-card pl-8"
                    />
                </div>

                {filters.length > 0 && (
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="outline" className="gap-1">
                                <ListFilter className="h-3.5 w-3.5" />
                                <span className="sr-only sm:not-sr-only sm:whitespace-nowrap">Filter</span>
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="min-w-[220px]">
                            <DropdownMenuLabel>Filter by</DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            {filters.map((filter: any) => {
                                if (filter.type !== 'select' || !filter.options) return null;
                                const currentValue = searchParams.get(filter.id);
                                return (
                                    <DropdownMenuSub key={filter.id}>
                                        <DropdownMenuSubTrigger>{filter.label}</DropdownMenuSubTrigger>
                                        <DropdownMenuSubContent>
                                            {filter.options.map((opt: any) => {
                                                const val = opt.value || opt;
                                                const lbl = opt.label || opt;
                                                return (
                                                    <DropdownMenuCheckboxItem
                                                        key={val}
                                                        checked={currentValue === val}
                                                        onCheckedChange={(checked) => handleClientFilterChange(filter.id, checked ? val : '')}
                                                    >
                                                        {lbl}
                                                    </DropdownMenuCheckboxItem>
                                                );
                                            })}
                                            {currentValue && (
                                                <>
                                                    <DropdownMenuSeparator />
                                                    <DropdownMenuItem onSelect={() => handleClientRemoveFilter(filter.id)}>
                                                        Clear {filter.label}
                                                    </DropdownMenuItem>
                                                </>
                                            )}
                                        </DropdownMenuSubContent>
                                    </DropdownMenuSub>
                                );
                            })}
                        </DropdownMenuContent>
                    </DropdownMenu>
                )}
            </div>

            {appliedFilters.length > 0 && (
                <div className="flex flex-wrap items-center gap-2">
                    {appliedFilters.map((chip: any) => (
                        <Badge key={chip.key} variant="secondary" className="gap-1 pr-1 py-1">
                            {chip.label}
                            <button
                                type="button"
                                onClick={() => handleClientRemoveFilter(chip.key)}
                                className="rounded-full bg-background p-0.5 transition hover:bg-muted"
                            >
                                <X className="h-3 w-3" />
                            </button>
                        </Badge>
                    ))}
                    <Button
                        variant="ghost"
                        className="h-auto p-1.5 text-sm text-muted-foreground hover:bg-transparent"
                        onClick={resetClientFilters}
                    >
                        Clear all
                    </Button>
                </div>
            )}
        </>
    );
};
