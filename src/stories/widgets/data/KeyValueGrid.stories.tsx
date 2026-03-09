import type { Meta, StoryObj } from "@storybook/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { KeyValueGrid } from "@/components/widgets/data/KeyValueGrid";
import { keyValueGridMocks } from "@/stories/__mocks__";

const makeQueryClient = () =>
  new QueryClient({ defaultOptions: { queries: { retry: false } } });

const meta: Meta<typeof KeyValueGrid> = {
  title: "Widgets/Data/KeyValueGrid",
  component: KeyValueGrid,
  tags: ["autodocs"],
  decorators: [
    (Story) => (
      <QueryClientProvider client={makeQueryClient()}>
        <div className="p-4">
          <Story />
        </div>
      </QueryClientProvider>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof KeyValueGrid>;

// ─── All Variants Composite Story ────────────────────────────────

export const AllVariants: Story = {
  render: () => (
    <div className="flex flex-col gap-12 space-y-8">
      <div>
        <h3 className="text-lg font-semibold mb-4 text-foreground border-b pb-2">
          1. Populated Data Grid (Active)
        </h3>
        <KeyValueGrid
          config={{
            id: "grid-1",
            type: "key-value-grid",
            props: {
              fields: keyValueGridMocks.fields.policy,
              data: keyValueGridMocks.data.active,
            },
          }}
        />
      </div>

      <div>
        <h3 className="text-lg font-semibold mb-4 text-foreground border-b pb-2">
          2. Populated Data Grid (Expired)
        </h3>
        <KeyValueGrid
          config={{
            id: "grid-2",
            type: "key-value-grid",
            props: {
              fields: keyValueGridMocks.fields.policy,
              data: keyValueGridMocks.data.expired,
            },
          }}
        />
      </div>

      <div>
        <h3 className="text-lg font-semibold mb-4 text-foreground border-b pb-2">
          3. Loading State
        </h3>
        <KeyValueGrid
          config={{
            id: "grid-3",
            type: "key-value-grid",
            props: {
              fields: keyValueGridMocks.fields.policy,
              isLoading: true,
            } as any,
          }}
        />
      </div>

      <div>
        <h3 className="text-lg font-semibold mb-4 text-foreground border-b pb-2">
          4. Error State
        </h3>
        <KeyValueGrid
          config={{
            id: "grid-4",
            type: "key-value-grid",
            props: {
              fields: keyValueGridMocks.fields.policy,
              error: true,
            } as any,
          }}
        />
      </div>
    </div>
  ),
};

// ─── Individual Stories ──────────────────────────────────────

export const WithData: Story = {
  args: {
    config: {
      id: "kv-grid-with-data",
      type: "key-value-grid",
      props: {
        fields: keyValueGridMocks.fields.policy,
        data: keyValueGridMocks.data.active,
      },
    },
  },
};

export const Loading: Story = {
  args: {
    config: {
      id: "kv-grid-loading",
      type: "key-value-grid",
      props: {
        fields: keyValueGridMocks.fields.policy,
        isLoading: true,
      } as any,
    },
  },
};

export const ErrorState: Story = {
  args: {
    config: {
      id: "kv-grid-error",
      type: "key-value-grid",
      props: {
        fields: keyValueGridMocks.fields.policy,
        error: true,
      } as any,
    },
  },
};
