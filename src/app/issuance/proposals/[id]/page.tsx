import { Suspense } from 'react';
import { notFound } from 'next/navigation';
import { existsSync, readFileSync } from 'fs';
import path from 'path';

import { DetailPageSkeleton } from '@/components/layout/DetailPageSkeleton';
import { WidgetRenderer } from '@/components/registry/WidgetRenderer';
import { resolveSchemaRefs } from '@/lib/schemaResolver';
import type { WidgetConfig } from '@/types/widget';

export const dynamic = 'force-dynamic';

const VALID_ID = /^[A-Za-z0-9_-]+$/;

export default async function ProposalDetailPage(props: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await props.params;
  if (!VALID_ID.test(id)) notFound();

  const schemaFilePath = path.join(process.cwd(), 'schemas', 'proposal-detail.json');
  if (!existsSync(schemaFilePath)) notFound();

  const raw = JSON.parse(readFileSync(schemaFilePath, 'utf-8')) as object;
  const resolved = await resolveSchemaRefs(raw, process.cwd());
  const config = JSON.parse(
    JSON.stringify(resolved).replaceAll('{{id}}', id),
  ) as WidgetConfig;

  return (
    <div className="min-h-screen bg-background">
      <Suspense fallback={<DetailPageSkeleton />}>
        <WidgetRenderer config={config} />
      </Suspense>
    </div>
  );
}
