import { WidgetRenderer } from '@/components/registry/WidgetRenderer';
import { resolveSchemaRefs } from '@/lib/schemaResolver';
import dashboardSchema from '../../schemas/dashboard.json';
import type { WidgetConfig } from '@/types/widget';

// Group PAS V1 dashboard. Renders schemas/dashboard.json, which surfaces:
//   - Three module cards (Quotation / Issuance / Policy Admin)
//   - Key metrics (pending quotes, new business)
//   - Quick actions
// The same schema also drives /test-dashboard (kept around for the schema
// engine smoke tests). Update the schema, both routes pick it up.
export default async function Home() {
  const resolved = await resolveSchemaRefs(dashboardSchema);
  return (
    <div className="w-full h-full bg-background text-foreground">
      <WidgetRenderer config={resolved as WidgetConfig} />
    </div>
  );
}
