// Census history landing page for a proposal. Renders the proposal-census
// tab schema with `{{id}}` substituted from the route param so the history
// data-table and the "Upload census" navigate target both point at this
// proposal. The form is on a sibling /census/new route (mirrors the
// add-member /members/new pattern) so `{{policyId}}` substitution can
// happen server-side rather than threading rowData through a modal.

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

export default async function ProposalCensusListPage(props: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await props.params;
  if (!VALID_ID.test(id)) notFound();

  const tabSchemaPath = path.join(
    process.cwd(),
    'schemas',
    'tabs',
    'proposal',
    'census.json',
  );
  if (!existsSync(tabSchemaPath)) notFound();

  const rawTab = JSON.parse(readFileSync(tabSchemaPath, 'utf-8')) as object;
  const resolvedTab = await resolveSchemaRefs(rawTab, process.cwd());

  // The schema is authored as a `tab-panel` (it's normally a child of the
  // proposal-detail tabs-container). Standalone here, we unwrap it and
  // splice its children into our stack-layout, otherwise WidgetRenderer
  // bails with "Unknown Widget: tab-panel".
  const resolvedTabConfig = JSON.parse(
    JSON.stringify(resolvedTab).replaceAll('{{id}}', id),
  ) as WidgetConfig;
  const tabBodyChildren =
    resolvedTabConfig.type === 'tab-panel'
      ? resolvedTabConfig.children ?? []
      : [resolvedTabConfig];

  const page: WidgetConfig = {
    id: 'proposal-census-page',
    type: 'stack-layout',
    props: { className: 'p-6 gap-6' },
    children: [
      {
        id: 'census-page-header',
        type: 'page-header',
        props: {
          backHref: `/issuance/proposals/${id}`,
          backLabel: 'Back to proposal',
          title: `Census submissions — Proposal ${id}`,
          description:
            'Bulk-upload member census files. Each submission is parsed, validated row-by-row, and finalised to materialise members on the policy.',
        },
      },
      ...tabBodyChildren,
    ],
  };

  return (
    <div className="min-h-screen bg-background">
      <Suspense fallback={<DetailPageSkeleton />}>
        <WidgetRenderer config={page} />
      </Suspense>
    </div>
  );
}
