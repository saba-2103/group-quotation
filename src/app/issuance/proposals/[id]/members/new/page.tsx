import React from 'react';
import { WidgetRenderer } from '@/components/registry/WidgetRenderer';
import type { WidgetConfig } from '@/types/widget';
import { forms_registry } from '../../../../../../../schemas/forms';

export const dynamic = 'force-dynamic';

export default async function ProposalAddMemberPage(props: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await props.params;
  const formTemplate = forms_registry['add-policy-member-form'] as WidgetConfig;
  // Substitute {{proposalId}} so the form's POST + refresh hit this proposal's
  // policy-resolving endpoint. The form schema lives in the registry without
  // route context; this is the cheapest way to inject it.
  const formConfig = JSON.parse(
    JSON.stringify(formTemplate).replaceAll('{{proposalId}}', id),
  ) as WidgetConfig;
  const config: WidgetConfig = {
    id: 'add-policy-member-page',
    type: 'stack-layout',
    props: { className: 'p-6 gap-4' },
    children: [
      {
        id: 'add-pm-header',
        type: 'page-header',
        props: {
          backHref: `/issuance/proposals/${id}`,
          backLabel: 'Back to proposal',
          title: `Add member to proposal ${id}`,
          description:
            "Single-step form. The proposal's policy must already exist (POLICY_CREATED state) for the add to succeed.",
        },
      },
      formConfig,
    ],
  } as unknown as WidgetConfig;
  return (
    <div className="min-h-screen bg-background">
      <WidgetRenderer config={config} />
    </div>
  );
}
