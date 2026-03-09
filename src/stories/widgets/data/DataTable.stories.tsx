import type { Meta, StoryObj } from "@storybook/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { DataTable } from "@/components/widgets/data/DataTable";
import { dataTableMocks } from "@/stories/__mocks__";

const makeQueryClient = () =>
  new QueryClient({ defaultOptions: { queries: { retry: false } } });

const meta: Meta<typeof DataTable> = {
  title: "Widgets/Data/DataTable",
  component: DataTable,
  tags: ["autodocs"],
  decorators: [
    (Story) => (
      <QueryClientProvider client={makeQueryClient()}>
        <div className="p-4" style={{ minHeight: "400px" }}>
          <Story />
        </div>
      </QueryClientProvider>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof DataTable>;

// ─── All Variants Composite Story ────────────────────────────────

export const AllVariants: Story = {
  render: () => (
    <div className="flex flex-col gap-12 space-y-8">
      <div>
        <h3 className="text-lg font-semibold mb-4 text-foreground border-b pb-2">
          1. All Column Types (Text, Link, Badge, Currency, Number)
        </h3>
        <DataTable
          config={{
            id: "all-cols",
            type: "data-table",
            props: {
              columns: dataTableMocks.columns.allTypes,
              data: dataTableMocks.data.allTypes,
            },
          }}
        />
      </div>

      <div>
        <h3 className="text-lg font-semibold mb-4 text-foreground border-b pb-2">
          2. Features: Selectable, Pagination, Row & Bulk Actions
        </h3>
        <DataTable
          config={{
            id: "all-features",
            type: "data-table",
            props: {
              selectable: true,
              pagination: { enabled: true, pageSize: 2 },
              columns: dataTableMocks.columns.features,
              bulkActions: dataTableMocks.actions.bulk,
              rowActions: dataTableMocks.actions.row,
              data: dataTableMocks.data.features,
            },
          }}
        />
      </div>

      <div>
        <h3 className="text-lg font-semibold mb-4 text-foreground border-b pb-2">
          3. Layout: Horizontal Scrolling (Many Columns)
        </h3>
        <div className="w-full max-w-full overflow-hidden">
          <DataTable
            config={{
              id: "table-scroll-demo",
              type: "data-table",
              props: {
                selectable: true,
                columns: dataTableMocks.columns.scroll,
                data: dataTableMocks.data.scroll,
              },
            }}
          />
        </div>
      </div>

      <div>
        <h3 className="text-lg font-semibold mb-4 text-foreground border-b pb-2">
          4. States: Empty & Loading
        </h3>
        <div className="flex flex-col gap-6">
          <DataTable
            config={{
              id: "empty",
              type: "data-table",
              props: { columns: dataTableMocks.columns.text, data: [] },
            }}
          />
          <DataTable
            config={{
              id: "loading",
              type: "data-table",
              props: { columns: dataTableMocks.columns.text, isLoading: true },
            }}
          />
        </div>
      </div>
    </div>
  ),
};

// ─── Individual Stories ──────────────────────────────────────

export const TextColumns: Story = {
  args: {
    config: {
      id: "table-text",
      type: "data-table",
      props: {
        columns: dataTableMocks.columns.text,
        data: dataTableMocks.data.text,
      },
    },
  },
};

export const LinkColumns: Story = {
  args: {
    config: {
      id: "table-link",
      type: "data-table",
      props: {
        columns: dataTableMocks.columns.link,
        data: dataTableMocks.data.link,
      },
    },
  },
};

export const BadgeColumns: Story = {
  args: {
    config: {
      id: "table-badge",
      type: "data-table",
      props: {
        columns: dataTableMocks.columns.badge,
        data: dataTableMocks.data.badge,
      },
    },
  },
};

export const CurrencyColumns: Story = {
  args: {
    config: {
      id: "table-currency",
      type: "data-table",
      props: {
        columns: dataTableMocks.columns.currency,
        data: dataTableMocks.data.currency,
      },
    },
  },
};

export const HorizontalScroll: Story = {
  args: {
    config: {
      id: "table-scroll",
      type: "data-table",
      props: {
        columns: dataTableMocks.columns.scroll,
        data: dataTableMocks.data.scroll,
      },
    },
  },
};

export const WithPagination: Story = {
  args: {
    config: {
      id: "table-pagination",
      type: "data-table",
      props: {
        pagination: { enabled: true, pageSize: 3 },
        columns: dataTableMocks.columns.text,
        data: dataTableMocks.data.pagination,
      },
    },
  },
};

export const WithRowAndBulkActions: Story = {
  args: {
    config: {
      id: "table-actions",
      type: "data-table",
      props: {
        selectable: true,
        columns: dataTableMocks.columns.badge,
        data: dataTableMocks.data.withActions,
        bulkActions: dataTableMocks.actions.bulk,
        rowActions: dataTableMocks.actions.row,
      },
    },
  },
};
