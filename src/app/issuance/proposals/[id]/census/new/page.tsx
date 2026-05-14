// Bulk-upload entry point. Renders the upload-census-form (from the
// schemas registry, with `{{policyId}}` substituted), alongside a static
// "what we expect" reference panel and template downloads. The form's
// submit does the two-step initiate-JSON → PUT-file flow defined by the
// CensusSubmissionAPI in docs/spec/issuance/IssuanceApi.api, then chains
// the /ingest call and navigates to the submission detail page.

import React from 'react';
import { notFound } from 'next/navigation';

import { WidgetRenderer } from '@/components/registry/WidgetRenderer';
import type { WidgetConfig } from '@/types/widget';
import { forms_registry } from '../../../../../../../schemas/forms';

export const dynamic = 'force-dynamic';

const VALID_ID = /^[A-Za-z0-9_-]+$/;

// Aligned with CreatePolicyMemberRequest in docs/spec/issuance/IssuanceApi.api.
// `dob`, `gender`, `salary`, `occupation` are optional on the wire; everything
// else is required.
const EXPECTED_COLUMNS: Array<{
  name: string;
  required: boolean;
  example: string;
  notes: string;
}> = [
  { name: 'memberId', required: true, example: 'EMP-1001', notes: 'Your HR/loan-system ID. Must be unique within this submission.' },
  { name: 'planNo', required: true, example: 'PLAN-A', notes: 'Plan code from the parent proposal.' },
  { name: 'name', required: true, example: 'Aisha Khan', notes: 'Full legal name on the policy.' },
  { name: 'sumInsured', required: true, example: '3600000', notes: 'In policy currency. Numeric only.' },
  { name: 'dob', required: false, example: '1989-04-12', notes: 'ISO date (YYYY-MM-DD). Drives age-based rating.' },
  { name: 'gender', required: false, example: 'F', notes: 'Single character (M / F / O).' },
  { name: 'salary', required: false, example: '1200000', notes: 'Annual gross, in policy currency.' },
  { name: 'occupation', required: false, example: 'Software Engineer', notes: 'Free-text; may drive UW classification.' },
];

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
    props: { className: 'p-6 gap-6' },
    children: [
      {
        id: 'upload-census-header',
        type: 'page-header',
        props: {
          backHref: `/issuance/proposals/${id}/census`,
          backLabel: 'Back to census history',
          title: `Upload census — Proposal ${id}`,
          description:
            'Upload a CSV or XLSX with one row per member. We initiate the submission, upload the file, parse it, and take you to the row-validation view to fix any rejects before finalising.',
        },
      },
      {
        id: 'upload-census-templates',
        type: 'quick-links-widget',
        props: {
          title: 'Start from a template',
          layout: 'grid',
          links: [
            {
              id: 'template-gtl',
              type: 'card',
              label: 'Download GTL template (CSV)',
              description:
                'Standard Group Term Life census — required + optional columns, one example row per plan.',
              icon: 'FileDown',
              action: {
                id: 'download-gtl-template',
                type: 'api-download',
                api: { endpoint: '/templates/census-gtl.csv', method: 'GET' },
                filename: 'census-gtl-template.csv',
              },
            },
            {
              id: 'template-gcl',
              type: 'card',
              label: 'Download GCL template (CSV)',
              description:
                'Standard Group Credit Life census — same columns, GCL-friendly example data.',
              icon: 'FileDown',
              action: {
                id: 'download-gcl-template',
                type: 'api-download',
                api: { endpoint: '/templates/census-gcl.csv', method: 'GET' },
                filename: 'census-gcl-template.csv',
              },
            },
          ],
        },
      },
      {
        id: 'upload-census-body',
        type: 'grid-layout',
        props: { columns: 2, gap: 6 },
        children: [
          formConfig,
          {
            id: 'upload-census-columns-reference',
            type: 'stack-layout',
            props: {
              className:
                'gap-3 p-6 bg-card rounded-lg border border-border/80 shadow-sm',
            },
            children: [
              {
                id: 'columns-reference-title',
                type: 'page-header',
                props: {
                  title: 'Expected columns',
                  description:
                    'Headers must match these names exactly. Required columns are marked.',
                },
              },
              {
                id: 'columns-reference-table',
                type: 'data-table',
                props: {
                  hideToolbar: true,
                  data: EXPECTED_COLUMNS.map((c, idx) => ({
                    id: `col-${idx}`,
                    name: c.name,
                    required: c.required ? 'Required' : 'Optional',
                    example: c.example,
                    notes: c.notes,
                  })),
                  columns: [
                    { id: 'name', accessorKey: 'name', label: 'Column' },
                    {
                      id: 'required',
                      accessorKey: 'required',
                      label: 'Requirement',
                      type: 'badge',
                      valueMapping: [
                        { value: 'Required', label: 'Required', variant: 'destructive' },
                        { value: 'Optional', label: 'Optional', variant: 'secondary' },
                      ],
                    },
                    { id: 'example', accessorKey: 'example', label: 'Example' },
                    { id: 'notes', accessorKey: 'notes', label: 'Notes' },
                  ],
                },
              },
            ],
          },
        ],
      },
    ],
  };

  return (
    <div className="min-h-screen bg-background">
      <WidgetRenderer config={config} />
    </div>
  );
}
