import { WidgetRenderer } from '@/components/registry/WidgetRenderer';
import dashboardSchema from '../../../schemas/dashboard.json';
import { WidgetConfig } from '@/types/widget';

export default function TestDashboardPage() {
    return (
        <div className="min-h-screen bg-background">
            <WidgetRenderer config={dashboardSchema as WidgetConfig} />
        </div>
    );
}
