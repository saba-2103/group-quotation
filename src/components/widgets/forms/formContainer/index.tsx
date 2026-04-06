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
                        className="grid grid-cols-1 gap-6"
                        style={{ gridTemplateColumns: `repeat(${gridColumns}, minmax(0, 1fr))` }}
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
                                        <FormItem style={field.span ? { gridColumn: `span ${field.span}` } : undefined}>
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
                                            disabled={!isValid || isSubmitting}
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
