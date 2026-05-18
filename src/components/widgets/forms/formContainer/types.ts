import * as z from 'zod';
import { ActionConfig, DataSourceConfig } from '@/types/widget';
import { VisibilityCondition } from '@/lib/conditions';

export type ScreenAction = string;

// Union of all possible values a form field can hold at runtime
export type FormFieldValue = string | number | boolean;

export interface SelectOption {
    value: string;
    label: string;
}

export interface FieldValidation {
    rule: string;
    value?: number | string;
    message?: string;
}

export interface FormFieldConfig {
    name: string;
    label: string;
    type?: string;
    placeholder?: string;
    disabled?: boolean;
    /** Controls view-mode presentation. Backend sets this explicitly — never inferred from field type or option values. */
    displayStyle?: string;
    helpText?: string;
    helperText?: string;
    defaultValue?: FormFieldValue;
    validations?: FieldValidation[];
    options?: SelectOption[];
    /**
     * Dynamic-options binding for `select` (and api-dropdown) fields. When set,
     * the field issues a useSmartQuery against `dataSource` and maps the
     * response array using `optionLabel` / `optionValue` to populate the
     * dropdown. `options` (static) wins if both are present.
     */
    dataSource?: DataSourceConfig;
    optionLabel?: string;
    optionValue?: string;
    visibleWhen?: VisibilityCondition;
    span?: number;
    // api-dropdown fields
    variableCode?: string;
    entityId?: string;
    language?: string;
    endpoint?: string;
}

// Extends ActionConfig with submitAction flag used only by FormContainer
export type FormAction = ActionConfig & { submitAction?: boolean };

export interface BackendError {
    variable_code: string;
    error_code: string;
    error_desc: string;
}

export type FormValues = Record<string, FormFieldValue>;

// Union of all concrete Zod schema types used in FormContainer field schemas
export type FieldSchema = z.ZodString | z.ZodNumber | z.ZodBoolean;
