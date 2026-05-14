import React from "react";
import { StackLayout } from "../widgets/layout/StackLayout";
import { GridLayout } from "../widgets/layout/GridLayout";
import { PageHeader } from "../widgets/layout/PageHeader";
import { SectionGroup } from "../widgets/layout/SectionGroup";
import { MetricCard } from "../widgets/items/MetricCard";
import { ChartWidget } from "../widgets/items/ChartWidget";
import { QuickLinksWidget } from "../widgets/items/QuickLinksWidget";
import { DataTable } from "../widgets/data/DataTable";
import { CardGrid } from "../widgets/data/CardGrid";
import { EditableTable } from "../widgets/data/EditableTable";
import { PlanCard } from "../widgets/data/PlanCard";
import { PlanForm } from "../widgets/forms/PlanForm";
import { CensusFileFormatForm } from "../widgets/forms/CensusFileFormatForm";
import { DmnDecisionTable } from "../widgets/data/DmnDecisionTable";
import { ActivationCounter } from "../widgets/data/ActivationCounter";
import { FilterBar } from "../widgets/controls/FilterBar";
import { TabsContainer } from "../widgets/container/TabsContainer";
import { FormContainer } from "../widgets/forms/formContainer";
import { KeyValueGrid } from "../widgets/data/KeyValueGrid";
import { ErrorBanner } from "../widgets/items/ErrorBanner";
import { DateWidget } from "../widgets/controls/dateWidget/index";
import { SearchableDropdownWidget } from "../widgets/controls/searchDropDown/index";
import { ContextHelpTooltipWidget } from "../widgets/items/ContextHelpTooltip";
import { RoleSwitcher } from "../widgets/role/RoleSwitcher";
import { ActionBar } from "../widgets/actions/ActionBar";
import { StateBadge } from "../widgets/state/StateBadge";
import { ReasonBanner } from "../widgets/state/ReasonBanner";
import { PollingBanner } from "../widgets/state/PollingBanner";

export const WidgetRegistry: Record<string, React.FC<any>> = {
  "stack-layout": StackLayout,
  "grid-layout": GridLayout,
  "page-header": PageHeader,
  "section-group": SectionGroup,
  "metric-card": MetricCard,
  "chart-widget": ChartWidget,
  "quick-links-widget": QuickLinksWidget,
  "data-table": DataTable,
  "card-grid": CardGrid,
  "editable-table": EditableTable,
  "plan-card": PlanCard,
  "plan-form": PlanForm,
  "census-file-format-form": CensusFileFormatForm,
  "dmn-decision-table": DmnDecisionTable,
  "activation-counter": ActivationCounter,
  "filter-bar": FilterBar,
  "search-bar": FilterBar,
  "tabs-container": TabsContainer,
  "form-container": FormContainer,
  "key-value-grid": KeyValueGrid,
  "error-banner": ErrorBanner,
  "date-widget": DateWidget,
  "searchable-dropdown": SearchableDropdownWidget,
  "context-help-tooltip": ContextHelpTooltipWidget,
  "role-switcher": RoleSwitcher,
  "action-bar": ActionBar,
  "state-badge": StateBadge,
  "reason-banner": ReasonBanner,
  "polling-banner": PollingBanner
};

export const getWidgetComponent = (type: string) => {
  return WidgetRegistry[type] || (() => <div className="text-red-500">Unknown Widget: {type}</div>);
};
