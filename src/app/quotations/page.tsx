import { Suspense } from 'react';
import { WidgetRenderer } from '@/components/registry/WidgetRenderer';
import quotationsSchema from '../../../schemas/quotations.json';
import { WidgetConfig } from '@/types/widget';

export default function QuotationsPage() {
    return (
        <div className="min-h-screen bg-background">
            <Suspense fallback={<div className="p-8 text-center text-muted-foreground">Loading Quotations List...</div>}>
                <WidgetRenderer config={quotationsSchema as WidgetConfig} />
            </Suspense>
        </div>
    );
}
