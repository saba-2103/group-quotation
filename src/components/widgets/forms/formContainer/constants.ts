// Field types that produce string-based schema values
export const STRING_FIELD_TYPES = [
    'text', 'string', 'select', 'radio', 'email', 'tel', 'url', 'password',
    'date', 'api-dropdown', 'api-dropdown-transactional',
] as const;

// Native <input> type values that can be forwarded to the Input component
export const NATIVE_INPUT_TYPES = ['number', 'email', 'password', 'tel', 'url'] as const;

// Screen actions that put the entire form into read-only mode
export const DISABLED_FORM_ACTIONS = ['delete', 'enquire', 'review'] as const;

// Grid class by column count
export const GRID_COLS_CLASS: Record<number, string> = {
    1: 'grid-cols-1',
    2: 'md:grid-cols-2',
    3: 'md:grid-cols-2 lg:grid-cols-3',
};

export const DEFAULT_GRID_CLASS = 'md:grid-cols-2 lg:grid-cols-3';

export const REQUIRED_ASTERISK_CLASS = 'ml-0.5 text-destructive';
export const LABEL_CLASS = 'text-sm font-semibold text-muted-foreground tracking-wide';
export const ERROR_TEXT_CLASS = 'text-xs font-medium text-destructive';
export const FORM_WRAPPER_CLASS = 'p-6 border rounded-md bg-card w-full';
export const ACTIONS_BAR_CLASS = 'flex gap-3 justify-end pt-4 border-t mt-6';
