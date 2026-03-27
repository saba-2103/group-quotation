import type { Meta, StoryObj } from '@storybook/react';
import { PageHeader } from '../../components/widgets/layout/PageHeader/PageHeader';

const meta: Meta<typeof PageHeader> = {
    title: 'Widgets/PageHeader',
    component: PageHeader,
    tags: ['autodocs'],
    parameters: {
        nextjs: { appDirectory: true },
    },
};

export default meta;
type Story = StoryObj<typeof PageHeader>;

// ── Basic — title only ────────────────────────────────────────────────────────

export const Basic: Story = {
    name: 'Basic — Title Only',
    args: {
        config: {
            id: 'ph-basic',
            type: 'page-header',
            props: {
                title: 'Quotation List',
                description: 'Manage all quotations',
            },
        },
    },
};

// ── Action option box ─────────────────────────────────────────────────────────

export const WithValidActions: Story = {
    name: 'Action Option Box — validActions',
    args: {
        config: {
            id: 'ph-valid-actions',
            type: 'page-header',
            props: {
                title: 'Policy Header',
                validActions: [
                    { code: 'add',     label: 'Add'     },
                    { code: 'edit',    label: 'Edit'    },
                    { code: 'enquire', label: 'Enquire' },
                ],
            },
        },
    },
};

// ── Valid buttons ─────────────────────────────────────────────────────────────

export const WithValidButtons: Story = {
    name: 'Valid Buttons — Submit / Close',
    args: {
        config: {
            id: 'ph-valid-buttons',
            type: 'page-header',
            props: {
                title: 'Policy Header',
                validButtons: [
                    { id: 'submit', label: 'Submit', variant: 'secondary', type: 'trigger-event', target: 'submit' },
                    { id: 'close',  label: 'Close',  variant: 'ghost',     type: 'trigger-event', target: 'close'  },
                ],
            },
        },
    },
};

// ── Workflow — TransactionStatus Badge ────────────────────────────────────────

export const WithWorkflow: Story = {
    name: 'Workflow — Status Badge',
    args: {
        config: {
            id: 'ph-workflow',
            type: 'page-header',
            props: {
                title: 'Policy Header',
                hasWorkflow: true,
                tranStatus: { label: 'Active', variant: 'success' },
                validButtons: [
                    { id: 'submit', label: 'Submit', variant: 'secondary', type: 'trigger-event', target: 'submit' },
                    { id: 'close',  label: 'Close',  variant: 'ghost',     type: 'trigger-event', target: 'close'  },
                ],
            },
        },
    },
};

// ── Help icon ─────────────────────────────────────────────────────────────────

export const WithHelp: Story = {
    name: 'Help Icon — opens side panel',
    args: {
        config: {
            id: 'ph-help',
            type: 'page-header',
            props: {
                title: 'Policy Header',
                actions: [
                    { id: 'screen-help', label: 'Screen Help', icon: 'HelpCircle', display: 'icon', variant: 'ghost', type: 'open-sheet', target: 'pol-header-001-help' },
                ],
            },
        },
    },
};

// ── Error banner slot ─────────────────────────────────────────────────────────

export const WithErrors: Story = {
    name: 'Error Banner — backendErrors',
    args: {
        config: {
            id: 'ph-errors',
            type: 'page-header',
            props: {
                title: 'Policy Header',
                backendErrors: [
                    { error_code: 'ERR-001', error_desc: 'Policy number already exists in the system.' },
                    { error_code: 'ERR-042', error_desc: 'Effective date cannot be in the past.' },
                ],
            },
        },
    },
};

// ── All features combined ─────────────────────────────────────────────────────

export const AllFeatures: Story = {
    name: 'All Features Combined',
    args: {
        config: {
            id: 'ph-all',
            type: 'page-header',
            props: {
                title: 'Policy Header',
                description: 'Group Life — Acme Corporation',
                validActions: [
                    { code: 'add',     label: 'Add'     },
                    { code: 'edit',    label: 'Edit'    },
                    { code: 'delete',  label: 'Delete'  },
                    { code: 'enquire', label: 'Enquire' },
                    { code: 'review',  label: 'Review'  },
                ],
                validButtons: [
                    { id: 'submit', label: 'Submit', variant: 'secondary', event: 'submit' },
                    { id: 'close',  label: 'Close',  variant: 'ghost',     event: 'close'  },
                ],
                hasWorkflow: true,
                tranStatus: { label: 'Review', variant: 'warning' },
                backendErrors: [
                    { error_code: 'ERR-021', error_desc: 'Sum insured exceeds the maximum limit for this product.' },
                ],
            },
        },
    },
};
