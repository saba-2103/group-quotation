// Protocol name for the required validation rule — agreed contract between backend and frontend.
// Single definition so renaming requires only one change.
export const REQUIRED_RULE = 'required' as const;

// Native <input> type values that can be forwarded to the Input component
export const NATIVE_INPUT_TYPES = ['number', 'email', 'password', 'tel', 'url'] as const;

export const REQUIRED_ASTERISK_CLASS = 'ml-0.5 text-destructive';
export const LABEL_CLASS = 'text-sm font-semibold text-muted-foreground tracking-wide';
export const ERROR_TEXT_CLASS = 'text-xs font-medium text-destructive';
export const FORM_WRAPPER_CLASS = 'p-6 border rounded-md bg-card w-full';
export const ACTIONS_BAR_CLASS = 'flex gap-3 justify-end pt-4 border-t mt-6';
