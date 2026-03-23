import type { Meta, StoryObj } from '@storybook/react';
import { TabsContainer } from '../../components/widgets/container/TabsContainer';

const meta: Meta<typeof TabsContainer> = {
    title: 'Widgets/TabsContainer',
    component: TabsContainer,
    tags: ['autodocs'],
    parameters: {
        nextjs: { appDirectory: true },
    },
};

export default meta;
type Story = StoryObj<typeof TabsContainer>;

// Shared tab children with simple text content
const basicTabs = [
    {
        id: 'tab-header',
        type: 'tab',
        props: { label: 'Common Header' },
        children: [],
    },
    {
        id: 'tab-profile',
        type: 'tab',
        props: { label: 'Policy Profile' },
        children: [],
    },
    {
        id: 'tab-documents',
        type: 'tab',
        props: { label: 'Documents' },
        children: [],
    },
];

// ── Basic navigation (Prev / Next) ────────────────────────────────────────────

export const WithPrevNext: Story = {
    name: 'Prev / Next Navigation',
    args: {
        config: {
            id: 'tabs-prev-next',
            type: 'tabs-container',
            props: {},
            children: basicTabs,
        },
    },
};

// ── Nav guard (confirmNavigation) ─────────────────────────────────────────────

export const WithNavGuard: Story = {
    name: 'Nav Guard — Unsaved Changes Dialog',
    args: {
        config: {
            id: 'tabs-nav-guard',
            type: 'tabs-container',
            props: {
                confirmNavigation: true,
            },
            children: basicTabs,
        },
    },
};

// ── Workflow — Complete button on last tab ────────────────────────────────────

export const WithWorkflow: Story = {
    name: 'Workflow — Complete on Last Tab',
    args: {
        config: {
            id: 'tabs-workflow',
            type: 'tabs-container',
            props: {
                hasWorkflow: true,
            },
            children: basicTabs,
        },
    },
};

// ── Delete action per tab ─────────────────────────────────────────────────────

export const WithDeleteAction: Story = {
    name: 'Delete Action Per Tab',
    args: {
        config: {
            id: 'tabs-delete',
            type: 'tabs-container',
            props: {},
            children: [
                {
                    id: 'tab-plan-a',
                    type: 'tab',
                    props: {
                        label: 'Plan A',
                        deleteAction: {
                            id: 'delete-plan-a',
                            type: 'api-mutation',
                            label: 'Delete Plan',
                            variant: 'destructive',
                            confirm: {
                                title: 'Delete Plan A?',
                                message: 'This will permanently remove Plan A and all associated data.',
                            },
                            api: {
                                endpoint: '/api/plans/a',
                                method: 'DELETE',
                            },
                        },
                    },
                    children: [],
                },
                {
                    id: 'tab-plan-b',
                    type: 'tab',
                    props: {
                        label: 'Plan B',
                        deleteAction: {
                            id: 'delete-plan-b',
                            type: 'api-mutation',
                            label: 'Delete Plan',
                            variant: 'destructive',
                            confirm: {
                                title: 'Delete Plan B?',
                                message: 'This will permanently remove Plan B and all associated data.',
                            },
                            api: {
                                endpoint: '/api/plans/b',
                                method: 'DELETE',
                            },
                        },
                    },
                    children: [],
                },
            ],
        },
    },
};

// ── Form persistence — nav guard + Prev/Next ─────────────────────────────────
// Fill in fields on Tab 1, then click Next or a different tab.
// • "Stay"             → returns to tab, fields intact
// • "Discard & Continue" → navigates away, fields reset on return
// • "Save & Continue"  → triggers save event and navigates

export const WithFormNavGuard: Story = {
    name: 'Form — Nav Guard + Prev/Next Persistence',
    args: {
        config: {
            id: 'tabs-form-nav',
            type: 'tabs-container',
            props: {
                confirmNavigation: true,
                hasWorkflow: true,
            },
            children: [
                {
                    id: 'tab-policy-header',
                    type: 'tab',
                    props: { label: 'Policy Header' },
                    children: [
                        {
                            id: 'form-policy-header',
                            type: 'form-container',
                            props: {
                                mode: 'edit',
                                columns: 2,
                                fields: [
                                    {
                                        name: 'policyNumber',
                                        label: 'Policy Number',
                                        type: 'text',
                                        placeholder: 'e.g. POL-2026-001',
                                        isPrimaryKey: true,
                                        validations: [{ rule: 'required', message: 'Policy number is required' }],
                                    },
                                    {
                                        name: 'policyName',
                                        label: 'Policy Name',
                                        type: 'text',
                                        placeholder: 'e.g. Group Life Cover',
                                        validations: [{ rule: 'required', message: 'Policy name is required' }],
                                    },
                                    {
                                        name: 'effectiveDate',
                                        label: 'Effective Date',
                                        type: 'date',
                                        placeholder: 'Select date',
                                    },
                                    {
                                        name: 'status',
                                        label: 'Status',
                                        type: 'select',
                                        placeholder: 'Select status',
                                        options: [
                                            { value: 'draft', label: 'Draft' },
                                            { value: 'active', label: 'Active' },
                                            { value: 'inactive', label: 'Inactive' },
                                        ],
                                    },
                                ],
                                actions: [
                                    { id: 'save-header', label: 'Save', submitAction: true },
                                ],
                            },
                        },
                    ],
                },
                {
                    id: 'tab-policy-profile',
                    type: 'tab',
                    props: { label: 'Policy Profile' },
                    children: [
                        {
                            id: 'form-policy-profile',
                            type: 'form-container',
                            props: {
                                mode: 'edit',
                                columns: 2,
                                fields: [
                                    {
                                        name: 'insuredName',
                                        label: 'Insured Name',
                                        type: 'text',
                                        placeholder: 'e.g. Acme Corporation',
                                        validations: [{ rule: 'required', message: 'Insured name is required' }],
                                    },
                                    {
                                        name: 'email',
                                        label: 'Email',
                                        type: 'email',
                                        placeholder: 'e.g. contact@acme.com',
                                    },
                                    {
                                        name: 'phone',
                                        label: 'Phone',
                                        type: 'tel',
                                        placeholder: 'e.g. +1 555 000 0000',
                                    },
                                    {
                                        name: 'notes',
                                        label: 'Notes',
                                        type: 'textarea',
                                        placeholder: 'Any additional notes...',
                                    },
                                ],
                                actions: [
                                    { id: 'save-profile', label: 'Save', submitAction: true },
                                ],
                            },
                        },
                    ],
                },
                {
                    id: 'tab-plans',
                    type: 'tab',
                    props: {
                        label: 'Plans',
                        deleteAction: {
                            id: 'delete-plan',
                            type: 'api-mutation',
                            label: 'Delete Plan',
                            variant: 'destructive',
                            confirm: {
                                title: 'Delete this plan?',
                                message: 'This will permanently remove the plan and all associated data. This action cannot be undone.',
                            },
                            api: { endpoint: '/api/plans/1', method: 'DELETE' },
                        },
                    },
                    children: [
                        {
                            id: 'form-plan',
                            type: 'form-container',
                            props: {
                                mode: 'edit',
                                columns: 2,
                                fields: [
                                    {
                                        name: 'planName',
                                        label: 'Plan Name',
                                        type: 'text',
                                        placeholder: 'e.g. Basic Life',
                                        validations: [{ rule: 'required', message: 'Plan name is required' }],
                                    },
                                    {
                                        name: 'sumInsured',
                                        label: 'Sum Insured',
                                        type: 'number',
                                        placeholder: 'e.g. 500000',
                                    },
                                    {
                                        name: 'startDate',
                                        label: 'Plan Start Date',
                                        type: 'date',
                                    },
                                    {
                                        name: 'renewable',
                                        label: 'Renewable',
                                        type: 'checkbox',
                                    },
                                ],
                                actions: [
                                    { id: 'save-plan', label: 'Save', submitAction: true },
                                ],
                            },
                        },
                    ],
                },
            ],
        },
    },
};

// ── All features combined ─────────────────────────────────────────────────────

export const AllFeatures: Story = {
    name: 'All Features — Nav Guard + Workflow + Delete',
    args: {
        config: {
            id: 'tabs-all',
            type: 'tabs-container',
            props: {
                confirmNavigation: true,
                hasWorkflow: true,
            },
            children: [
                {
                    id: 'tab-header-full',
                    type: 'tab',
                    props: { label: 'Common Header' },
                    children: [],
                },
                {
                    id: 'tab-profile-full',
                    type: 'tab',
                    props: { label: 'Policy Profile' },
                    children: [],
                },
                {
                    id: 'tab-plans-full',
                    type: 'tab',
                    props: {
                        label: 'Plans',
                        deleteAction: {
                            id: 'delete-plan',
                            type: 'api-mutation',
                            label: 'Delete Plan',
                            variant: 'destructive',
                            confirm: {
                                title: 'Delete this plan?',
                                message: 'This action cannot be undone.',
                            },
                            api: {
                                endpoint: '/api/plans/1',
                                method: 'DELETE',
                            },
                        },
                    },
                    children: [],
                },
            ],
        },
    },
};
