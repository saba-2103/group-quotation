import type { Meta, StoryObj } from "@storybook/react";
import { FormContainer } from "@/components/widgets/forms/FormContainer";
import { formContainerMocks } from "@/stories/__mocks__";

const meta: Meta<typeof FormContainer> = {
  title: "Widgets/FormContainer",
  component: FormContainer,
  tags: ["autodocs"],
  decorators: [
    (Story) => (
      <div className="p-4 max-w-2xl">
        <Story />
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof FormContainer>;

export const AllVariants: Story = {
  render: () => (
    <div className="flex flex-col gap-12 space-y-8">
      <div>
        <h3 className="text-lg font-semibold mb-4 text-foreground border-b pb-2">
          Simple Form (Edit Mode)
        </h3>
        <FormContainer
          config={{
            id: "v-simple",
            type: "form-container",
            props: {
              fields: formContainerMocks.fields.simple,
              actions: formContainerMocks.actions.simple,
            },
          }}
        />
      </div>

      <div>
        <h3 className="text-lg font-semibold mb-4 text-foreground border-b pb-2">
          Simple Form (View Mode)
        </h3>
        <FormContainer
          config={{
            id: "v-simple-view",
            type: "form-container",
            props: {
              mode: "view",
              fields: formContainerMocks.fields.simple,
              data: formContainerMocks.data.simple,
            },
          }}
        />
      </div>

      <div>
        <h3 className="text-lg font-semibold mb-4 text-foreground border-b pb-2">
          Complete Form (Edit Mode)
        </h3>
        <FormContainer
          config={{
            id: "v-complete",
            type: "form-container",
            props: {
              fields: formContainerMocks.fields.complete,
              actions: formContainerMocks.actions.multiple,
            },
          }}
        />
      </div>

      <div>
        <h3 className="text-lg font-semibold mb-4 text-foreground border-b pb-2">
          Complete Form (View Mode)
        </h3>
        <FormContainer
          config={{
            id: "v-complete-view",
            type: "form-container",
            props: {
              mode: "view",
              fields: formContainerMocks.fields.complete,
              data: formContainerMocks.data.complete,
            },
          }}
        />
      </div>
    </div>
  ),
};

export const SimpleForm: Story = {
  args: {
    config: {
      id: "form-simple",
      type: "form-container",
      props: {
        fields: formContainerMocks.fields.simple,
        actions: formContainerMocks.actions.simple,
      },
    },
  },
};

export const SimpleFormViewMode: Story = {
  args: {
    config: {
      id: "form-simple-view",
      type: "form-container",
      props: {
        mode: "view",
        fields: formContainerMocks.fields.simple,
        data: formContainerMocks.data.simple,
      },
    },
  },
};

export const CompleteForm: Story = {
  args: {
    config: {
      id: "form-complete",
      type: "form-container",
      props: {
        fields: formContainerMocks.fields.complete,
        actions: formContainerMocks.actions.multiple,
      },
    },
  },
};

export const CompleteFormViewMode: Story = {
  args: {
    config: {
      id: "form-complete-view",
      type: "form-container",
      props: {
        mode: "view",
        fields: formContainerMocks.fields.complete,
        data: formContainerMocks.data.complete,
      },
    },
  },
};
