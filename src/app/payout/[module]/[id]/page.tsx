import { Suspense } from 'react';
export const dynamic = 'force-dynamic';
import { WidgetRenderer } from '@/components/registry/WidgetRenderer';
import { WidgetConfig } from '@/types/widget';
import { resolveSchemaRefs } from '@/lib/schemaResolver';

async function loadSchema(moduleSlug: string): Promise<WidgetConfig> {
    const schemaModule = await import(`../../../../../schemas/${moduleSlug}.json`);
    return schemaModule.default ?? schemaModule;
}

type ActionEntry = { api?: { endpoint?: string }; refreshKey?: string };
const ACTION_ARRAY_PROPS = ['headerActions', 'rowActions', 'actions'] as const;

// TODO: Move {{id}} under actionHandler or smartQuery or at somewhere correct function,
// Currently there is no support id resolution at runtime.
function replaceEndpointIds(node: WidgetConfig, id: string): void {
    const substitute = (s: string) => s.replace(/\{\{id\}\}/g, id);

    if (node.dataSource?.api?.endpoint) {
        node.dataSource.api.endpoint = substitute(node.dataSource.api.endpoint);
    }

    for (const propKey of ACTION_ARRAY_PROPS) {
        const actionList = node.props?.[propKey] as ActionEntry[] | undefined;
        if (!Array.isArray(actionList)) continue;
        for (const action of actionList) {
            if (action.api?.endpoint) action.api.endpoint = substitute(action.api.endpoint);
            if (action.refreshKey) action.refreshKey = substitute(action.refreshKey);
        }
    }

    node.children?.forEach((child) => replaceEndpointIds(child, id));
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
