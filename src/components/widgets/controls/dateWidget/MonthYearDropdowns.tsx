"use client";

import React from "react";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { MonthYearDropdownsProps, MONTH_NAMES, YEAR_RANGE } from "./types";

export function MonthYearDropdowns({ year, month, onChange }: MonthYearDropdownsProps) {
    const currentYear = new Date().getFullYear();
    const years = Array.from(
        { length: YEAR_RANGE * 2 + 1 },
        (_, i) => currentYear - YEAR_RANGE + i,
    );

    return (
        <div className="flex items-center gap-0.5">
            <Select value={String(month)} onValueChange={(v) => onChange(year, Number(v))}>
                <SelectTrigger className="h-7 w-auto gap-0.5 rounded border-0 bg-transparent px-2 text-sm font-medium shadow-none focus:ring-0 focus:ring-offset-0">
                    <SelectValue />
                </SelectTrigger>
                <SelectContent>
                    {MONTH_NAMES.map((name, idx) => (
                        <SelectItem key={idx} value={String(idx)}>{name}</SelectItem>
                    ))}
                </SelectContent>
            </Select>
            <Select value={String(year)} onValueChange={(v) => onChange(Number(v), month)}>
                <SelectTrigger className="h-7 w-auto gap-0.5 rounded border-0 bg-transparent px-2 text-sm font-medium shadow-none focus:ring-0 focus:ring-offset-0">
                    <SelectValue />
                </SelectTrigger>
                <SelectContent>
                    {years.map((y) => (
                        <SelectItem key={y} value={String(y)}>{y}</SelectItem>
                    ))}
                </SelectContent>
            </Select>
        </div>
    );
}
