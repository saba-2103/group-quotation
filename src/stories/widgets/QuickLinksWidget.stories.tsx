import type { Meta, StoryObj } from "@storybook/react";
import { QuickLinksWidget } from "@/components/widgets/items/QuickLinksWidget";
import { quickLinksMocks } from "@/stories/__mocks__";

const meta: Meta<typeof QuickLinksWidget> = {
  title: "Widgets/QuickLinksWidget",
  component: QuickLinksWidget,
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
type Story = StoryObj<typeof QuickLinksWidget>;

export const AllVariants: Story = {
  render: () => (
    <div className="flex flex-col gap-12 space-y-8">
      <div>
        <h3 className="text-lg font-semibold mb-4 text-foreground border-b pb-2">
          Button Layout (List)
        </h3>
        <QuickLinksWidget
          config={{
            id: "v-buttons",
            type: "quick-links-widget",
            props: {
              ...quickLinksMocks.configs.buttonLayout,
              links: quickLinksMocks.links.buttons,
            },
          }}
        />
      </div>

      <div>
        <h3 className="text-lg font-semibold mb-4 text-foreground border-b pb-2">
          Card Layout (Grid)
        </h3>
        <QuickLinksWidget
          config={{
            id: "v-cards",
            type: "quick-links-widget",
            props: {
              ...quickLinksMocks.configs.cardLayout,
              links: quickLinksMocks.links.cards,
            },
          }}
        />
      </div>
    </div>
  ),
};

export const ButtonLayout: Story = {
  args: {
    config: {
      id: "quick-links-buttons",
      type: "quick-links-widget",
      props: {
        ...quickLinksMocks.configs.buttonLayout,
        links: quickLinksMocks.links.buttons,
      },
    },
  },
};

export const CardLayout: Story = {
  args: {
    config: {
      id: "quick-links-cards",
      type: "quick-links-widget",
      props: {
        ...quickLinksMocks.configs.cardLayout,
        links: quickLinksMocks.links.cards,
      },
    },
  },
};
