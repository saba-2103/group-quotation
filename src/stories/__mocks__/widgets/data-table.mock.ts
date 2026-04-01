import { DataSourceConfig, ActionConfig } from "@/types/widget";
import { ColumnConfig, RowActionConfig } from "@/components/widgets/data/DataTable/types";

const buildDataSource = (endpoint: string): DataSourceConfig => ({
  api: { endpoint, method: "GET" },
});

// ── Seed data for React Query cache ──────────────────────────────────────────
// Key shape matches useSmartQuery: [endpoint, method, params, dependentState]
export const dataTableApiSeedData: Record<string, unknown[]> = {
  "/api/mock/quotations": [
    {
      id: "1",
      quotationNumber: "Q-2024-001",
      clientName: "Acme Corp",
      quotationType: "New Business",
      mainStatus: "Pending",
      censusStatus: "Uploaded",
      effectiveDate: "2024-01-15",
      channel: "Broker",
      membersCount: 450,
    },
    {
      id: "2",
      quotationNumber: "Q-2024-002",
      clientName: "GlobalTech Ltd",
      quotationType: "Renewal",
      mainStatus: "Approved",
      censusStatus: "Approved",
      effectiveDate: "2024-02-01",
      channel: "Agent",
      membersCount: 120,
    },
    {
      id: "3",
      quotationNumber: "Q-2024-003",
      clientName: "Sunrise Insurance",
      quotationType: "New Business",
      mainStatus: "Pending",
      censusStatus: "Not started",
      effectiveDate: "2024-03-10",
      channel: "Direct",
      membersCount: 75,
    },
    {
      id: "4",
      quotationNumber: "Q-2024-004",
      clientName: "TechVentures Inc",
      quotationType: "Renewal",
      mainStatus: "Approved",
      censusStatus: "Approved",
      effectiveDate: "2024-03-22",
      channel: "Broker",
      membersCount: 320,
    },
    {
      id: "5",
      quotationNumber: "Q-2024-005",
      clientName: "Metro Solutions",
      quotationType: "New Business",
      mainStatus: "Pending",
      censusStatus: "Exceptions",
      effectiveDate: "2024-04-05",
      channel: "Agent",
      membersCount: 200,
    },
  ],
};

// ── Column configurations ─────────────────────────────────────────────────────
const baseColumns: ColumnConfig[] = [
  {
    id: "quotationNumber",
    header: "Quotation Number",
    accessorKey: "quotationNumber",
    type: "link",
    sortable: true,
    width: "180px",
    linkRoute: "/quotations/:id",
  },
  {
    id: "clientName",
    header: "Client Name",
    accessorKey: "clientName",
    type: "text",
    sortable: true,
    width: "200px",
  },
  {
    id: "quotationType",
    header: "Quotation Type",
    accessorKey: "quotationType",
    type: "text",
    sortable: true,
    width: "130px",
  },
  {
    id: "effectiveDate",
    header: "Effective Date",
    accessorKey: "effectiveDate",
    type: "date",
    sortable: true,
    width: "120px",
  },
  {
    id: "channel",
    header: "Channel",
    accessorKey: "channel",
    type: "text",
    sortable: true,
    width: "100px",
  },
];

const withBadgesColumns: ColumnConfig[] = [
  ...baseColumns,
  {
    id: "mainStatus",
    header: "Main Status",
    accessorKey: "mainStatus",
    type: "badge",
    sortable: true,
    width: "120px",
    valueMapping: [
      { value: "Pending", label: "Pending", color: "warning" },
      { value: "Approved", label: "Approved", color: "success" },
      { value: "Rejected", label: "Rejected", color: "error" },
    ],
  },
  {
    id: "censusStatus",
    header: "Census Status",
    accessorKey: "censusStatus",
    type: "badge",
    sortable: true,
    width: "140px",
    valueMapping: [
      { value: "Not started", label: "Not started", color: "default" },
      { value: "Uploaded", label: "Uploaded", color: "info" },
      { value: "Exceptions", label: "Exceptions", color: "warning" },
      { value: "Approved", label: "Approved", color: "success" },
    ],
  },
];

const filterableColumns: ColumnConfig[] = [
  {
    id: "quotationNumber",
    header: "Quotation Number",
    accessorKey: "quotationNumber",
    type: "text",
    sortable: true,
    filterable: true,
    filterType: "text",
    width: "180px",
  },
  {
    id: "clientName",
    header: "Client Name",
    accessorKey: "clientName",
    type: "text",
    sortable: true,
    filterable: true,
    filterType: "text",
    width: "200px",
  },
  {
    id: "mainStatus",
    header: "Main Status",
    accessorKey: "mainStatus",
    type: "badge",
    sortable: true,
    filterable: true,
    filterType: "select",
    width: "120px",
    valueMapping: [
      { value: "Pending", label: "Pending", color: "warning" },
      { value: "Approved", label: "Approved", color: "success" },
    ],
  },
  {
    id: "channel",
    header: "Channel",
    accessorKey: "channel",
    type: "text",
    sortable: true,
    filterable: true,
    filterType: "select",
    width: "100px",
  },
  {
    id: "effectiveDate",
    header: "Effective Date",
    accessorKey: "effectiveDate",
    type: "date",
    sortable: true,
    width: "120px",
  },
];

// 8 columns — exceeds SCROLLABLE_COLUMN_THRESHOLD (7) so horizontal scroll kicks in,
// making the frozen: "left" sticky behaviour visible.
const stickyColumns: ColumnConfig[] = [
  {
    id: "quotationNumber",
    header: "Quotation Number",
    accessorKey: "quotationNumber",
    type: "link",
    sortable: true,
    width: "180px",
    linkRoute: "/quotations/:id",
    frozen: "left",
  },
  {
    id: "clientName",
    header: "Client Name",
    accessorKey: "clientName",
    type: "text",
    sortable: true,
    width: "200px",
  },
  {
    id: "quotationType",
    header: "Quotation Type",
    accessorKey: "quotationType",
    type: "text",
    sortable: true,
    width: "150px",
  },
  {
    id: "effectiveDate",
    header: "Effective Date",
    accessorKey: "effectiveDate",
    type: "date",
    sortable: true,
    width: "140px",
  },
  {
    id: "channel",
    header: "Channel",
    accessorKey: "channel",
    type: "text",
    sortable: true,
    width: "120px",
  },
  {
    id: "mainStatus",
    header: "Main Status",
    accessorKey: "mainStatus",
    type: "badge",
    sortable: true,
    width: "130px",
    valueMapping: [
      { value: "Pending", label: "Pending", color: "warning" },
      { value: "Approved", label: "Approved", color: "success" },
    ],
  },
  {
    id: "censusStatus",
    header: "Census Status",
    accessorKey: "censusStatus",
    type: "badge",
    sortable: true,
    width: "150px",
    valueMapping: [
      { value: "Not started", label: "Not started", color: "default" },
      { value: "Uploaded", label: "Uploaded", color: "info" },
      { value: "Exceptions", label: "Exceptions", color: "warning" },
      { value: "Approved", label: "Approved", color: "success" },
    ],
  },
  {
    id: "membersCount",
    header: "Members Count",
    accessorKey: "membersCount",
    type: "number",
    sortable: true,
    width: "140px",
  },
];

// ── Row actions ───────────────────────────────────────────────────────────────
const openAction: RowActionConfig = {
  id: "open",
  label: "Open",
  icon: "ExternalLink",
  type: "navigate",
  target: "/quotations/:id",
};

const withdrawAction: RowActionConfig = {
  id: "withdraw",
  label: "Withdraw",
  icon: "XCircle",
  variant: "destructive",
  type: "api-mutation",
  api: { endpoint: "/api/quotations/:id/withdraw", method: "POST" },
  confirm: {
    title: "Withdraw Quotation",
    message: "Are you sure you want to withdraw this quotation?",
  },
  visible: { field: "mainStatus", operator: "eq", value: "Pending" },
};

const cloneAction: RowActionConfig = {
  id: "clone",
  label: "Clone",
  icon: "Copy",
  type: "api-mutation",
  api: { endpoint: "/api/quotations/:id/clone", method: "POST" },
};

// ── Bulk actions ──────────────────────────────────────────────────────────────
const bulkArchiveAction: ActionConfig = {
  id: "bulk-archive",
  label: "Archive Selected",
  type: "trigger-event",
  variant: "outline",
  target: "archive",
};

// ── Empty state action ────────────────────────────────────────────────────────
const createQuotationAction: ActionConfig = {
  id: "create-quotation",
  label: "Create New Quotation",
  icon: "Plus",
  type: "open-sheet",
  variant: "default",
  target: "create-quotation-form",
};

// ── Main mock export ──────────────────────────────────────────────────────────
export const dataTableMocks = {
  dataSources: {
    quotations: buildDataSource("/api/mock/quotations"),
  },
  columns: {
    base: baseColumns,
    withBadges: withBadgesColumns,
    filterable: filterableColumns,
    sticky: stickyColumns,
  },
  rowActions: {
    standard: [openAction, cloneAction],
    withConfirm: [openAction, withdrawAction, cloneAction],
  },
  bulkActions: {
    standard: [bulkArchiveAction],
  },
  emptyState: {
    standard: {
      title: "No quotations found",
      description: "There are no quotations matching your criteria.",
      action: createQuotationAction,
    },
  },
  pagination: {
    standard: {
      enabled: true,
      pageSize: 3,
      pageSizeOptions: [3, 5, 10],
    },
  },
};
