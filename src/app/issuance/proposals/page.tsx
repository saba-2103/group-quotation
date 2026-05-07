import React from 'react';
import { WidgetRenderer } from '@/components/registry/WidgetRenderer';
import { resolveSchemaRefs } from '@/lib/schemaResolver';
import proposalListSchema from '../../../../schemas/proposal.json';

export default async function ProposalsListPage() {
  const resolved = await resolveSchemaRefs(proposalListSchema);
  return (
    <div className="w-full h-full bg-background text-foreground">
      <WidgetRenderer config={resolved} />
    </div>
  );
}
