import type { Meta, StoryObj } from "@storybook/react";
import { KeyValueGrid } from "@/components/widgets/data/KeyValueGrid";
import { keyValueGridMocks } from "@/stories/__mocks__";

const meta: Meta<typeof KeyValueGrid> = {
  title: "Widgets/KeyValueGrid",
  component: KeyValueGrid,
  tags: ["autodocs"],
  decorators: [
    (Story) => (
      <div className="p-4">
        <Story />
      </div>
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
          1. Active Quotation Summary
        </h3>
        <KeyValueGrid
          config={{
            id: "grid-active",
            type: "key-value-grid",
            dataSource: keyValueGridMocks.dataSources.active,
            props: keyValueGridMocks.configs.quotationSummary,
          }}
        />
      </div>

      <div>
        <h3 className="text-lg font-semibold mb-4 text-foreground border-b pb-2">
          2. Expired Quotation Summary
        </h3>
        <KeyValueGrid
          config={{
            id: "grid-expired",
            type: "key-value-grid",
            dataSource: keyValueGridMocks.dataSources.expired,
            props: keyValueGridMocks.configs.quotationSummary,
          }}
        />
      </div>

      <div>
        <h3 className="text-lg font-semibold mb-4 text-foreground border-b pb-2">
          3. Loading State
        </h3>
        <KeyValueGrid
          config={{
            id: "grid-loading",
            type: "key-value-grid",
            props: { ...keyValueGridMocks.configs.quotationSummary, isLoading: true } as any,
          }}
        />
      </div>

      <div>
        <h3 className="text-lg font-semibold mb-4 text-foreground border-b pb-2">
          4. Error State
        </h3>
        <KeyValueGrid
          config={{
            id: "grid-error",
            type: "key-value-grid",
            props: { ...keyValueGridMocks.configs.quotationSummary, error: true } as any,
          }}
        />
      </div>
    </div>
  ),
};

// ─── Individual Stories ──────────────────────────────────────

export const Active: Story = {
  args: {
    config: {
      id: "kv-grid-active",
      type: "key-value-grid",
      dataSource: keyValueGridMocks.dataSources.active,
      props: keyValueGridMocks.configs.quotationSummary,
    },
  },
};

export const Expired: Story = {
  args: {
    config: {
      id: "kv-grid-expired",
      type: "key-value-grid",
      dataSource: keyValueGridMocks.dataSources.expired,
      props: keyValueGridMocks.configs.quotationSummary,
    },
  },
};

export const Loading: Story = {
  args: {
    config: {
      id: "kv-grid-loading",
      type: "key-value-grid",
      props: { ...keyValueGridMocks.configs.quotationSummary, isLoading: true } as any,
    },
  },
};

export const ErrorState: Story = {
  args: {
    config: {
      id: "kv-grid-error",
      type: "key-value-grid",
      props: { ...keyValueGridMocks.configs.quotationSummary, error: true } as any,
    },
  },
};
