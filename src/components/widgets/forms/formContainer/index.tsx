'use client';

import React from 'react';
import { WidgetConfig } from '@/types/widget';
import { FieldError } from 'react-hook-form';
import { Form, FormField, FormItem, FormLabel, FormControl, FormDescription } from '@/components/ui/form';
import { Button } from '@/components/ui/button';
import { ContextHelpTooltip } from '../../items/ContextHelpTooltip';
import { FormFieldConfig, FormAction, BackendError, FormValues } from './types';
import { isRequiredField, isFieldDisabled } from './utils';
import { useFormContainer } from './useFormContainer';
import FieldRenderer from './FieldRenderer';
import FieldErrors from './FieldErrors';
import { LABEL_CLASS, REQUIRED_ASTERISK_CLASS, FORM_WRAPPER_CLASS, ACTIONS_BAR_CLASS, DEFAULT_GRID_CLASS, GRID_COLS_CLASS } from './constants';

const getGridClass = (columns?: number): string =>
    columns ? (GRID_COLS_CLASS[columns] ?? DEFAULT_GRID_CLASS) : DEFAULT_GRID_CLASS;

export const FormContainer: React.FC<{ config: WidgetConfig }> = ({ config }) => {
    const {
        fields = [] as FormFieldConfig[],
        actions = [] as FormAction[],
        columns,
        mode,
        action,
        showReset,
        backendErrors = [] as BackendError[],
    } = config.props || {};

    const {
        form,
        formDisabled,
        screenAction,
        dateFormat,
        isFieldVisible,
        resetToEntry,
        onSubmit,
        isValid,
        isSubmitting,
    } = useFormContainer({
        fields: fields as FormFieldConfig[],
        actions: actions as FormAction[],
        action,
        backendErrors: backendErrors as BackendError[],
    });

    const isViewMode = mode === 'view';
    const showActions = !isViewMode && !formDisabled && (actions as FormAction[]).length > 0;

    return (
        <div className={FORM_WRAPPER_CLASS}>
            <Form {...form}>
                <form onSubmit={onSubmit} className="space-y-6">
                    <div className={`grid grid-cols-1 gap-6 ${getGridClass(columns)}`}>
                        {(fields as FormFieldConfig[]).map((field) => {
                            if (!isFieldVisible(field)) return null;

                            const required = isRequiredField(field, screenAction);
                            const disabled = isFieldDisabled(field, screenAction);

                            return (
                                <FormField<FormValues, typeof field.name>
                                    key={field.name}
                                    control={form.control}
                                    name={field.name as keyof FormValues}
                                    render={({ field: fieldProps }) => (
                                        <FormItem className={field.span ? `col-span-${field.span}` : ''}>
                                            <FormLabel className={LABEL_CLASS}>
                                                {field.label}
                                                {required && <span className={REQUIRED_ASTERISK_CLASS}>*</span>}
                                            </FormLabel>

                                            <ContextHelpTooltip helpText={field.helpText ?? ''}>
                                                <FormControl>
                                                    <FieldRenderer
                                                        field={field}
                                                        fieldProps={fieldProps}
                                                        isDisabled={disabled}
                                                        isRequired={required}
                                                        isViewMode={isViewMode}
                                                        dateFormat={dateFormat}
                                                    />
                                                </FormControl>
                                            </ContextHelpTooltip>

                                            {field.helperText && <FormDescription>{field.helperText}</FormDescription>}

                                            <FieldErrors errors={form.formState.errors[field.name] as FieldError | undefined} />
                                        </FormItem>
                                    )}
                                />
                            );
                        })}
                    </div>

                    {showActions && (
                        <div className={ACTIONS_BAR_CLASS}>
                            {showReset && (
                                <Button type="button" variant="outline" onClick={resetToEntry}>
                                    Reset
                                </Button>
                            )}
                            {(actions as FormAction[]).map((act) => (
                                <Button
                                    key={act.id}
                                    type={act.submitAction ? 'submit' : 'button'}
                                    variant={act.variant ?? 'default'}
                                    disabled={act.submitAction ? (!isValid || isSubmitting) : false}
                                    onClick={!act.submitAction ? (e) => { e.preventDefault(); } : undefined}
                                >
                                    {act.label}
                                </Button>
                            ))}
                        </div>
                    )}
                </form>
            </Form>
        </div>
    );
};
