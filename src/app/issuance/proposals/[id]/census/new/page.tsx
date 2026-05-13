// Bulk-upload entry point. Mirrors the /members/new pattern: takes the
// upload-census-form template from the registry, substitutes `{{policyId}}`
// (proposalId is the policyId at proposal stage per the existing schemas),
// and renders the form server-side so the two-step submit (initiate JSON →
// PUT file) hits this proposal's policy endpoints. After success the form's
// `onSuccess[]` navigates to the submission detail page.

import React from 'react';
import { notFound } from 'next/navigation';

import { WidgetRenderer } from '@/components/registry/WidgetRenderer';
import type { WidgetConfig } from '@/types/widget';
import { forms_registry } from '../../../../../../../../schemas/forms';

export const dynamic = 'force-dynamic';

const VALID_ID = /^[A-Za-z0-9_-]+$/;

export default async function ProposalCensusUploadPage(props: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await props.params;
  if (!VALID_ID.test(id)) notFound();

  const formTemplate = forms_registry['upload-census-form'] as
    | WidgetConfig
    | undefined;
  if (!formTemplate) notFound();

  const formConfig = JSON.parse(
    JSON.stringify(formTemplate).replaceAll('{{policyId}}', id),
  ) as WidgetConfig;

  const config: WidgetConfig = {
    id: 'upload-census-page',
    type: 'stack-layout',
    props: { className: 'p-6 gap-4' },
    children: [
      {
        id: 'upload-census-header',
        type: 'page-header',
        props: {
          backHref: `/issuance/proposals/${id}/census`,
          backLabel: 'Back to census history',
          title: `Upload census — Proposal ${id}`,
          description:
            'Pick a CSV or XLSX. We initiate the submission, upload the file, then parse it. You will land on the row-validation view next.',
        },
      },
      formConfig,
    ],
  };

  return (
    <div className="min-h-screen bg-background">
      <WidgetRenderer config={config} />
    </div>
  );
}
