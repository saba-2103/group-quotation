import React from 'react';
import { WidgetRenderer } from '@/components/registry/WidgetRenderer';
import { resolveSchemaRefs } from '@/lib/schemaResolver';
import quoteListSchema from '../../../schemas/quote.json';

export default async function QuotationListPage() {
  const resolved = await resolveSchemaRefs(quoteListSchema);
  return (
    <div className="w-full h-full bg-background text-foreground">
      <WidgetRenderer config={resolved} />
    </div>
  );
}
