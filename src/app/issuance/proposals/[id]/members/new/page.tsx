import React from 'react';
import { WidgetRenderer } from '@/components/registry/WidgetRenderer';
import type { WidgetConfig } from '@/types/widget';
import { forms_registry } from '../../../../../../../schemas/forms';

export const dynamic = 'force-dynamic';

export default async function ProposalAddMemberPage(props: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await props.params;
  const formConfig = forms_registry['add-policy-member-form'] as WidgetConfig;
  const config: WidgetConfig = {
    id: 'add-policy-member-page',
    type: 'stack-layout',
    props: { className: 'p-6 gap-4' },
    children: [
      {
        id: 'add-pm-header',
        type: 'page-header',
        props: {
          title: `Add member to proposal ${id}`,
          description:
            'Single-step form. Saving creates a PolicyMember in CREATED state; the workflow then prices and classifies it.',
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
