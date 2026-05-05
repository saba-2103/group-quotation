import type { Meta, StoryObj } from "@storybook/react";
import { DateWidget } from "../../components/widgets/controls/dateWidget/index";
import { TenantConfigProvider } from "../../contexts/TenantConfigContext";

const meta: Meta<typeof DateWidget> = {
  title: "Widgets/DateWidget",
  component: DateWidget,
  tags: ["autodocs"],
  parameters: {
    nextjs: { appDirectory: true },
  },
};

export default meta;
type Story = StoryObj<typeof DateWidget>;

// ─── Single date picker ──────────────────────────────────────────────────────

export const SingleEmpty: Story = {
  name: "Single — Empty",
  args: {
    config: {
      id: "date-single-empty",
      type: "date-widget",
      props: {
        label: "Effective Date",
        mode: "single",
        mandatory: false,
      },
    },
  },
};

export const SingleWithValue: Story = {
  name: "Single — With Value",
  args: {
    config: {
      id: "date-single-value",
      type: "date-widget",
      props: {
        label: "Expiry Date",
        mode: "single",
        mandatory: true,
        value: "2026-12-31",
      },
    },
  },
};

export const SingleDisabled: Story = {
  name: "Single — Disabled",
  args: {
    config: {
      id: "date-single-disabled",
      type: "date-widget",
      props: {
        label: "Created Date",
        mode: "single",
        mandatory: false,
        value: "2026-01-15",
        disabled: true,
      },
    },
  },
};

// ─── Range picker (dual calendar + presets) ──────────────────────────────────

export const RangeEmpty: Story = {
  name: "Range — Empty",
  args: {
    config: {
      id: "date-range-empty",
      type: "date-widget",
      props: {
        label: "Date Range",
        mode: "range",
        mandatory: false,
      },
    },
  },
};

export const RangeWithValue: Story = {
  name: "Range — With Value",
  args: {
    config: {
      id: "date-range-value",
      type: "date-widget",
      props: {
        label: "Report Period",
        mode: "range",
        mandatory: true,
        from: "2026-03-01",
        to: "2026-03-31",
      },
    },
  },
};

// ─── Read-only display ───────────────────────────────────────────────────────

export const DisplayDDMMYYYY: Story = {
  name: "Display — DD/MM/YYYY",
  decorators: [
    (Story) => (
      <TenantConfigProvider dateFormat="DD/MM/YYYY">
        <Story />
      </TenantConfigProvider>
    ),
  ],
  args: {
    config: {
      id: "date-display-dmy",
      type: "date-widget",
      props: {
        label: "Policy Date",
        mode: "display",
        value: "2026-06-30",
      },
    },
  },
};

export const DisplayMMDDYYYY: Story = {
  name: "Display — MM/DD/YYYY",
  decorators: [
    (Story) => (
      <TenantConfigProvider dateFormat="MM/DD/YYYY">
        <Story />
      </TenantConfigProvider>
    ),
  ],
  args: {
    config: {
      id: "date-display-mdy",
      type: "date-widget",
      props: {
        label: "Policy Date",
        mode: "display",
        value: "2026-06-30",
      },
    },
  },
};
