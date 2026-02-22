import { Suspense } from 'react';
import { WidgetRenderer } from '@/components/registry/WidgetRenderer';
import quotationsDetailSchema from '../../../../schemas/quotations-detail.json';
import { WidgetConfig } from '@/types/widget';

export default async function QuotationDetailPage(props: { params: Promise<{ id: string }> }) {
    const params = await props.params;
    const { id } = params;

    // Deep clone the schema so we don't mutate the imported JSON globally
    const config = JSON.parse(JSON.stringify(quotationsDetailSchema)) as WidgetConfig;

    // Streamlined intercept logic: replace {{id}} in any endpoint
    const updateEndpoints = (node: WidgetConfig) => {
        if (node.dataSource?.api?.endpoint?.includes('{{id}}')) {
            node.dataSource.api.endpoint = node.dataSource.api.endpoint.replace('{{id}}', id);
        }
        node.children?.forEach(updateEndpoints);
    };

    updateEndpoints(config);

    return (
        <div className="min-h-screen bg-background">
            <Suspense fallback={<div className="p-8 text-center text-muted-foreground">Loading Details...</div>}>
                <WidgetRenderer config={config} />
            </Suspense>
        </div>
    );
}
