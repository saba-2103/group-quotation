"use client";

import React from 'react';
import { WidgetConfig } from '@/types/widget';
import { useRouter, useSearchParams } from 'next/navigation';
import { Input } from '@/components/ui/input';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';

export const FilterBar: React.FC<{ config: WidgetConfig }> = ({ config }) => {
    const router = useRouter();
    const searchParams = useSearchParams();
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

    return (
        <div className="flex flex-wrap items-center gap-2 p-4 border-b">
            {filters.map((filter: any) => {
                if (filter.type === 'select') {
                    return (
                        <Select
                            key={filter.id}
                            onValueChange={(val) => handleFilterChange(filter.id, val)}
                            defaultValue={searchParams.get(filter.id) || ''}
                        >
                            <SelectTrigger className="w-[180px]">
                                <SelectValue placeholder={filter.label} />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All {filter.label}</SelectItem> {/* Clear option */}
                                {filter.options?.map((opt: any) => (
                                    <SelectItem key={opt.value || opt} value={opt.value || opt}>
                                        {opt.label || opt}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    );
                }
                if (filter.type === 'text') {
                    return (
                        <Input
                            key={filter.id}
                            placeholder={filter.label}
                            className="w-[200px]"
                            defaultValue={searchParams.get(filter.id) || ''}
                            onChange={(e) => handleFilterChange(filter.id, e.target.value)}
                        />
                    );
                }
                return null;
            })}
            {searchParams.toString() && (
                <Button variant="ghost" onClick={() => router.push('?')}>Clear</Button>
            )}
        </div>
    );
};
