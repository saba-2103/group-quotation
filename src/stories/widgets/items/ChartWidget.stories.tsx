import type { Meta, StoryObj } from "@storybook/react";
import { ChartWidget } from "@/components/widgets/items/ChartWidget";
import { chartWidgetMocks } from "@/stories/__mocks__";

const meta: Meta<typeof ChartWidget> = {
  title: "Widgets/Items/ChartWidget",
  component: ChartWidget,
  tags: ["autodocs"],
  decorators: [
    (Story) => (
      <div className="p-4 w-full">
        <Story />
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof ChartWidget>;

export const AllVariants: Story = {
  render: () => (
    <div className="flex flex-col gap-12 space-y-8">
      <h2 className="text-2xl font-bold mb-4 text-foreground border-b pb-2">
        Chart Widget Variants
      </h2>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div>
          <h3 className="text-lg font-semibold mb-4 text-muted-foreground">
            1. Bar Chart
          </h3>
          <ChartWidget
            config={{
              id: "v-bar",
              type: "chart-widget",
              props: chartWidgetMocks.configs.revenue,
            }}
          />
        </div>
        <div>
          <h3 className="text-lg font-semibold mb-4 text-muted-foreground">
            2. Line Chart
          </h3>
          <ChartWidget
            config={{
              id: "v-line",
              type: "chart-widget",
              props: chartWidgetMocks.configs.traffic,
            }}
          />
        </div>
        <div className="md:col-span-2 max-w-2xl mx-auto w-full">
          <h3 className="text-lg font-semibold mb-4 text-muted-foreground text-center">
            3. Pie Chart
          </h3>
          <ChartWidget
            config={{
              id: "v-pie",
              type: "chart-widget",
              props: chartWidgetMocks.configs.demographics,
            }}
          />
        </div>
      </div>
    </div>
  ),
};

// ─── Individual Stories ──────────────────────────────────────

export const BarChart: Story = {
  args: {
    config: {
      id: "chart-bar",
      type: "chart-widget",
      props: chartWidgetMocks.configs.bar,
    },
  },
};

export const LineChart: Story = {
  args: {
    config: {
      id: "chart-line",
      type: "chart-widget",
      props: chartWidgetMocks.configs.line,
    },
  },
};

export const PieChart: Story = {
  args: {
    config: {
      id: "chart-pie",
      type: "chart-widget",
      props: chartWidgetMocks.configs.pie,
    },
  },
};
