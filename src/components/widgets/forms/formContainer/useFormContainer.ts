'use client';

import { useMemo, useEffect, useRef, useCallback } from 'react';
import { useForm, useWatch, UseFormReturn, SubmitHandler, Resolver } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useActionHandler } from '@/hooks/useActionHandler';
import { useTenantConfig, DateFormat } from '@/contexts/TenantConfigContext';
import { ActionConfig } from '@/types/widget';
import { FormFieldConfig, FormAction, BackendError, FormValues } from './types';
import { buildFormSchema, buildDefaultValues } from './utils';
import { evaluateCondition } from '@/lib/conditions';

interface UseFormContainerOptions {
    fields: FormFieldConfig[];
    actions: FormAction[];
    backendErrors?: BackendError[];
}

interface UseFormContainerReturn {
    form: UseFormReturn<FormValues>;
    formValues: FormValues;
    dateFormat: DateFormat;
    isFieldVisible: (field: FormFieldConfig) => boolean;
    resetToEntry: () => void;
    onSubmit: (e?: React.BaseSyntheticEvent) => Promise<void>;
    isValid: boolean;
    isSubmitting: boolean;
    handleAction: (action: ActionConfig) => Promise<void>;
}

export const useFormContainer = ({
    fields,
    actions,
    backendErrors = [],
}: UseFormContainerOptions): UseFormContainerReturn => {
    const handleAction = useActionHandler();
    const { dateFormat } = useTenantConfig();

    const formSchema = useMemo(() => buildFormSchema(fields), [fields]);
    const defaultValues = useMemo(() => buildDefaultValues(fields), [fields]);

    const entrySnapshot = useRef<FormValues>(defaultValues);

    // resetToEntry() restores the entry-time values
    useEffect(() => {
        entrySnapshot.current = defaultValues;
    }, [defaultValues]);

    const form = useForm<FormValues>({
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

    const handleSubmit: SubmitHandler<FormValues> = useCallback(async (data) => {
        const visibleData: FormValues = { ...data };
        fields.forEach((field) => {
            if (field.visibleWhen && !evaluateCondition(field.visibleWhen, formValues)) {
                delete visibleData[field.name];
            }
        });

        const submitAction = actions.find((a) => a.submitAction);
        if (!submitAction) {
            // No submit endpoint configured — log the payload so developers
            // can still verify form wiring during schema authoring without
            // calling the action handler (which would no-op anyway).
            // eslint-disable-next-line no-console
            console.log('Form Submitted (No Endpoint configured):', visibleData);
            return;
        }

        if (submitAction.type === 'api-mutation') {
            await handleAction({ ...submitAction, api: { ...submitAction.api, body: visibleData } });
        } else {
            await handleAction(submitAction);
        }
    }, [actions, fields, formValues, handleAction]);

    return {
        form,
        formValues,
        dateFormat,
        isFieldVisible: (field) => evaluateCondition(field.visibleWhen, formValues),
        resetToEntry: () => form.reset(entrySnapshot.current),
        onSubmit: form.handleSubmit(handleSubmit),
        isValid: form.formState.isValid,
        isSubmitting: form.formState.isSubmitting,
        handleAction,
    };
};
