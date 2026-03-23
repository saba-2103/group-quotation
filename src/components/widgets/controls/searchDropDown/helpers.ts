import { DropdownOption } from "./types";

export const NULL_OPTION: DropdownOption = { code: "", description: "<NULL>" };

export async function fetchConfigOptions(
    variableCode: string,
    entityId?: string,
    language?: string,
): Promise<DropdownOption[]> {
    const params = new URLSearchParams({ variable_code: variableCode });
    if (entityId) params.set("entity_id", entityId);
    if (language) params.set("language", language);
    const res = await fetch(`/api/valid-values?${params.toString()}`);
    if (!res.ok) throw new Error("Failed to fetch options");
    return res.json();
}

export async function fetchTransactionalOptions(endpoint: string): Promise<DropdownOption[]> {
    const res = await fetch(endpoint);
    if (!res.ok) throw new Error("Failed to fetch options");
    return res.json();
}

export function resolveOptions(rawOptions: DropdownOption[], mandatory: boolean): DropdownOption[] {
    return mandatory ? rawOptions : [NULL_OPTION, ...rawOptions];
}

export function filterOptions(options: DropdownOption[], search: string): DropdownOption[] {
    const term = search.trim().toLowerCase();
    return term
        ? options.filter((opt) => opt.description.toLowerCase().startsWith(term))
        : options;
}
