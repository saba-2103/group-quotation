import * as z from 'zod';
import { ActionConfig } from '@/types/widget';

export type ScreenAction = 'add' | 'edit' | 'delete' | 'enquire' | 'review';

// Union of all possible values a form field can hold at runtime
export type FormFieldValue = string | number | boolean;

// Union of all values that can appear in a visibleWhen condition
export type ConditionValue = string | number | boolean | string[] | number[];

export interface SelectOption {
    value: string;
    label: string;
}

export interface FieldValidation {
    rule: 'required' | 'min' | 'max' | 'regex';
    value?: number | string;
    message?: string;
}

export interface VisibleWhenCondition {
    field: string;
    operator: 'eq' | 'neq' | 'gt' | 'lt' | 'gte' | 'lte' | 'in' | 'notIn';
    value: ConditionValue;
}

export interface FormFieldConfig {
    name: string;
    label: string;
    type?: string;
    placeholder?: string;
    disabled?: boolean;
    isPrimaryKey?: boolean;
    helpText?: string;
    helperText?: string;
    defaultValue?: FormFieldValue;
    validations?: FieldValidation[];
    options?: SelectOption[];
    visibleWhen?: VisibleWhenCondition;
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
