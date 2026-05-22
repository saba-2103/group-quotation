'use client';

import React from 'react';
import { WidgetConfig } from '@/types/widget';
import { FieldError } from 'react-hook-form';
import { Form, FormField, FormItem, FormLabel, FormControl, FormDescription } from '@/components/ui/form';
import { Button } from '@/components/ui/button';
import { ContextHelpTooltip } from '../../items/ContextHelpTooltip';
import { ActionRenderer } from '../../controls/ActionRenderer';
import { FormFieldConfig, FormAction, BackendError, FormValues } from './types';
import { isRequiredField, isFieldDisabled } from './utils';
import { useFormContainer } from './useFormContainer';
import FieldRenderer from './FieldRenderer';
import FieldErrors from './FieldErrors';
import { LABEL_CLASS, REQUIRED_ASTERISK_CLASS, FORM_WRAPPER_CLASS, ACTIONS_BAR_CLASS } from './constants';

export const FormContainer: React.FC<{ config: WidgetConfig }> = ({ config }) => {
    const {
        fields = [] as FormFieldConfig[],
        actions = [] as FormAction[],
        columns,
        mode,
        disabled,
        showReset,
        backendErrors = [] as BackendError[],
    } = config.props || {};

    const {
        form,
        dateFormat,
        isFieldVisible,
        resetToEntry,
        onSubmit,
        isValid,
        isSubmitting,
    } = useFormContainer({
        fields: fields as FormFieldConfig[],
        actions: actions as FormAction[],
        backendErrors: backendErrors as BackendError[],
    });

    const isViewMode = mode === 'view' || disabled === true;
    const formActions = actions as FormAction[];
    const showActions = !isViewMode && formActions.length > 0;
    const gridColumns = typeof columns === 'number' && columns > 0 ? columns : 3;

    return (
        <div className={FORM_WRAPPER_CLASS}>
            <Form {...form}>
                <form onSubmit={onSubmit} className="space-y-6">
                    <div
                        // Use Tailwind md:grid-cols-{N} classes for common
                        // column counts so the layout is responsive (1 col on
                        // mobile, N on md+). Inline gridTemplateColumns is the
                        // fallback for unusual values (>4) so we don't ship
                        // unbounded dynamic class strings the Tailwind JIT
                        // cannot detect at build time.
                        className={
                            gridColumns === 1 ? 'grid grid-cols-1 gap-6'
                            : gridColumns === 2 ? 'grid grid-cols-1 md:grid-cols-2 gap-6'
                            : gridColumns === 3 ? 'grid grid-cols-1 md:grid-cols-3 gap-6'
                            : gridColumns === 4 ? 'grid grid-cols-1 md:grid-cols-4 gap-6'
                            : 'grid grid-cols-1 gap-6'
                        }
                        style={gridColumns > 4 ? { gridTemplateColumns: `repeat(${gridColumns}, minmax(0, 1fr))` } : undefined}
                    >
                        {(fields as FormFieldConfig[]).map((field) => {
                            if (!isFieldVisible(field)) return null;

                            const required = isRequiredField(field);
                            const fieldDisabled = isViewMode || isFieldDisabled(field);

                            return (
                                <FormField<FormValues, typeof field.name>
                                    key={field.name}
                                    control={form.control}
                                    name={field.name as keyof FormValues}
                                    render={({ field: fieldProps }) => (
                                        <FormItem
                                            // Use Tailwind col-span class for common spans (Tailwind
                                            // JIT scans source for the literal strings below) and
                                            // fall back to inline gridColumn for arbitrary values.
                                            className={
                                                field.span === 1 ? 'col-span-1'
                                                : field.span === 2 ? 'col-span-2'
                                                : field.span === 3 ? 'col-span-3'
                                                : field.span === 4 ? 'col-span-4'
                                                : undefined
                                            }
                                            style={field.span && field.span > 4 ? { gridColumn: `span ${field.span}` } : undefined}
                                        >
                                            <FormLabel className={LABEL_CLASS}>
                                                {field.label}
                                                {required && <span className={REQUIRED_ASTERISK_CLASS}>*</span>}
                                            </FormLabel>

                                            <ContextHelpTooltip helpText={field.helpText ?? ''}>
                                                <FormControl>
                                                    <FieldRenderer
                                                        field={field}
                                                        fieldProps={fieldProps}
                                                        isDisabled={fieldDisabled}
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
                            {formActions.map((act) => {
                                if (act.submitAction) {
                                    return (
                                        <Button
                                            key={act.id}
                                            type="submit"
                                            variant={act.variant ?? 'default'}
                                            // Disable only while submitting — react-hook-form's
                                            // mode defaults mean isValid is false until first
                                            // interaction, so gating on it hides validation
                                            // errors behind a permanently-disabled button.
                                            disabled={isSubmitting}
                                        >
                                            {act.label}
                                        </Button>
                                    );
                                }
                                return <ActionRenderer key={act.id} action={act} />;
                            })}
                        </div>
                    )}
                </form>
            </Form>
        </div>
    );
};
