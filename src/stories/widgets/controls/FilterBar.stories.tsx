import type { Meta, StoryObj } from "@storybook/react";
import { FilterBar } from "@/components/widgets/controls/FilterBar";
import { filterBarMocks } from "@/stories/__mocks__";

const meta: Meta<typeof FilterBar> = {
  title: "Widgets/Controls/FilterBar",
  component: FilterBar,
  tags: ["autodocs"],
  decorators: [
    (Story) => (
      <div className="p-4">
        <Story />
      </div>
    ),
  ],
  parameters: {
    nextjs: {
      appDirectory: true,
      navigation: {
        pathname: "/test",
        query: {},
      },
    },
  },
};

export default meta;
type Story = StoryObj<typeof FilterBar>;

export const AllVariants: Story = {
  render: () => (
    <div className="flex flex-col gap-12 space-y-8">
      <div>
        <h3 className="text-lg font-semibold mb-4 text-foreground border-b pb-2">
          Single Filter
        </h3>
        <FilterBar
          config={{
            id: "v-single",
            type: "filter-bar",
            props: {
              filters: filterBarMocks.filters.status,
            },
          }}
        />
      </div>

      <div>
        <h3 className="text-lg font-semibold mb-4 text-foreground border-b pb-2">
          Multiple Filters
        </h3>
        <FilterBar
          config={{
            id: "v-multiple",
            type: "filter-bar",
            props: {
              filters: filterBarMocks.filters.multiple,
            },
          }}
        />
      </div>
    </div>
  ),
};

export const SingleFilter: Story = {
  args: {
    config: {
      id: "filter-bar-single",
      type: "filter-bar",
      props: {
        filters: filterBarMocks.filters.status,
      },
    },
  },
};

export const MultipleFilters: Story = {
  args: {
    config: {
      id: "filter-bar-multiple",
      type: "filter-bar",
      props: {
        filters: filterBarMocks.filters.multiple,
      },
    },
  },
};
