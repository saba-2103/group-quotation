import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { DataTable } from "@/components/widgets/data/DataTable";
import { dataTableMocks, dataTableApiSeedData } from "@/stories/__mocks__";

function buildSeededQueryClient(): QueryClient {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, staleTime: Infinity } },
  });
  // Seed query cache — key shape matches useSmartQuery: [endpoint, method, params, dependentState]
  Object.entries(dataTableApiSeedData).forEach(([endpoint, data]) => {
    queryClient.setQueryData([endpoint, "GET", undefined, {}], data);
  });
  return queryClient;
}

const meta: Meta<typeof DataTable> = {
  title: "Widgets/DataTable",
  component: DataTable,
  tags: ["autodocs"],
  parameters: {
    nextjs: { appDirectory: true },
  },
  decorators: [
    (Story) => (
      <QueryClientProvider client={buildSeededQueryClient()}>
        <div className="p-6" style={{ minHeight: "400px" }}>
          <Story />
        </div>
      </QueryClientProvider>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof DataTable>;

// ── Basic — text + link + date columns, data from mock API ───────────────────

export const Basic: Story = {
  args: {
    config: {
      id: "data-table-basic",
      type: "data-table",
      props: {
        dataSource: dataTableMocks.dataSources.quotations,
        columns: dataTableMocks.columns.base,
      },
    },
  },
};

// ── With Badges — status values rendered as Badge variants ────────────────────

export const WithBadgeColumns: Story = {
  args: {
    config: {
      id: "data-table-badges",
      type: "data-table",
      props: {
        dataSource: dataTableMocks.dataSources.quotations,
        columns: dataTableMocks.columns.withBadges,
      },
    },
  },
};

// ── Default sort — table opens pre-sorted by clientName ascending ─────────────

export const WithDefaultSort: Story = {
  args: {
    config: {
      id: "data-table-default-sort",
      type: "data-table",
      props: {
        dataSource: dataTableMocks.dataSources.quotations,
        columns: dataTableMocks.columns.base,
        defaultSort: { field: "clientName", direction: "asc" },
      },
    },
  },
};

// ── Column filters — text and select filters per column ───────────────────────

export const WithFilters: Story = {
  args: {
    config: {
      id: "data-table-filters",
      type: "data-table",
      props: {
        dataSource: dataTableMocks.dataSources.quotations,
        columns: dataTableMocks.columns.filterable,
      },
    },
  },
};

// ── Global search — search input filters across all columns ───────────────────

export const WithSearch: Story = {
  args: {
    config: {
      id: "data-table-search",
      type: "data-table",
      props: {
        dataSource: dataTableMocks.dataSources.quotations,
        columns: dataTableMocks.columns.withBadges,
        searchable: true,
        searchPlaceholder: "Search by quotation number or client...",
      },
    },
  },
};

// ── Pagination — with custom page size options from config ────────────────────

export const WithPagination: Story = {
  args: {
    config: {
      id: "data-table-pagination",
      type: "data-table",
      props: {
        dataSource: dataTableMocks.dataSources.quotations,
        columns: dataTableMocks.columns.base,
        pagination: dataTableMocks.pagination.standard,
      },
    },
  },
};

// ── Row actions — open navigates, withdraw has confirm + visible condition ─────
// withdraw only appears on rows where mainStatus === "Pending"

export const WithRowActions: Story = {
  args: {
    config: {
      id: "data-table-row-actions",
      type: "data-table",
      props: {
        dataSource: dataTableMocks.dataSources.quotations,
        columns: dataTableMocks.columns.withBadges,
        rowActions: dataTableMocks.rowActions.withConfirm,
        actionsLabel: "Actions",
      },
    },
  },
};

// ── Bulk actions — selectable rows with bulk archive action ───────────────────

export const WithBulkActions: Story = {
  args: {
    config: {
      id: "data-table-bulk",
      type: "data-table",
      props: {
        dataSource: dataTableMocks.dataSources.quotations,
        columns: dataTableMocks.columns.withBadges,
        selectable: true,
        bulkActions: dataTableMocks.bulkActions.standard,
      },
    },
  },
};

// ── Export — export button shown when exportable: true ────────────────────────

export const WithExport: Story = {
  args: {
    config: {
      id: "data-table-export",
      type: "data-table",
      props: {
        dataSource: dataTableMocks.dataSources.quotations,
        columns: dataTableMocks.columns.withBadges,
        selectable: true,
        exportable: true,
      },
    },
  },
};

// ── Sticky column — first column frozen left, horizontal scroll on 8+ columns ─

export const WithStickyColumn: Story = {
  args: {
    config: {
      id: "data-table-sticky",
      type: "data-table",
      props: {
        dataSource: dataTableMocks.dataSources.quotations,
        columns: dataTableMocks.columns.sticky,
        actionsLabel: "Actions",
      },
    },
  },
};

// ── Empty state — with action button from config ──────────────────────────────

export const EmptyState: Story = {
  args: {
    config: {
      id: "data-table-empty",
      type: "data-table",
      props: {
        data: [],
        columns: dataTableMocks.columns.base,
        emptyState: dataTableMocks.emptyState.standard,
      },
    },
  },
};

// ── Loading state ─────────────────────────────────────────────────────────────

export const LoadingState: Story = {
  args: {
    config: {
      id: "data-table-loading",
      type: "data-table",
      props: {
        columns: dataTableMocks.columns.base,
        isLoading: true,
      },
    },
  },
};

// ── Full featured — all capabilities enabled together ─────────────────────────

export const FullFeatured: Story = {
  args: {
    config: {
      id: "data-table-full",
      type: "data-table",
      props: {
        dataSource: dataTableMocks.dataSources.quotations,
        columns: dataTableMocks.columns.filterable,
        selectable: true,
        searchable: true,
        exportable: true,
        searchPlaceholder: "Search quotations...",
        defaultSort: { field: "quotationNumber", direction: "asc" },
        pagination: dataTableMocks.pagination.standard,
        rowActions: dataTableMocks.rowActions.withConfirm,
        bulkActions: dataTableMocks.bulkActions.standard,
        actionsLabel: "Actions",
        emptyState: dataTableMocks.emptyState.standard,
      },
    },
  },
};
