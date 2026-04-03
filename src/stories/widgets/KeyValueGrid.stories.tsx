import type { Meta, StoryObj } from "@storybook/react";
import React from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { KeyValueGrid } from "@/components/widgets/data/KeyValueGrid";
import { TenantConfigProvider } from "@/contexts/TenantConfigContext";
import { keyValueGridMocks, keyValueGridApiSeedData, transactionStatusLabels } from "@/stories/__mocks__";

const meta: Meta<typeof KeyValueGrid> = {
  title: "Widgets/KeyValueGrid",
  component: KeyValueGrid,
  tags: ["autodocs"],
  decorators: [
    (Story) => (
      <div className="p-4">
        <Story />
      </div>
    )
  ]
};

export default meta;
type Story = StoryObj<typeof KeyValueGrid>;

// ── Story decorator ───────────────────────────────────────────────────────────
// Pre-seeds the React Query cache so stories never make real network requests.
// Key shape mirrors useSmartQuery: [endpoint, method, params, dependentState]

const withSeededData = (endpoints: string[]) => (Story: React.ComponentType) => {
  const client = new QueryClient({ defaultOptions: { queries: { staleTime: Infinity } } });
  endpoints.forEach((endpoint) => {
    client.setQueryData([endpoint, "GET", undefined, {}], keyValueGridApiSeedData[endpoint]);
  });
  return (
    <QueryClientProvider client={client}>
      <Story />
    </QueryClientProvider>
  );
};

// ── Empty — no data source ────────────────────────────────────────────────────

export const Empty: Story = {
  name: "Empty — No Data",
  args: {
    config: {
      id: "kv-empty",
      type: "key-value-grid",
      props: keyValueGridMocks.configs.policyEmptyPreview
    }
  }
};

// ── Basic — text fields ───────────────────────────────────────────────────────

export const Basic: Story = {
  name: "Basic — Text Fields",
  decorators: [withSeededData(["/api/mock/policy-summary"])],
  args: {
    config: {
      id: "kv-basic",
      type: "key-value-grid",
      dataSource: keyValueGridMocks.dataSources.policyDetail,
      props: keyValueGridMocks.configs.policyBasicText
    }
  }
};

// ── Date fields — DD/MM/YYYY ──────────────────────────────────────────────────

export const WithDateFieldsDDMMYYYY: Story = {
  name: "Date Fields — DD/MM/YYYY",
  decorators: [
    withSeededData(["/api/mock/policy-summary"]),
    (Story) => (
      <TenantConfigProvider dateFormat="DD/MM/YYYY">
        <Story />
      </TenantConfigProvider>
    )
  ],
  args: {
    config: {
      id: "kv-dates-dmy",
      type: "key-value-grid",
      dataSource: keyValueGridMocks.dataSources.policyDetail,
      props: keyValueGridMocks.configs.policyWithDates
    }
  }
};

// ── Date fields — MM/DD/YYYY ──────────────────────────────────────────────────

export const WithDateFieldsMMDDYYYY: Story = {
  name: "Date Fields — MM/DD/YYYY",
  decorators: [
    withSeededData(["/api/mock/policy-summary"]),
    (Story) => (
      <TenantConfigProvider dateFormat="MM/DD/YYYY">
        <Story />
      </TenantConfigProvider>
    )
  ],
  args: {
    config: {
      id: "kv-dates-mdy",
      type: "key-value-grid",
      dataSource: keyValueGridMocks.dataSources.policyDetail,
      props: keyValueGridMocks.configs.policyWithDates
    }
  }
};

// ── Transaction status badge ──────────────────────────────────────────────────

export const WithTransactionStatus: Story = {
  name: "Transaction Status Field",
  decorators: [withSeededData(["/api/mock/policy-summary"])],
  args: {
    config: {
      id: "kv-tran-status",
      type: "key-value-grid",
      dataSource: keyValueGridMocks.dataSources.policyDetail,
      props: keyValueGridMocks.configs.policyWithStatus
    }
  }
};

// ── All 7 transaction status codes ───────────────────────────────────────────

export const AllTransactionStatuses: Story = {
  name: "All Transaction Status Codes",
  render: () => (
    <div className="flex flex-col gap-4">
      {transactionStatusLabels.map((statusLabel) => {
        const client = new QueryClient({ defaultOptions: { queries: { staleTime: Infinity } } });
        const endpoint = `/api/mock/policy-${statusLabel}`;
        client.setQueryData([endpoint, "GET", undefined, {}], {
          ...keyValueGridApiSeedData["/api/mock/policy-summary"],
          tranStatus: statusLabel
        });
        return (
          <QueryClientProvider key={statusLabel} client={client}>
            <KeyValueGrid
              config={{
                id: `kv-status-${statusLabel}`,
                type: "key-value-grid",
                dataSource: { api: { endpoint, method: "GET" as const } },
                props: keyValueGridMocks.configs.policyStatusShowcase
              }}
            />
          </QueryClientProvider>
        );
      })}
    </div>
  )
};

// ── All field types combined ──────────────────────────────────────────────────

export const AllFieldTypes: Story = {
  name: "All Field Types — Text + Date + Status + Badge",
  decorators: [
    withSeededData(["/api/mock/policy-summary"]),
    (Story) => (
      <TenantConfigProvider dateFormat="DD/MM/YYYY">
        <Story />
      </TenantConfigProvider>
    )
  ],
  args: {
    config: {
      id: "kv-all-types",
      type: "key-value-grid",
      dataSource: keyValueGridMocks.dataSources.policyDetail,
      props: keyValueGridMocks.configs.policyAllFields
    }
  }
};
