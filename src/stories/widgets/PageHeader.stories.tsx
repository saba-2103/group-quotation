import type { Meta, StoryObj } from "@storybook/react";
import { PageHeader } from "@/components/widgets/layout/PageHeader";
import { pageHeaderMocks } from "@/stories/__mocks__";

const meta: Meta<typeof PageHeader> = {
  title: "Widgets/PageHeader",
  component: PageHeader,
  tags: ["autodocs"],
  decorators: [
    (Story) => (
      <div className="p-6 bg-background space-y-2">
        <Story />
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof PageHeader>;

// ─── All Variants Composite Story ────────────────────────────────

export const AllVariants: Story = {
  render: () => (
    <div className="flex flex-col gap-16">
      <div>
        <h3 className="text-sm font-semibold mb-4 text-muted-foreground uppercase tracking-widest">
          Minimal (Title Only)
        </h3>
        <div className="border rounded-lg shadow-sm">
          <PageHeader
            config={{
              id: "v-minimal",
              type: "page-header",
              props: pageHeaderMocks.configs.minimal,
            }}
          />
        </div>
      </div>

      <div>
        <h3 className="text-sm font-semibold mb-4 text-muted-foreground uppercase tracking-widest">
          Default (Title + Description)
        </h3>
        <div className="border rounded-lg shadow-sm">
          <PageHeader
            config={{
              id: "v-default",
              type: "page-header",
              props: pageHeaderMocks.configs.settings,
            }}
          />
        </div>
      </div>

      <div>
        <h3 className="text-sm font-semibold mb-4 text-muted-foreground uppercase tracking-widest">
          Complex (Title + Description + Action Buttons)
        </h3>
        <div className="border rounded-lg shadow-sm">
          <PageHeader
            config={{
              id: "v-complex",
              type: "page-header",
              props: pageHeaderMocks.configs.userManagement,
            }}
          />
        </div>
      </div>
    </div>
  ),
};

// ─── Individual Stories ──────────────────────────────────────

export const Default: Story = {
  args: {
    config: {
      id: "page-header-default",
      type: "page-header",
      props: pageHeaderMocks.configs.default,
    },
  },
};

export const WithActions: Story = {
  args: {
    config: {
      id: "page-header-with-actions",
      type: "page-header",
      props: pageHeaderMocks.configs.withActions,
    },
  },
};

export const Minimal: Story = {
  args: {
    config: {
      id: "page-header-minimal",
      type: "page-header",
      props: pageHeaderMocks.configs.minimal,
    },
  },
};
