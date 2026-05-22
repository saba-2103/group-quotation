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
  // Used by the `state-badge` cell type to pick the right map in state-map.ts.
  entity?: string;
  // ── Cross-array join (consumed by useDataTable) ───────────────────────
  // When all three are set, the data-table enriches each row by looking up
  // a sibling array on the same response payload (no extra fetch). The
  // sibling-array location is `joinSource` (dotted path); the column on this
  // row whose value to match against the sibling is `joinKey`; the field to
  // pull from the matched sibling is `joinField`. No match → cell undefined
  // → standard "—" empty rendering.
  joinSource?: string;
  joinKey?: string;
  joinField?: string;
  // Optional per-column currency override for `type: "currency"`. Default USD.
  currency?: string;
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
  // Resolved TanStack row id (derived from the configured rowIdKey).
  // Tables where rowIdKey !== "id" rely on this so :id substitutes correctly.
  rowId?: string;
}
