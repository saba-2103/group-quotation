import React from 'react';
import { WidgetRenderer } from '@/components/registry/WidgetRenderer';
import { resolveSchemaRefs } from '@/lib/schemaResolver';
import accountingSchema from '../../../schemas/accounting.json';

export default async function AccountingPage() {
    // 1. Resolve $ref pointers server-side
    const resolvedSchema = await resolveSchemaRefs(accountingSchema);

    // 2. Render the massive stitched schema using the Registry
    return (
        <div className="w-full h-full bg-background text-foreground">
            <WidgetRenderer config={resolvedSchema} />
        </div>
    );
}
