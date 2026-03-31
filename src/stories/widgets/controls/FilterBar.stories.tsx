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
            navigation: { pathname: "/test", query: {} },
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
                    Claims Style (no stateKey, no field)
                </h3>
                <FilterBar
                    config={{ id: "v-claims", type: "filter-bar", props: filterBarMocks.claimsStyle }}
                />
            </div>

            <div>
                <h3 className="text-lg font-semibold mb-4 text-foreground border-b pb-2">
                    Members Style (custom placeholder, no stateKey)
                </h3>
                <FilterBar
                    config={{ id: "v-members", type: "filter-bar", props: filterBarMocks.membersStyle }}
                />
            </div>

            <div>
                <h3 className="text-lg font-semibold mb-4 text-foreground border-b pb-2">
                    Quotations Style (explicit stateKey, field on filters)
                </h3>
                <FilterBar
                    config={{ id: "v-quotations", type: "filter-bar", props: filterBarMocks.quotationsStyle }}
                />
            </div>
        </div>
    ),
};

export const ClaimsStyle: Story = {
    args: {
        config: { id: "filter-claims", type: "filter-bar", props: filterBarMocks.claimsStyle },
    },
};

export const MembersStyle: Story = {
    args: {
        config: { id: "filter-members", type: "filter-bar", props: filterBarMocks.membersStyle },
    },
};

export const QuotationsStyle: Story = {
    args: {
        config: { id: "filter-quotations", type: "filter-bar", props: filterBarMocks.quotationsStyle },
    },
};
