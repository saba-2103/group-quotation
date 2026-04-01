import type { Meta, StoryObj } from "@storybook/react";
import { Badge } from "@/components/ui/badge";
import { badgeMocks } from "@/stories/__mocks__";

const meta: Meta<typeof Badge> = {
  title: "UI/Badge",
  component: Badge,
  tags: ["autodocs"],
  argTypes: {
    variant: {
      control: "select",
      options: badgeMocks.variants,
    },
  },
};

export default meta;
type Story = StoryObj<typeof Badge>;

// --- All Variants Side by Side ---
export const AllVariants: Story = {
  render: () => (
    <div className="flex flex-wrap gap-3 items-center">
      {badgeMocks.variants.map((variant) => (
        <Badge key={variant} variant={variant}>
          {badgeMocks.labels[variant]}
        </Badge>
      ))}
    </div>
  ),
};

// --- Real-world Usage (as seen in your quotations table) ---
export const StatusBadges: Story = {
  render: () => (
    <div className="flex flex-col gap-2">
      <div className="flex gap-2 items-center">
        <span className="text-sm text-muted-foreground w-32">
          Census Status:
        </span>
        {badgeMocks.statusExamples.census.map((status, index) => (
          <Badge key={index} variant={status.variant}>
            {status.label}
          </Badge>
        ))}
      </div>
      <div className="flex gap-2 items-center">
        <span className="text-sm text-muted-foreground w-32">FCL Status:</span>
        {badgeMocks.statusExamples.fcl.map((status, index) => (
          <Badge key={index} variant={status.variant}>
            {status.label}
          </Badge>
        ))}
      </div>
    </div>
  ),
};

// --- Variants ---

export const Default: Story = {
  args: { children: badgeMocks.labels.default, variant: "default" },
};

export const Secondary: Story = {
  args: { children: badgeMocks.labels.secondary, variant: "secondary" },
};

export const Destructive: Story = {
  args: { children: badgeMocks.labels.destructive, variant: "destructive" },
};

export const Outline: Story = {
  args: { children: badgeMocks.labels.outline, variant: "outline" },
};

export const Success: Story = {
  args: { children: badgeMocks.labels.success, variant: "success" },
};

export const Warning: Story = {
  args: { children: badgeMocks.labels.warning, variant: "warning" },
};

export const Info: Story = {
  args: { children: badgeMocks.labels.info, variant: "info" },
};
