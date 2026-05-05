export interface DropdownOption {
    code: string;
    description: string;
}

export interface SearchableDropdownProps {
    /** Options injected by WidgetRenderer via dataSource.api or passed as static config */
    options?: DropdownOption[];
    value?: string;
    onChange: (code: string) => void;
    placeholder?: string;
    disabled?: boolean;
    className?: string;
}
