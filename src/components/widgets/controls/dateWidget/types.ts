export const MONTH_NAMES = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December",
] as const;

export const DAY_LABELS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"] as const;

export const YEAR_RANGE = 10;

// ── Domain types ──────────────────────────────────────────────────────────────

export interface DateRange {
    from: string;
    to: string;
}

export interface Preset {
    label: string;
    range: DateRange;
}

// ── Component prop types ──────────────────────────────────────────────────────

export interface CalendarGridProps {
    year: number;
    month: number;
    /** Single-select: highlights this ISO date */
    selected?: string;
    /** Range-select: start ISO date */
    rangeFrom?: string;
    /** Range-select: end ISO date */
    rangeTo?: string;
    /** Hover preview ISO date (range mode) */
    hoverDate?: string | null;
    onDayClick: (iso: string) => void;
    onDayHover?: (iso: string | null) => void;
}

export interface MonthYearDropdownsProps {
    year: number;
    month: number;
    onChange: (year: number, month: number) => void;
}

export interface CalendarDatePickerProps {
    /** ISO date (YYYY-MM-DD) */
    value?: string;
    onChange?: (iso: string) => void;
    disabled?: boolean;
    className?: string;
    id?: string;
    placeholder?: string;
}

export interface DateRangePickerProps {
    /** ISO date (YYYY-MM-DD) */
    from?: string;
    /** ISO date (YYYY-MM-DD) */
    to?: string;
    onChange?: (range: DateRange) => void;
    disabled?: boolean;
    className?: string;
    placeholder?: string;
}

export interface DateDisplayProps {
    /** ISO date (YYYY-MM-DD) */
    value?: string;
    className?: string;
}
