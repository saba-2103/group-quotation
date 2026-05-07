import React from 'react';
import { WidgetRenderer } from '@/components/registry/WidgetRenderer';
import { resolveSchemaRefs } from '@/lib/schemaResolver';
import clientListSchema from '../../../../schemas/client.json';

export default async function ClientsListPage() {
  const resolved = await resolveSchemaRefs(clientListSchema);
  return (
    <div className="w-full h-full bg-background text-foreground">
      <WidgetRenderer config={resolved} />
    </div>
  );
}
