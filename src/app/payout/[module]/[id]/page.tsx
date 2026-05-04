import { Suspense } from 'react';
export const dynamic = 'force-dynamic';
import { notFound } from 'next/navigation';
import { WidgetRenderer } from '@/components/registry/WidgetRenderer';
import { WidgetConfig } from '@/types/widget';
import { resolveSchemaRefs } from '@/lib/schemaResolver';

type SchemaLoader = () => Promise<{ default: WidgetConfig }>;

const SUPPORTED_PAYOUT_DETAIL_SCHEMAS: Record<string, SchemaLoader> = {
    'payout-enquiry-detail': () => import('../../../../../schemas/payout-enquiry-detail.json') as Promise<{ default: WidgetConfig }>,
};

async function loadSchema(moduleSlug: string): Promise<WidgetConfig> {
    const schemaLoader = SUPPORTED_PAYOUT_DETAIL_SCHEMAS[moduleSlug];
    if (!schemaLoader) notFound();
    try {
        const schemaModule = await schemaLoader();
        return schemaModule.default;
    } catch {
        notFound();
    }
}

function replaceEndpointIds(node: WidgetConfig, id: string): void {
    if (node.dataSource?.api?.endpoint?.includes('{{id}}')) {
        node.dataSource.api.endpoint = node.dataSource.api.endpoint.replace('{{id}}', id);
    }
    node.children?.forEach(child => replaceEndpointIds(child, id));
}

export default async function PayoutModuleDetailPage(
    props: { params: Promise<{ module: string; id: string }> }
) {
    const { module: moduleSlug, id } = await props.params;

    const rawSchema = await loadSchema(moduleSlug);
    const resolvedRawSchema = await resolveSchemaRefs(rawSchema, process.cwd());
    const config = JSON.parse(JSON.stringify(resolvedRawSchema)) as WidgetConfig;

    replaceEndpointIds(config, id);

    return (
        <div className="min-h-screen bg-background">
            <Suspense fallback={<div className="p-8 text-center text-muted-foreground">Loading...</div>}>
                <WidgetRenderer config={config} />
            </Suspense>
        </div>
    );
}
