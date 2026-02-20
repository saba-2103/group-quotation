"use client";

import React from 'react';
import { WidgetConfig } from '@/types/widget';
import { useForm } from 'react-hook-form';
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useActionHandler } from '@/hooks/useActionHandler';

export const FormContainer: React.FC<{ config: WidgetConfig }> = ({ config }) => {
    const { fields, actions } = config.props || {};
    const form = useForm();
    const handleAction = useActionHandler();

    const onSubmit = (data: any) => {
        // Find submit action
        const submitAction = actions?.find((a: any) => a.type === 'submit' || a.submitAction);
        if (submitAction) {
            handleAction({
                ...submitAction,
                api: {
                    ...submitAction.api,
                    body: data
                }
            });
        } else {
            console.log('Form Submitted:', data);
        }
    };

    return (
        <div className="p-4 border rounded-md">
            <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                    {fields?.map((field: any) => (
                        <FormField
                            key={field.name}
                            control={form.control}
                            name={field.name}
                            render={({ field: fieldProps }) => (
                                <FormItem>
                                    <FormLabel>{field.label}</FormLabel>
                                    <FormControl>
                                        <Input placeholder={field.placeholder} {...fieldProps} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                    ))}

                    <div className="flex gap-2 justify-end">
                        {actions?.map((action: any) => (
                            <Button
                                key={action.id}
                                type={action.submitAction ? 'submit' : 'button'}
                                variant={action.variant || 'default'}
                                onClick={!action.submitAction ? () => handleAction(action) : undefined}
                            >
                                {action.label}
                            </Button>
                        ))}
                    </div>
                </form>
            </Form>
        </div>
    );
};
