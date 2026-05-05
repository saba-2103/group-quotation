"use client";

import React from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { CalendarGridProps, DAY_LABELS } from "./types";
import { buildCalendarDays, toISO, todayISO } from "./utils";

export function CalendarGrid({
    year,
    month,
    selected,
    rangeFrom,
    rangeTo,
    hoverDate,
    onDayClick,
    onDayHover,
}: CalendarGridProps) {
    const today = todayISO();
    const days = buildCalendarDays(year, month);

    const effectiveEnd =
        rangeTo ||
        (rangeFrom && hoverDate && hoverDate >= rangeFrom ? hoverDate : undefined);
    const isSameStartEnd = !!rangeFrom && !!effectiveEnd && rangeFrom === effectiveEnd;

    return (
        <div className="w-[252px] select-none">
            {/* Weekday labels */}
            <div className="grid grid-cols-7">
                {DAY_LABELS.map((lbl) => (
                    <div
                        key={lbl}
                        className="h-9 flex items-center justify-center text-xs font-medium text-muted-foreground"
                    >
                        {lbl}
                    </div>
                ))}
            </div>

            {/* Day cells */}
            <div className="grid grid-cols-7">
                {days.map((day, idx) => {
                    if (day === null) return <div key={`e-${idx}`} className="h-9" />;

                    const iso = toISO(year, month, day);
                    const isToday = iso === today;
                    const isSelected = iso === selected;
                    const isStart = !!rangeFrom && iso === rangeFrom;
                    const isEnd = !!effectiveEnd && iso === effectiveEnd && !isSameStartEnd;
                    const isInRange =
                        !!rangeFrom &&
                        !!effectiveEnd &&
                        !isSameStartEnd &&
                        iso > rangeFrom &&
                        iso < effectiveEnd;
                    const isHighlighted =
                        isSelected || isStart || (isEnd && !isInRange) || (isSameStartEnd && isStart);

                    return (
                        <div key={iso} className="relative h-9 flex items-center justify-center">
                            {/* Range strip backgrounds */}
                            {isStart && !isSameStartEnd && (
                                <div className="absolute inset-y-1 left-1/2 right-0 bg-primary/10" />
                            )}
                            {isEnd && (
                                <div className="absolute inset-y-1 left-0 right-1/2 bg-primary/10" />
                            )}
                            {isInRange && (
                                <div className="absolute inset-y-1 inset-x-0 bg-primary/10" />
                            )}

                            <Button
                                variant={isHighlighted ? "default" : "ghost"}
                                size="icon"
                                className={cn(
                                    "relative z-10 h-8 w-8 rounded-full text-sm font-normal",
                                    !isHighlighted && isToday && "ring-1 ring-primary font-semibold",
                                )}
                                onClick={() => onDayClick(iso)}
                                onMouseEnter={() => onDayHover?.(iso)}
                                onMouseLeave={() => onDayHover?.(null)}
                            >
                                {day}
                            </Button>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
