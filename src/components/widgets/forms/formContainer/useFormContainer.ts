'use client';

import { useMemo, useEffect, useRef, useCallback } from 'react';
import { useForm, useWatch, UseFormReturn, SubmitHandler, Resolver } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useActionHandler } from '@/hooks/useActionHandler';
import { useTenantConfig, DateFormat } from '@/contexts/TenantConfigContext';
import { ActionConfig } from '@/types/widget';
import { toast } from '@/components/ui/toast';
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
    handleAction: (action: ActionConfig, rowData?: Record<string, unknown>) => Promise<void>;
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
            // No submit endpoint configured. Surface a dev-only warning with
            // just the field names so schema authors can see what would have
            // been sent — but never log values (could be PII/secrets) and
            // never log in production builds (noise + accidental leak vector).
            if (process.env.NODE_ENV !== 'production') {
                // eslint-disable-next-line no-console
                console.warn(
                    '[FormContainer] Submit attempted but no submitAction is configured. Field names:',
                    Object.keys(visibleData),
                );
            }
            return;
        }

        // Two-step file-upload semantics (PROP-0001 census submission).
        // When the submit action declares `uploadField`, we:
        //   1. POST the form body (file field omitted) to api.endpoint and
        //      expect { submissionId, uploadUrl, ... }
        //   2. PUT the named File to the returned uploadUrl
        //   3. Dispatch onSuccess[] with the initiate response merged into
        //      rowData so downstream `{{submissionId}}` substitutions resolve.
        if (
            submitAction.type === 'api-mutation' &&
            'uploadField' in submitAction &&
            submitAction.uploadField
        ) {
            const fieldName = submitAction.uploadField;
            const file = visibleData[fieldName];
            const jsonBody: FormValues = { ...visibleData };
            delete jsonBody[fieldName];

            if (!(typeof File !== 'undefined' && file instanceof File)) {
                toast.error('Please select a file to upload');
                return;
            }

            try {
                // Step 1 — initiate
                const initRes = await fetch(submitAction.api.endpoint, {
                    method: submitAction.api.method,
                    body: JSON.stringify(jsonBody),
                    headers: { 'Content-Type': 'application/json' },
                });
                if (!initRes.ok) {
                    let msg = `Initiate failed: ${initRes.statusText}`;
                    try {
                        const text = await initRes.text();
                        if (text) {
                            const err = JSON.parse(text);
                            if (err.message) msg = err.message;
                            else if (err.error) msg = err.error;
                        }
                    } catch { /* keep statusText */ }
                    throw new Error(msg);
                }
                const initData = (await initRes.json()) as Record<string, unknown>;
                const uploadUrl =
                    typeof initData?.uploadUrl === 'string' ? initData.uploadUrl : undefined;
                if (!uploadUrl) {
                    throw new Error('Initiate response missing uploadUrl');
                }

                // Step 2 — PUT the file blob to the (proxied) upload URL.
                const putRes = await fetch(uploadUrl, {
                    method: 'PUT',
                    body: file,
                    headers: file.type ? { 'Content-Type': file.type } : undefined,
                });
                if (!putRes.ok) {
                    throw new Error(`Upload failed: ${putRes.statusText}`);
                }

                if (submitAction.successMessage) {
                    toast.success(submitAction.successMessage);
                }
                // Run onSuccess[] with the initiate payload's fields substituted
                // into `{{key}}` placeholders on each follow-up action so
                // navigate targets and chained api endpoints can interpolate
                // {{submissionId}} from the initiate response.
                if (submitAction.onSuccess?.length) {
                    const interpolated = submitAction.onSuccess.map((next) => {
                        let s = JSON.stringify(next);
                        for (const [k, v] of Object.entries(initData as Record<string, unknown>)) {
                            if (v === null || v === undefined) continue;
                            const stringV = typeof v === 'string' || typeof v === 'number' || typeof v === 'boolean' ? String(v) : '';
                            if (stringV !== '') {
                                s = s.split(`{{${k}}}`).join(stringV);
                            }
                        }
                        return JSON.parse(s) as ActionConfig;
                    });
                    for (const next of interpolated) {
                        await handleAction(next, initData as Record<string, unknown>);
                    }
                }
            } catch (err) {
                const message =
                    err instanceof Error && err.message ? err.message : 'Upload failed';
                toast.error(message);
                throw err;
            }
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
