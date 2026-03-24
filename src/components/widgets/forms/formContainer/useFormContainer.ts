'use client';

import { useMemo, useEffect, useRef } from 'react';
import { useForm, useWatch, UseFormReturn, SubmitHandler, Resolver } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useActionHandler } from '@/hooks/useActionHandler';
import { useTenantConfig, DateFormat } from '@/contexts/TenantConfigContext';
import { FormFieldConfig, FormAction, BackendError, ScreenAction, FormValues } from './types';
import { buildFormSchema, buildDefaultValues, evaluateCondition, isFormDisabled } from './utils';

interface UseFormContainerOptions {
    fields: FormFieldConfig[];
    actions: FormAction[];
    action?: ScreenAction;
    backendErrors?: BackendError[];
}

interface UseFormContainerReturn {
    form: UseFormReturn<FormValues>;
    formValues: FormValues;
    formDisabled: boolean;
    screenAction: ScreenAction | undefined;
    dateFormat: DateFormat;
    isFieldVisible: (field: FormFieldConfig) => boolean;
    resetToEntry: () => void;
    onSubmit: (e?: React.BaseSyntheticEvent) => Promise<void>;
    isValid: boolean;
    isSubmitting: boolean;
}

export const useFormContainer = ({
    fields,
    actions,
    action,
    backendErrors = [],
}: UseFormContainerOptions): UseFormContainerReturn => {
    const handleAction = useActionHandler();
    const { dateFormat } = useTenantConfig();

    const screenAction = action as ScreenAction | undefined;
    const formDisabled = isFormDisabled(screenAction);

    const formSchema = useMemo(() => buildFormSchema(fields, screenAction), [fields, screenAction]);
    const defaultValues = useMemo(() => buildDefaultValues(fields), [fields]);

    const entrySnapshot = useRef<FormValues>(defaultValues);

    const form = useForm<FormValues>({
        // zodResolver types its output as unknown for dynamically-built schemas;
        // the cast is safe because our schema validates exactly FormFieldValue types.
        resolver: zodResolver(formSchema) as Resolver<FormValues>,
        defaultValues,
        mode: 'onChange',
        criteriaMode: 'all',
    });

    const formValues = useWatch({ control: form.control }) as FormValues;

    useEffect(() => {
        if (!backendErrors.length) return;
        backendErrors.forEach((err) => {
            const fieldExists = fields.some((f) => f.name === err.variable_code);
            if (fieldExists) {
                form.setError(err.variable_code, { type: err.error_code, message: err.error_desc });
            }
        });
    }, [backendErrors, fields, form]);

    const handleSubmit: SubmitHandler<FormValues> = (data) => {
        const visibleData: FormValues = { ...data };
        fields.forEach((field) => {
            if (field.visibleWhen && !evaluateCondition(field.visibleWhen, formValues)) {
                delete visibleData[field.name];
            }
        });

        const submitAction = actions.find((a) => a.submitAction);
        if (!submitAction) return;

        if (submitAction.type === 'api-mutation') {
            handleAction({ ...submitAction, api: { ...submitAction.api, body: visibleData } });
        } else {
            handleAction(submitAction);
        }
    };

    return {
        form,
        formValues,
        formDisabled,
        screenAction,
        dateFormat,
        isFieldVisible: (field) => evaluateCondition(field.visibleWhen, formValues),
        resetToEntry: () => form.reset(entrySnapshot.current),
        onSubmit: form.handleSubmit(handleSubmit),
        isValid: form.formState.isValid,
        isSubmitting: form.formState.isSubmitting,
    };
};
