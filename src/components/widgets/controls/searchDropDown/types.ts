export interface DropdownOption {
    code: string;
    description: string;
}

export interface SearchableDropdownProps {
    /** Config-code mode: fetches /api/valid-values */
    variableCode?: string;
    entityId?: string;
    language?: string;
    /** Transactional mode: custom endpoint URL */
    endpoint?: string;
    /** Whether the field is mandatory (suppresses NULL injection when true) */
    mandatory?: boolean;
    /** Static options — bypasses API fetching */
    options?: DropdownOption[];
    value?: string;
    onChange?: (code: string) => void;
    placeholder?: string;
    disabled?: boolean;
    className?: string;
}

export interface OptionsListProps {
    options: DropdownOption[];
    selectedCode?: string;
    isLoading: boolean;
    fetchError: unknown;
    onSelect: (option: DropdownOption) => void;
}
