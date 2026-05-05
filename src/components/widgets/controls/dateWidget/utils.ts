import { DateFormat } from "@/contexts/TenantConfigContext";
import { DateRange, Preset } from "./types";

// ── Display formatting ────────────────────────────────────────────────────────

export function formatDateForDisplay(isoDate: string, format: DateFormat): string {
    if (!isoDate) return "";
    const match = isoDate.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (!match) return isoDate;
    const [, year, month, day] = match;
    return format === "MM/DD/YYYY"
        ? `${month}/${day}/${year}`
        : `${day}/${month}/${year}`;
}

export function parseDateToISO(displayDate: string, format: DateFormat): string {
    if (!displayDate) return "";
    const parts = displayDate.split("/");
    if (parts.length !== 3) return "";
    const [a, b, year] = parts;
    if (!a || !b || !year) return "";
    const [month, day] = format === "MM/DD/YYYY" ? [a, b] : [b, a];
    return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
}

// ── Calendar grid helpers ─────────────────────────────────────────────────────

export function buildCalendarDays(year: number, month: number): (number | null)[] {
    if (!Number.isFinite(year) || !Number.isFinite(month)) return [];
    const firstDay = new Date(year, month, 1).getDay();
    const daysCount = new Date(year, month + 1, 0).getDate();
    const days: (number | null)[] = Array(firstDay).fill(null);
    for (let d = 1; d <= daysCount; d++) days.push(d);
    return days;
}

export function toISO(year: number, month: number, day: number): string {
    return `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

export function todayISO(): string {
    const now = new Date();
    return toISO(now.getFullYear(), now.getMonth(), now.getDate());
}

export function shiftMonth(
    year: number,
    month: number,
    delta: number,
): { year: number; month: number } {
    let m = month + delta;
    let y = year;
    while (m < 0) { m += 12; y--; }
    while (m > 11) { m -= 12; y++; }
    return { year: y, month: m };
}

// ── Range presets ─────────────────────────────────────────────────────────────

export function buildPresets(): Preset[] {
    const now = new Date();
    const y = now.getFullYear();
    const m = now.getMonth();
    const d = now.getDate();
    const dow = now.getDay();

    const iso = (dt: Date) => toISO(dt.getFullYear(), dt.getMonth(), dt.getDate());
    const dt = (year: number, month: number, day: number) => new Date(year, month, day);

    return [
        { label: "Today",       range: { from: iso(dt(y, m, d)),           to: iso(dt(y, m, d)) } },
        { label: "Yesterday",   range: { from: iso(dt(y, m, d - 1)),       to: iso(dt(y, m, d - 1)) } },
        { label: "This Week",   range: { from: iso(dt(y, m, d - dow)),     to: iso(dt(y, m, d - dow + 6)) } },
        { label: "Last Week",   range: { from: iso(dt(y, m, d - dow - 7)), to: iso(dt(y, m, d - dow - 1)) } },
        { label: "Last 7 Days", range: { from: iso(dt(y, m, d - 6)),       to: iso(dt(y, m, d)) } },
        { label: "This Month",  range: { from: iso(dt(y, m, 1)),           to: iso(dt(y, m + 1, 0)) } },
        { label: "Last Month",  range: { from: iso(dt(y, m - 1, 1)),       to: iso(dt(y, m, 0)) } },
        { label: "This Year",   range: { from: iso(dt(y, 0, 1)),           to: iso(dt(y, 11, 31)) } },
        { label: "Last Year",   range: { from: iso(dt(y - 1, 0, 1)),       to: iso(dt(y - 1, 11, 31)) } },
    ] satisfies Preset[];
}

export const getParsedYear = (value: string): number =>
  typeof value === "string" && /^\d{4}-\d{2}/.test(value)
    ? parseInt(value.slice(0, 4))
    : NaN;

export const getParsedMonth = (value: string): number =>
  typeof value === "string" && /^\d{4}-\d{2}/.test(value)
    ? parseInt(value.slice(5, 7)) - 1
    : NaN;
