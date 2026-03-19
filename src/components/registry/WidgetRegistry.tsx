import React from 'react';
import { StackLayout } from '../widgets/layout/StackLayout';
import { GridLayout } from '../widgets/layout/GridLayout';
import { PageHeader } from '../widgets/layout/PageHeader';
import { SectionGroup } from '../widgets/layout/SectionGroup';
import { MetricCard } from '../widgets/items/MetricCard';
import { ChartWidget } from '../widgets/items/ChartWidget';
import { QuickLinksWidget } from '../widgets/items/QuickLinksWidget';
import { DataTable } from '../widgets/data/DataTable';
import { FilterBar } from '../widgets/controls/FilterBar';
import { TabsContainer } from '../widgets/container/TabsContainer';
import { FormContainer } from '../widgets/forms/FormContainer';
import { KeyValueGrid } from '../widgets/data/KeyValueGrid';
import { ConfirmationDialog } from '../widgets/forms/ConfirmationDialog';

export const WidgetRegistry: Record<string, React.FC<any>> = {
    'stack-layout': StackLayout,
    'grid-layout': GridLayout,
    'page-header': PageHeader,
    'section-group': SectionGroup,
    'metric-card': MetricCard,
    'chart-widget': ChartWidget,
    'quick-links-widget': QuickLinksWidget,
    'data-table': DataTable,
    'filter-bar': FilterBar,
    'tabs-container': TabsContainer,
    'form-container': FormContainer,
    'key-value-grid': KeyValueGrid,
    'confirmation-dialog': ConfirmationDialog,
};

export const getWidgetComponent = (type: string) => {
    return WidgetRegistry[type] || (() => <div className="text-red-500">Unknown Widget: {type}</div>);
};
