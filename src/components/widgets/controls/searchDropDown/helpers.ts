import { DropdownOption } from "./types";

export function filterOptions(options: DropdownOption[], search: string): DropdownOption[] {
    const term = search.trim().toLowerCase();
    return term
        ? options.filter((opt) => opt.description.toLowerCase().includes(term))
        : options;
}
