import { Column, Table } from "@tanstack/react-table";
import { WidgetConfig, ActionConfig } from "@/types/widget";
import { VisibilityCondition } from "@/lib/conditions";

// ── Row data ──────────────────────────────────────────────────────────────────

export type TableRow = Record<string, string | number | boolean | null | undefined>;

// ── Column config ─────────────────────────────────────────────────────────────

export interface ValueMapping {
  value: string;
  label: string;
  color?: string;
  variant?: string;
}

export interface ColumnConfig {
  id?: string;
  header?: string;
  label?: string;
  accessorKey: string;
  type?: string;
  width?: string;
  sortable?: boolean;
  filterable?: boolean;
  filterType?: "text" | "select" | "date";
  helpText?: string;
  frozen?: "left" | "right";
  align?: "left" | "right";
  cellType?: string;
  valueMapping?: ValueMapping[];
  linkRoute?: string;
  format?: string;
}
export interface RowActionProps {
  route?: string;
  api?: {
    endpoint: string;
    method?: string;
  };
}

export type RowActionConfig = ActionConfig & {
  actionProps?: RowActionProps;
  visible?: VisibilityCondition;
};

// ── Pagination / empty state ──────────────────────────────────────────────────

export interface PaginationConfig {
  enabled: boolean;
  pageSize: number;
  pageSizeOptions?: number[];
}

export interface EmptyStateConfig {
  title?: string;
  description?: string;
  action?: ActionConfig;
}

export interface DefaultSortConfig {
  field: string;
  direction: "asc" | "desc";
}

// ── Server-side fetch params ──────────────────────────────────────────────────

export interface FetchParams {
  page: number;
  pageSize: number;
  sort?: { column: string; direction: "asc" | "desc" };
  filters?: Record<string, string | number | boolean>;
}

// ── Component props ───────────────────────────────────────────────────────────

export interface DataTableProps {
  config: WidgetConfig;
}

export interface FilterCellProps {
  col: ColumnConfig;
  tanCol: Column<TableRow>;
  selectOptions: string[];
}

export interface BulkActionsBarProps {
  selectedCount: number;
  bulkActions: RowActionConfig[];
  hasFilters: boolean;
  activeFilterCount: number;
  onClearSelection: () => void;
  onClearAllFilters: () => void;
}

export interface TablePaginationProps {
  table: Table<TableRow>;
  totalCount: number;
  pageIndex: number;
  pageSize: number;
  pageSizeOptions?: number[];
}

export interface RowActionsProps {
  row: TableRow;
  rowActions: RowActionConfig[];
}
