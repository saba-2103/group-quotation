import type { Meta, StoryObj } from '@storybook/react';
import { Plus } from 'lucide-react';
import { Button } from '../../components/ui/button';

const meta: Meta<typeof Button> = {
    title: 'UI/Button',
    component: Button,
    tags: ['autodocs'],
    argTypes: {
        variant: {
            control: 'select',
            options: ['default', 'destructive', 'outline', 'secondary', 'ghost', 'link'],
        },
        size: {
            control: 'select',
            options: ['default', 'xs', 'sm', 'lg', 'icon', 'icon-xs', 'icon-sm', 'icon-lg'],
        },
    },
};

export default meta;
type Story = StoryObj<typeof Button>;

// --- Variants ---

export const Default: Story = {
    args: { children: 'Button', variant: 'default', size: 'default' },
};

export const Secondary: Story = {
    args: { children: 'Secondary', variant: 'secondary', size: 'default' },
};

export const Destructive: Story = {
    args: { children: 'Delete', variant: 'destructive', size: 'default' },
};

export const Outline: Story = {
    args: { children: 'Outline', variant: 'outline', size: 'default' },
};

export const Ghost: Story = {
    args: { children: 'Ghost', variant: 'ghost', size: 'default' },
};

export const Link: Story = {
    args: { children: 'Link', variant: 'link', size: 'default' },
};

// --- Sizes ---

export const ExtraSmall: Story = {
    args: { children: 'XS Button', variant: 'default', size: 'xs' },
};

export const Small: Story = {
    args: { children: 'Small Button', variant: 'default', size: 'sm' },
};

export const Large: Story = {
    args: { children: 'Large Button', variant: 'default', size: 'lg' },
};

// --- Icon Sizes ---

export const Icon: Story = {
    args: { children: <Plus />, variant: 'default', size: 'icon' },
};

export const IconXS: Story = {
    args: { children: <Plus />, variant: 'outline', size: 'icon-xs' },
};

export const IconSM: Story = {
    args: { children: <Plus />, variant: 'outline', size: 'icon-sm' },
};

export const IconLG: Story = {
    args: { children: <Plus />, variant: 'outline', size: 'icon-lg' },
};

// --- States ---

export const Disabled: Story = {
    args: { children: 'Disabled', variant: 'default', disabled: true },
};

// --- All Variants Side by Side ---
export const AllVariants: Story = {
    render: () => (
        <div className="flex flex-wrap gap-3 items-center">
            <Button variant="default">Default</Button>
            <Button variant="secondary">Secondary</Button>
            <Button variant="destructive">Destructive</Button>
            <Button variant="outline">Outline</Button>
            <Button variant="ghost">Ghost</Button>
            <Button variant="link">Link</Button>
        </div>
    ),
};

// --- All Sizes Side by Side ---
export const AllSizes: Story = {
    render: () => (
        <div className="flex flex-wrap gap-3 items-center">
            <Button size="xs">XS</Button>
            <Button size="sm">SM</Button>
            <Button size="default">Default</Button>
            <Button size="lg">LG</Button>
            <Button size="icon"><Plus /></Button>
            <Button size="icon-xs"><Plus /></Button>
            <Button size="icon-sm"><Plus /></Button>
            <Button size="icon-lg"><Plus /></Button>
        </div>
    ),
};
