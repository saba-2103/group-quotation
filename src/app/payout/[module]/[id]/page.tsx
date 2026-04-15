import { Suspense } from 'react';
export const dynamic = 'force-dynamic';
import { WidgetRenderer } from '@/components/registry/WidgetRenderer';
import { WidgetConfig } from '@/types/widget';
import { resolveSchemaRefs } from '@/lib/schemaResolver';

async function loadSchema(moduleSlug: string): Promise<WidgetConfig> {
    const schemaModule = await import(`../../../../../schemas/${moduleSlug}.json`);
    return schemaModule.default ?? schemaModule;
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
