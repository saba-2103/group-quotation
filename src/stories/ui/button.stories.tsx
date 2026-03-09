import type { Meta, StoryObj } from "@storybook/react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { buttonMocks } from "@/stories/__mocks__";

const meta: Meta<typeof Button> = {
  title: "UI/Button",
  component: Button,
  tags: ["autodocs"],
  argTypes: {
    variant: {
      control: "select",
      options: buttonMocks.variants,
    },
    size: {
      control: "select",
      options: buttonMocks.sizes,
    },
  },
};

export default meta;
type Story = StoryObj<typeof Button>;

export const AllVariants: Story = {
  render: () => (
    <div className="flex flex-wrap gap-3 items-center">
      {buttonMocks.variants.map((variant) => (
        <Button key={variant} variant={variant}>
          {buttonMocks.labels[variant]}
        </Button>
      ))}
    </div>
  ),
};

// --- All Sizes Side by Side ---
export const AllSizes: Story = {
  render: () => (
    <div className="flex flex-wrap gap-3 items-center">
      {(["xs", "sm", "default", "lg"] as const).map((size) => (
        <Button key={size} size={size}>
          {buttonMocks.sizeLabels[size]}
        </Button>
      ))}
      {(["icon", "icon-xs", "icon-sm", "icon-lg"] as const).map((size) => (
        <Button key={size} size={size}>
          <Plus />
        </Button>
      ))}
    </div>
  ),
};

// --- Variants ---

export const Default: Story = {
  args: {
    children: buttonMocks.labels.default,
    variant: "default",
    size: "default",
  },
};

export const Secondary: Story = {
  args: {
    children: buttonMocks.labels.secondary,
    variant: "secondary",
    size: "default",
  },
};

export const Destructive: Story = {
  args: {
    children: buttonMocks.labels.destructive,
    variant: "destructive",
    size: "default",
  },
};

export const Outline: Story = {
  args: {
    children: buttonMocks.labels.outline,
    variant: "outline",
    size: "default",
  },
};

export const Ghost: Story = {
  args: {
    children: buttonMocks.labels.ghost,
    variant: "ghost",
    size: "default",
  },
};

export const Link: Story = {
  args: { children: buttonMocks.labels.link, variant: "link", size: "default" },
};

// --- Sizes ---

export const ExtraSmall: Story = {
  args: {
    children: buttonMocks.storyLabels.xs,
    variant: "default",
    size: "xs",
  },
};

export const Small: Story = {
  args: {
    children: buttonMocks.storyLabels.sm,
    variant: "default",
    size: "sm",
  },
};

export const Large: Story = {
  args: {
    children: buttonMocks.storyLabels.lg,
    variant: "default",
    size: "lg",
  },
};

// --- Icon Sizes ---

export const Icon: Story = {
  args: { children: <Plus />, variant: "default", size: "icon" },
};

export const IconXS: Story = {
  args: { children: <Plus />, variant: "outline", size: "icon-xs" },
};

export const IconSM: Story = {
  args: { children: <Plus />, variant: "outline", size: "icon-sm" },
};

export const IconLG: Story = {
  args: { children: <Plus />, variant: "outline", size: "icon-lg" },
};

// --- States ---

export const Disabled: Story = {
  args: { children: "Disabled", variant: "default", disabled: true },
};
