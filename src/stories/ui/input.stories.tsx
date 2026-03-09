import type { Meta, StoryObj } from '@storybook/react';
import { Input } from '@/components/ui/input';

const meta: Meta<typeof Input> = {
    title: 'UI/Input',
    component: Input,
    tags: ['autodocs'],
    argTypes: {
        type: {
            control: 'select',
            options: ['text', 'email', 'password', 'number', 'date'],
        },
        disabled: { control: 'boolean' },
    },
};

export default meta;
type Story = StoryObj<typeof Input>;

export const AllVariants: Story = {
    render: () => (
        <div className="flex flex-col gap-3 max-w-sm">
            <Input type="text" placeholder="Default input" />
            <Input type="text" defaultValue="With pre-filled value" />
            <Input type="text" placeholder="Disabled input" disabled />
            <Input type="text" placeholder="Error state" aria-invalid={true} />
        </div>
    ),
};

// --- States ---

export const Default: Story = {
    args: { type: 'text' },
};

export const WithPlaceholder: Story = {
    args: { type: 'text', placeholder: 'Enter client name...' },
};

export const WithValue: Story = {
    args: { type: 'text', defaultValue: 'Q-2024-001' },
};

export const Disabled: Story = {
    args: { type: 'text', placeholder: 'Auto-generated', disabled: true },
};

export const ErrorState: Story = {
    args: {
        type: 'text',
        placeholder: 'Enter policy number',
        'aria-invalid': true,
    },
};

// --- Input Types ---

export const DateInput: Story = {
    args: { type: 'date' },
};

export const NumberInput: Story = {
    args: { type: 'number', placeholder: 'Enter amount' },
};

export const PasswordInput: Story = {
    args: { type: 'password', placeholder: 'Enter password' },
};
