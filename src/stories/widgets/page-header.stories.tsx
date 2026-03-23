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
                validActions: ['add', 'edit', 'enquire'],
            },
        },
    },
};

// ── Valid buttons ─────────────────────────────────────────────────────────────

export const WithValidButtons: Story = {
    name: 'Valid Buttons — Save / Close / Delete',
    args: {
        config: {
            id: 'ph-valid-buttons',
            type: 'page-header',
            props: {
                title: 'Policy Header',
                validButtons: ['save', 'delete', 'close'],
            },
        },
    },
};

// ── Workflow — Complete button + TransactionStatusBadge ───────────────────────

export const WithWorkflow: Story = {
    name: 'Workflow — Complete + Status Badge',
    args: {
        config: {
            id: 'ph-workflow',
            type: 'page-header',
            props: {
                title: 'Policy Header',
                hasWorkflow: true,
                tranStatus: 'AC',
                validButtons: ['save', 'prev', 'next', 'complete', 'close'],
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
                screenCode: 'POL-HEADER-001',
                helpText: 'This screen allows you to manage the policy header details.\n\nFill in all mandatory fields (marked with *) before saving.\n\nContact your administrator if you need access to additional actions.',
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
                validActions: ['add', 'edit', 'delete', 'enquire', 'review'],
                validButtons: ['save', 'submit', 'prev', 'next', 'complete', 'close'],
                hasWorkflow: true,
                tranStatus: 'RV',
                screenCode: 'POL-HEADER-001',
                helpText: 'This screen allows you to manage the policy header details.',
                backendErrors: [
                    { error_code: 'ERR-021', error_desc: 'Sum insured exceeds the maximum limit for this product.' },
                ],
            },
        },
    },
};
