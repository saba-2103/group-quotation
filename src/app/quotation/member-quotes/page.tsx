import React from 'react';
import { WidgetRenderer } from '@/components/registry/WidgetRenderer';
import { resolveSchemaRefs } from '@/lib/schemaResolver';
import memberQuoteListSchema from '../../../../schemas/member-quote.json';

export default async function MemberQuoteListPage() {
  const resolved = await resolveSchemaRefs(memberQuoteListSchema);
  return (
    <div className="w-full h-full bg-background text-foreground">
      <WidgetRenderer config={resolved} />
    </div>
  );
}
