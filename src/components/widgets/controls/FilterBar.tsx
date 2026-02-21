"use client";

import React from 'react';
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
import { Search, ListFilter, X } from 'lucide-react';

export const FilterBar: React.FC<{ config: WidgetConfig }> = ({ config }) => {
    const router = useRouter();
    const searchParams = useSearchParams();

    // We expect filters in config.props.filters
    const filters = config.props?.filters || [];

    const handleFilterChange = (key: string, value: string) => {
        const params = new URLSearchParams(searchParams.toString());
        if (value) {
            params.set(key, value);
        } else {
            params.delete(key);
        }
        router.push(`?${params.toString()}`);
    };

    const handleRemoveFilter = (key: string) => {
        const params = new URLSearchParams(searchParams.toString());
        params.delete(key);
        router.push(`?${params.toString()}`);
    };

    const resetFilters = () => {
        router.push('?');
    };

    // Calculate applied filters for Badges
    const appliedFilters = Array.from(searchParams.entries())
        .filter(([key]) => key !== 'q' && key !== 'page') // exclude search and pagination from chips
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

    return (
        <>
            {/* Search and Filters */}
            <div className="flex flex-wrap items-center gap-2">
                <div className="relative flex-1 min-w-[220px]">
                    <Search className="pointer-events-none absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                        value={searchParams.get('q') || ''}
                        onChange={(e) => handleFilterChange('q', e.target.value)}
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
                                                        onCheckedChange={(checked) => handleFilterChange(filter.id, checked ? val : '')}
                                                    >
                                                        {lbl}
                                                    </DropdownMenuCheckboxItem>
                                                );
                                            })}
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
                            })}
                        </DropdownMenuContent>
                    </DropdownMenu>
                )}
            </div>

            {/* Applied Filters Badges */}
            {appliedFilters.length > 0 && (
                <div className="flex flex-wrap items-center gap-2">
                    {appliedFilters.map((chip: any) => (
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
                        Clear all
                    </Button>
                </div>
            )}
        </>
    );
};
