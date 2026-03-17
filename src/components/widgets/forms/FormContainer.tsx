"use client";

import React, { useMemo, useState } from 'react';
import { WidgetConfig } from '@/types/widget';
import { useForm, useWatch } from 'react-hook-form';
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage, FormDescription } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { useActionHandler } from '@/hooks/useActionHandler';
import { useOverlayStore } from '@/hooks/useOverlayStore';
import { CalendarIcon } from 'lucide-react';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { evaluateCondition } from '@/lib/conditions';

// Helper to determine display value for view mode
const ViewField = ({ field, value }: { field: any, value: any }) => {
    const getDisplayValue = (): string => {
        if (value === undefined || value === null || value === "") return "—";

        if (field.type === "select" || field.type === "radio") {
            const option = field.options?.find((opt: any) => opt.value === String(value));
            return option?.label || String(value);
        }

        if (field.type === "checkbox") {
            return value ? "Yes" : "No";
        }

        if (field.type === "date" && value) {
            const date = new Date(String(value));
            return date.toLocaleDateString("en-GB", {
                day: "2-digit",
                month: "2-digit",
                year: "numeric"
            });
        }

        return String(value);
    };

    const displayValue = getDisplayValue();

    const isYesNoField =
        (field.type === "select" || field.type === "radio") &&
        field.options?.length === 2 &&
        field.options.some((opt: any) => opt.value === "yes" || opt.value === "no");

    if (isYesNoField || field.type === "checkbox") {
        return <Badge variant="secondary">{displayValue}</Badge>;
    }

    if (field.type === "date" && value) {
        return (
            <div className="flex items-center gap-2">
                <CalendarIcon size={16} className="text-muted-foreground" />
                <span className="font-medium">{displayValue}</span>
            </div>
        );
    }

    return <p className="font-medium break-words">{displayValue}</p>;
};

export const FormContainer: React.FC<{ config: WidgetConfig }> = ({ config }) => {
    const { fields, actions, columns } = config.props || {};
    const handleAction = useActionHandler();
    const [submitError, setSubmitError] = useState<string | null>(null);
    const [submitSuccess, setSubmitSuccess] = useState<string | null>(null);

    // Dynamically build Zod schema from the schema validations
    const formSchema = useMemo(() => {
        let schemaObject: Record<string, any> = {};

        fields?.forEach((field: any) => {
            let fieldSchema: any = z.any();

            if (field.type === 'number') {
                fieldSchema = z.coerce.number();
            } else if (field.type === 'checkbox') {
                fieldSchema = z.boolean();
            } else {
                fieldSchema = z.string();
            }

            // Apply validations
            if (field.validations && Array.isArray(field.validations)) {
                let isRequired = false;
                field.validations.forEach((validation: any) => {
                    if (validation.rule === 'required') {
                        isRequired = true;
                        if (field.type === 'string' || !field.type || field.type === 'text' || field.type === 'select' || field.type === 'radio') {
                            fieldSchema = (fieldSchema as z.ZodString).min(1, { message: validation.message || "This field is required" });
                        }
                    } else if (validation.rule === 'min') {
                        if (field.type === 'number') {
                            fieldSchema = (fieldSchema as z.ZodNumber).min(validation.value, { message: validation.message });
                        } else if (field.type === 'string' || !field.type || field.type === 'text') {
                            fieldSchema = (fieldSchema as z.ZodString).min(validation.value, { message: validation.message });
                        }
                    } else if (validation.rule === 'max') {
                        if (field.type === 'number') {
                            fieldSchema = (fieldSchema as z.ZodNumber).max(validation.value, { message: validation.message });
                        } else if (field.type === 'string' || !field.type || field.type === 'text') {
                            fieldSchema = (fieldSchema as z.ZodString).max(validation.value, { message: validation.message });
                        }
                    }
                });

                if (!isRequired) {
                    fieldSchema = fieldSchema.optional();
                }
            } else {
                // Default to optional if no valid rules given
                fieldSchema = fieldSchema.optional();
            }

            schemaObject[field.name] = fieldSchema;
        });

        return z.object(schemaObject);
    }, [fields]);

    // Construct default values mapping
    const defaultValues = useMemo(() => {
        const defaults: Record<string, any> = {};
        fields?.forEach((field: any) => {
            if (field.defaultValue !== undefined) {
                defaults[field.name] = field.defaultValue;
            } else if (field.type === 'checkbox') {
                defaults[field.name] = false;
            } else {
                defaults[field.name] = '';
            }
        });
        return defaults;
    }, [fields]);

    const form = useForm({
        resolver: zodResolver(formSchema),
        defaultValues
    });

    const formValues = useWatch({ control: form.control });

    const onSubmit = async (data: any) => {
        // Filter out fields that are hidden by visibleWhen before submitting
        const visibleData = { ...data };
        fields?.forEach((field: any) => {
            if (field.visibleWhen && !evaluateCondition(field.visibleWhen, formValues)) {
                delete visibleData[field.name];
            }
        });

        const submitAction = actions?.find((a: any) => a.type === 'submit' || a.submitAction);
        if (submitAction) {
            setSubmitError(null);
            setSubmitSuccess(null);
            try {
                await handleAction({
                    ...submitAction,
                    type: submitAction.api ? 'api-mutation' : (submitAction.type === 'submit' ? 'api-mutation' : submitAction.type),
                    api: {
                        ...submitAction.api,
                        body: visibleData
                    }
                });
                setSubmitSuccess(submitAction.successMessage || "Operation successful");
                setTimeout(() => {
                    useOverlayStore.getState().close(config.id);
                }, 1500);
            } catch (err: any) {
                setSubmitError(err.message || "An error occurred");
            }
        } else {
            console.log('Form Submitted (No Endpoint configured):', visibleData);
        }
    };

    return (
        <div className="p-6 border rounded-md bg-card w-full">
            <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                    <div className={`grid grid-cols-1 gap-6 ${columns === 2 ? 'md:grid-cols-2' : 'md:grid-cols-2 lg:grid-cols-3'}`}>
                        {fields?.map((field: any) => {
                            // Verify visibility
                            const isVisible = evaluateCondition(field.visibleWhen, formValues);
                            if (!isVisible) return null;

                            return (
                                <FormField
                                    key={field.name}
                                    control={form.control}
                                    name={field.name}
                                    render={({ field: fieldProps }) => (
                                        <FormItem className={`flex flex-col justify-end ${field.span ? `col-span-${field.span}` : ''}`}>
                                            <FormLabel className="text-sm font-semibold text-muted-foreground tracking-wide">{field.label}</FormLabel>
                                            <FormControl>
                                                {config.props?.mode === 'view' ? (
                                                    <ViewField field={field} value={fieldProps.value} />
                                                ) : field.type === 'select' ? (
                                                    <Select onValueChange={fieldProps.onChange} defaultValue={fieldProps.value}>
                                                        <FormControl>
                                                            <SelectTrigger>
                                                                <SelectValue placeholder={field.placeholder || "Select an option"} />
                                                            </SelectTrigger>
                                                        </FormControl>
                                                        <SelectContent>
                                                            {field.options?.map((opt: any) => (
                                                                <SelectItem key={opt.value} value={opt.value}>
                                                                    {opt.label}
                                                                </SelectItem>
                                                            ))}
                                                        </SelectContent>
                                                    </Select>
                                                ) : field.type === 'radio' ? (
                                                    <div className="flex flex-col space-y-2 mt-2">
                                                        {field.options?.map((opt: any) => (
                                                            <div className="flex items-center space-x-2" key={opt.value}>
                                                                <input
                                                                    type="radio"
                                                                    id={`${field.name}-${opt.value}`}
                                                                    value={opt.value}
                                                                    checked={fieldProps.value === opt.value}
                                                                    onChange={(e) => fieldProps.onChange(e.target.value)}
                                                                    className="w-4 h-4 text-primary"
                                                                />
                                                                <label className="font-normal text-sm cursor-pointer" htmlFor={`${field.name}-${opt.value}`}>
                                                                    {opt.label}
                                                                </label>
                                                            </div>
                                                        ))}
                                                    </div>
                                                ) : field.type === 'checkbox' ? (
                                                    <div className="flex items-center space-x-2 mt-2">
                                                        <input
                                                            type="checkbox"
                                                            checked={fieldProps.value}
                                                            onChange={(e) => fieldProps.onChange(e.target.checked)}
                                                            className="w-4 h-4 text-primary rounded"
                                                        />
                                                        <label className="font-normal text-sm cursor-pointer leading-none">
                                                            {field.label}
                                                        </label>
                                                    </div>
                                                ) : field.type === 'textarea' ? (
                                                    <Textarea
                                                        placeholder={field.placeholder}
                                                        {...fieldProps}
                                                        value={fieldProps.value ?? ''}
                                                        disabled={field.disabled}
                                                    />
                                                ) : (
                                                    <Input
                                                        type={['date', 'number', 'email', 'password', 'tel', 'url'].includes(field.type) ? field.type : 'text'}
                                                        placeholder={field.placeholder}
                                                        {...fieldProps}
                                                        value={fieldProps.value ?? ''}
                                                        disabled={field.disabled}
                                                    />
                                                )}
                                            </FormControl>
                                            {field.helperText && <FormDescription>{field.helperText}</FormDescription>}
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            );
                        })}
                    </div>

                    {config.props?.mode !== 'view' && actions && actions.length > 0 && (
                        <div className="flex gap-4 justify-end pt-4 border-t mt-6">
                            {actions.map((action: any) => (
                                <Button
                                    key={action.id}
                                    type={action.submitAction ? 'submit' : 'button'}
                                    variant={action.variant || 'default'}
                                    onClick={!action.submitAction ? (e) => { e.preventDefault(); handleAction(action); } : undefined}
                                >
                                    {action.label}
                                </Button>
                            ))}
                        </div>
                    )}
                </form >
            </Form >
        </div >
    );
};
