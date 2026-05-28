import React from 'react';
import { WidgetRenderer } from '@/components/registry/WidgetRenderer';
import { resolveSchemaRefs } from '@/lib/schemaResolver';
import policyListSchema from '../../../../schemas/policy.json';

export default async function PoliciesListPage() {
  const resolved = await resolveSchemaRefs(policyListSchema);
  return (
    <div className="w-full h-full bg-background text-foreground">
      <WidgetRenderer config={resolved} />
    </div>
  );
}
