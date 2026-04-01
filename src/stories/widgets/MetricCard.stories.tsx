import type { Meta, StoryObj } from "@storybook/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MetricCard } from "@/components/widgets/items/MetricCard";
import { metricCardMocks, metricApiSeedData } from "@/stories/__mocks__";

function buildSeededQueryClient(): QueryClient {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, staleTime: Infinity } },
  });
  Object.entries(metricApiSeedData).forEach(([endpoint, data]) => {
    queryClient.setQueryData([endpoint, "GET", undefined, {}], data);
  });
  return queryClient;
}

const meta: Meta<typeof MetricCard> = {
  title: "Widgets/MetricCard",
  component: MetricCard,
  tags: ["autodocs"],
  decorators: [
    (Story) => (
      <QueryClientProvider client={buildSeededQueryClient()}>
        <div className="p-4 max-w-sm">
          <Story />
        </div>
      </QueryClientProvider>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof MetricCard>;

export const AllVariants: Story = {
  render: () => (
    <div className="flex flex-col gap-8 space-y-4">
      <div>
        <h3 className="text-lg font-semibold mb-4 text-foreground border-b pb-2">
          Priority 1 (Large)
        </h3>
        <MetricCard
          config={{
            id: "v-revenue",
            type: "metric-card",
            props: metricCardMocks.configs.revenue,
            dataSource: metricCardMocks.dataSources.revenue,
          }}
        />
      </div>

      <div>
        <h3 className="text-lg font-semibold mb-4 text-foreground border-b pb-2">
          Priority 2 (Medium)
        </h3>
        <div className="grid grid-cols-2 gap-4">
          <MetricCard
            config={{
              id: "v-policies",
              type: "metric-card",
              props: metricCardMocks.configs.policies,
              dataSource: metricCardMocks.dataSources.policies,
            }}
          />
          <MetricCard
            config={{
              id: "v-claims",
              type: "metric-card",
              props: metricCardMocks.configs.claims,
              dataSource: metricCardMocks.dataSources.claims,
            }}
          />
        </div>
      </div>

      <div>
        <h3 className="text-lg font-semibold mb-4 text-foreground border-b pb-2">
          Priority 3 (Small)
        </h3>
        <MetricCard
          config={{
            id: "v-conversion",
            type: "metric-card",
            props: metricCardMocks.configs.conversion,
            dataSource: metricCardMocks.dataSources.conversion,
          }}
        />
      </div>

      <div>
        <h3 className="text-lg font-semibold mb-4 text-foreground border-b pb-2">
          Loading State
        </h3>
        <MetricCard
          config={{
            id: "v-loading",
            type: "metric-card",
            props: metricCardMocks.configs.loading,
          }}
        />
      </div>
    </div>
  ),
};

export const Revenue: Story = {
  args: {
    config: {
      id: "metric-revenue",
      type: "metric-card",
      props: metricCardMocks.configs.revenue,
      dataSource: metricCardMocks.dataSources.revenue,
    },
  },
};

export const ActivePolicies: Story = {
  args: {
    config: {
      id: "metric-policies",
      type: "metric-card",
      props: metricCardMocks.configs.policies,
      dataSource: metricCardMocks.dataSources.policies,
    },
  },
};

export const PendingClaims: Story = {
  args: {
    config: {
      id: "metric-claims",
      type: "metric-card",
      props: metricCardMocks.configs.claims,
      dataSource: metricCardMocks.dataSources.claims,
    },
  },
};

export const ConversionRate: Story = {
  args: {
    config: {
      id: "metric-conversion",
      type: "metric-card",
      props: metricCardMocks.configs.conversion,
      dataSource: metricCardMocks.dataSources.conversion,
    },
  },
};

export const Loading: Story = {
  args: {
    config: {
      id: "metric-loading",
      type: "metric-card",
      props: metricCardMocks.configs.loading,
    },
  },
};
