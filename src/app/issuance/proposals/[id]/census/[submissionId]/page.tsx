// Census submission detail. Renders the views/census-submission-detail.json
// schema with `{{id}}` (proposalId) and `{{submissionId}}` substituted from
// the route params. The summary KVG polls `STANDARD_POLL_SCHEDULE` and stops
// when the submission status reaches COMPLETED or FAILED; the rows table
// reads /census-submissions/{id}/rows with a status filter chip.

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

export default async function CensusSubmissionDetailPage(props: {
  params: Promise<{ id: string; submissionId: string }>;
}) {
  const { id, submissionId } = await props.params;
  if (!VALID_ID.test(id) || !VALID_ID.test(submissionId)) notFound();

  const schemaFilePath = path.join(
    process.cwd(),
    'schemas',
    'views',
    'census-submission-detail.json',
  );
  if (!existsSync(schemaFilePath)) notFound();

  const raw = JSON.parse(readFileSync(schemaFilePath, 'utf-8')) as object;
  const resolved = await resolveSchemaRefs(raw, process.cwd());
  const config = JSON.parse(
    JSON.stringify(resolved)
      .replaceAll('{{id}}', id)
      .replaceAll('{{submissionId}}', submissionId),
  ) as WidgetConfig;

  return (
    <div className="min-h-screen bg-background">
      <Suspense fallback={<DetailPageSkeleton />}>
        <WidgetRenderer config={config} />
      </Suspense>
    </div>
  );
}
