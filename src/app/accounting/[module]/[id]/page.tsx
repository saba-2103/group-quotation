import { Suspense } from 'react';
import { notFound } from 'next/navigation';
import { existsSync, readFileSync } from 'fs';
import path from 'path';
export const dynamic = 'force-dynamic';
import { WidgetRenderer } from '@/components/registry/WidgetRenderer';
import { WidgetConfig } from '@/types/widget';
import { resolveSchemaRefs } from '@/lib/schemaResolver';

const VALID_MODULE_SLUG = /^[a-z][a-z0-9-]*$/;

export default async function AccountingDetailPage(props: { params: Promise<{ module: string; id: string }> }) {
    const { module, id } = await props.params;

    if (!VALID_MODULE_SLUG.test(module)) notFound();

    const schemaFilePath = path.join(process.cwd(), 'schemas', `${module}-detail.json`);
    if (!existsSync(schemaFilePath)) notFound();

    const rawSchema = JSON.parse(readFileSync(schemaFilePath, 'utf-8')) as object;
    const resolvedRawSchema = await resolveSchemaRefs(rawSchema, process.cwd());
    const config = JSON.parse(
        JSON.stringify(resolvedRawSchema).replaceAll('{{id}}', id)
    ) as WidgetConfig;

    return (
        <div className="min-h-screen bg-background">
            <Suspense fallback={<div className="p-8 text-center text-muted-foreground">Loading...</div>}>
                <WidgetRenderer config={config} />
            </Suspense>
        </div>
    );
}
