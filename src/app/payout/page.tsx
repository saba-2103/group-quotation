import React from 'react';
import { WidgetRenderer } from '@/components/registry/WidgetRenderer';
import { resolveSchemaRefs } from '@/lib/schemaResolver';
import payoutSchema from '../../../schemas/payout.json';

export default async function PayoutPage() {
    // 1. Resolve $ref pointers server-side
    const resolvedSchema = await resolveSchemaRefs(payoutSchema);

    // 2. Render the massive stitched schema using the Registry
    return (
        <div className="w-full h-full bg-background text-foreground">
            <WidgetRenderer config={resolvedSchema} />
        </div>
    );
}
