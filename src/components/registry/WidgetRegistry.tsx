import React from 'react';
import { StackLayout } from '../widgets/layout/StackLayout';
import { GridLayout } from '../widgets/layout/GridLayout';
import { PageHeader } from '../widgets/layout/PageHeader/PageHeader';
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
import { ErrorBanner } from '../widgets/items/ErrorBanner';
import { DateWidget } from '../widgets/controls/dateWidget/index';
import { SearchableDropdownWidget } from '../widgets/controls/searchDropDown/index';
import { ContextHelpTooltipWidget } from '../widgets/items/ContextHelpTooltip';

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
    'search-bar': FilterBar,
    'tabs-container': TabsContainer,
    'form-container': FormContainer,
    'key-value-grid': KeyValueGrid,
    'confirmation-dialog': ConfirmationDialog,
    'error-banner': ErrorBanner,
    'date-widget': DateWidget,
    'searchable-dropdown': SearchableDropdownWidget,
    'context-help-tooltip': ContextHelpTooltipWidget,
};

export const getWidgetComponent = (type: string) => {
    return WidgetRegistry[type] || (() => <div className="text-red-500">Unknown Widget: {type}</div>);
};
