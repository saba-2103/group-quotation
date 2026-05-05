import type { Meta, StoryObj } from '@storybook/react';
import React from 'react';
import { ContextHelpTooltip } from '../../components/widgets/items/ContextHelpTooltip';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';

const meta: Meta<typeof ContextHelpTooltip> = {
    title: 'Widgets/ContextHelpTooltip',
    component: ContextHelpTooltip,
    tags: ['autodocs'],
    parameters: {
        nextjs: { appDirectory: true },
    },
};

export default meta;
type Story = StoryObj<typeof ContextHelpTooltip>;

// ── Basic — enabled input ─────────────────────────────────────────────────────

export const OnEnabledInput: Story = {
    name: 'Enabled Input — hover to see tooltip',
    render: () => (
        <div className="flex flex-col gap-1.5 w-64">
            <Label>Policy Number</Label>
            <ContextHelpTooltip helpText="Enter the unique policy number assigned by the system. Format: POL-YYYY-NNNNN.">
                <Input placeholder="e.g. POL-2026-00123" />
            </ContextHelpTooltip>
        </div>
    ),
};

// ── Disabled input — tooltip still works ─────────────────────────────────────

export const OnDisabledInput: Story = {
    name: 'Disabled Input — tooltip still appears',
    render: () => (
        <div className="flex flex-col gap-1.5 w-64">
            <Label>Policy Number</Label>
            <ContextHelpTooltip helpText="This field is read-only in Enquire mode. Switch to Edit mode to modify it.">
                <Input placeholder="POL-2026-00123" disabled />
            </ContextHelpTooltip>
        </div>
    ),
};

// ── Custom delay ──────────────────────────────────────────────────────────────

export const CustomDelay: Story = {
    name: 'Custom Delay — 200ms',
    render: () => (
        <div className="flex flex-col gap-1.5 w-64">
            <Label>Effective Date</Label>
            <ContextHelpTooltip
                helpText="The date from which the policy coverage becomes active. Must be today or a future date."
                delayMs={200}
            >
                <Input type="text" placeholder="DD/MM/YYYY" />
            </ContextHelpTooltip>
        </div>
    ),
};

// ── No help text — renders children as-is ────────────────────────────────────

export const NoHelpText: Story = {
    name: 'No Help Text — passthrough',
    render: () => (
        <div className="flex flex-col gap-1.5 w-64">
            <Label>Channel</Label>
            <ContextHelpTooltip helpText="">
                <Input placeholder="e.g. Broker" />
            </ContextHelpTooltip>
        </div>
    ),
};

// ── Multiple fields ───────────────────────────────────────────────────────────

export const MultipleFields: Story = {
    name: 'Multiple Fields with Tooltips',
    render: () => (
        <div className="grid grid-cols-2 gap-4 w-[480px]">
            <div className="flex flex-col gap-1.5">
                <Label>Policy Number</Label>
                <ContextHelpTooltip helpText="Unique identifier for the policy. Auto-assigned on creation.">
                    <Input placeholder="POL-2026-00123" />
                </ContextHelpTooltip>
            </div>
            <div className="flex flex-col gap-1.5">
                <Label>Client Name</Label>
                <ContextHelpTooltip helpText="Full legal name of the insured entity.">
                    <Input placeholder="e.g. Acme Corporation" />
                </ContextHelpTooltip>
            </div>
            <div className="flex flex-col gap-1.5">
                <Label>Sum Insured</Label>
                <ContextHelpTooltip helpText="Total coverage amount in the base currency. Cannot exceed the product maximum limit.">
                    <Input placeholder="e.g. 5000000" disabled />
                </ContextHelpTooltip>
            </div>
            <div className="flex flex-col gap-1.5">
                <Label>Channel</Label>
                <ContextHelpTooltip helpText="Distribution channel through which this policy was sold.">
                    <Input placeholder="e.g. Broker" />
                </ContextHelpTooltip>
            </div>
        </div>
    ),
};
