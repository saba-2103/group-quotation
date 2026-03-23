import type { Meta, StoryObj } from '@storybook/react';
import { Badge } from '../../components/ui/badge';

const meta: Meta<typeof Badge> = {
    title: 'UI/Badge',
    component: Badge,
    tags: ['autodocs'],
    argTypes: {
        variant: {
            control: 'select',
            options: ['default', 'secondary', 'destructive', 'outline', 'success', 'warning', 'info', 'teal', 'amber', 'grey'],
        },
    },
};

export default meta;
type Story = StoryObj<typeof Badge>;

// --- Variants ---

export const Default: Story = {
    args: { children: 'Default', variant: 'default' },
};

export const Secondary: Story = {
    args: { children: 'Secondary', variant: 'secondary' },
};

export const Destructive: Story = {
    args: { children: 'Rejected', variant: 'destructive' },
};

export const Outline: Story = {
    args: { children: 'Outline', variant: 'outline' },
};

export const Success: Story = {
    args: { children: 'Approved', variant: 'success' },
};

export const Warning: Story = {
    args: { children: 'Pending', variant: 'warning' },
};

export const Info: Story = {
    args: { children: 'In Progress', variant: 'info' },
};

export const Teal: Story = {
    args: { children: 'Review Completed', variant: 'teal' },
};

export const Amber: Story = {
    args: { children: 'Active Draft', variant: 'amber' },
};

export const Grey: Story = {
    args: { children: 'Draft', variant: 'grey' },
};

// --- All Variants Side by Side ---
export const AllVariants: Story = {
    render: () => (
        <div className="flex flex-wrap gap-3 items-center">
            <Badge variant="default">Default</Badge>
            <Badge variant="secondary">Secondary</Badge>
            <Badge variant="destructive">Rejected</Badge>
            <Badge variant="outline">Outline</Badge>
            <Badge variant="success">Approved</Badge>
            <Badge variant="warning">Pending</Badge>
            <Badge variant="info">In Progress</Badge>
            <Badge variant="teal">Review Completed</Badge>
            <Badge variant="amber">Active Draft</Badge>
            <Badge variant="grey">Draft</Badge>
        </div>
    ),
};

// --- Transaction Status Badges ---
export const TransactionStatus: Story = {
    render: () => (
        <div className="flex flex-col gap-3">
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Transaction Status Codes</span>
            <div className="flex flex-wrap gap-2 items-center">
                <Badge variant="grey">DR — Draft</Badge>
                <Badge variant="info">CM — Completed</Badge>
                <Badge variant="warning">RV — Review</Badge>
                <Badge variant="teal">RC — Review Completed</Badge>
                <Badge variant="success">AC — Active</Badge>
                <Badge variant="amber">AD — Active Draft</Badge>
                <Badge variant="destructive">IA — In-Active</Badge>
            </div>
        </div>
    ),
};

// --- Real-world Usage (as seen in quotations table) ---
export const StatusBadges: Story = {
    render: () => (
        <div className="flex flex-col gap-2">
            <div className="flex gap-2 items-center">
                <span className="text-sm text-muted-foreground w-32">Census Status:</span>
                <Badge variant="default">Not Started</Badge>
                <Badge variant="info">Uploaded</Badge>
                <Badge variant="warning">Exceptions</Badge>
                <Badge variant="success">Approved</Badge>
            </div>
            <div className="flex gap-2 items-center">
                <span className="text-sm text-muted-foreground w-32">FCL Status:</span>
                <Badge variant="default">Not Computed</Badge>
                <Badge variant="success">Computed</Badge>
                <Badge variant="warning">Evidence Pending</Badge>
            </div>
        </div>
    ),
};
