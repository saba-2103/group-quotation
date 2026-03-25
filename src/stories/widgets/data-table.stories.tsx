import type { Meta, StoryObj } from '@storybook/react';
import { DataTable } from '../../components/widgets/data/DataTable';

const meta: Meta<typeof DataTable> = {
    title: 'Widgets/DataTable',
    component: DataTable,
    tags: ['autodocs'],
    parameters: {
        nextjs: { appDirectory: true },
    },
};

export default meta;
type Story = StoryObj<typeof DataTable>;

// ── Shared mock data ──────────────────────────────────────────────────────────

const quotationRows = [
    { id: '1', quotationNumber: 'QBAG00000000001', clientName: 'Reliance Group',            quotationType: 'New Business', mainStatus: 'Pending',  transactionStatus: 'DR', channel: 'Broker' },
    { id: '2', quotationNumber: 'QBAG00000000002', clientName: 'Reliance Petrolium Ltd',    quotationType: 'New Business', mainStatus: 'Pending',  transactionStatus: 'CM', channel: 'Agent'  },
    { id: '3', quotationNumber: 'QBAG00000000003', clientName: 'Bajaj Finance Ltd',         quotationType: 'Renewal',      mainStatus: 'Approved', transactionStatus: 'RV', channel: 'Direct' },
    { id: '4', quotationNumber: 'QBAG00000000004', clientName: 'Motilal Oswal Home Finance',quotationType: 'New Business', mainStatus: 'Pending',  transactionStatus: 'RC', channel: 'Broker' },
    { id: '5', quotationNumber: 'QBAG00000000005', clientName: 'Muthoot Finance',           quotationType: 'New Business', mainStatus: 'Rejected', transactionStatus: 'AC', channel: 'Agent'  },
    { id: '6', quotationNumber: 'QBAG00000000006', clientName: 'HDFC Life Insurance',       quotationType: 'Renewal',      mainStatus: 'Pending',  transactionStatus: 'AD', channel: 'Broker' },
    { id: '7', quotationNumber: 'QBAG00000000007', clientName: 'Tata Capital Ltd',          quotationType: 'New Business', mainStatus: 'Rejected', transactionStatus: 'IA', channel: 'Direct' },
];

const transactionStatusMapping = [
    { value: 'DR', label: 'Draft',            variant: 'grey'        },
    { value: 'CM', label: 'Completed',        variant: 'info'        },
    { value: 'RV', label: 'Review',           variant: 'warning'     },
    { value: 'RC', label: 'Review Completed', variant: 'teal'        },
    { value: 'AC', label: 'Active',           variant: 'success'     },
    { value: 'AD', label: 'Active Draft',     variant: 'amber'       },
    { value: 'IA', label: 'In-Active',        variant: 'destructive' },
];

const mainStatusMapping = [
    { value: 'Pending',  label: 'Pending',  variant: 'warning'     },
    { value: 'Approved', label: 'Approved', variant: 'success'     },
    { value: 'Rejected', label: 'Rejected', variant: 'destructive' },
];

// ── Stories ───────────────────────────────────────────────────────────────────

// --- Basic table ---
export const Basic: Story = {
    args: {
        config: {
            id: 'data-table-basic',
            type: 'data-table',
            props: {
                data: quotationRows,
                columns: [
                    { header: 'Quotation #',  accessorKey: 'quotationNumber', sortable: true },
                    { header: 'Client Name',  accessorKey: 'clientName',      sortable: true },
                    { header: 'Type',         accessorKey: 'quotationType',   sortable: true },
                    { header: 'Channel',      accessorKey: 'channel',         sortable: true },
                ],
            },
        },
    },
};

// --- Badge columns (status + transaction status) ---
export const WithBadgeColumns: Story = {
    args: {
        config: {
            id: 'data-table-badges',
            type: 'data-table',
            props: {
                data: quotationRows,
                columns: [
                    { header: 'Quotation #',        accessorKey: 'quotationNumber',   sortable: true },
                    { header: 'Client Name',         accessorKey: 'clientName',        sortable: true },
                    {
                        header: 'Main Status',
                        accessorKey: 'mainStatus',
                        type: 'badge',
                        sortable: true,
                        valueMapping: mainStatusMapping,
                    },
                    {
                        header: 'Transaction Status',
                        accessorKey: 'transactionStatus',
                        type: 'badge',
                        sortable: true,
                        valueMapping: transactionStatusMapping,
                    },
                ],
            },
        },
    },
};

// --- With row actions including confirmation dialog ---
export const WithRowActions: Story = {
    args: {
        config: {
            id: 'data-table-row-actions',
            type: 'data-table',
            props: {
                data: quotationRows,
                columns: [
                    { header: 'Quotation #',  accessorKey: 'quotationNumber', sortable: true },
                    { header: 'Client Name',  accessorKey: 'clientName',      sortable: true },
                    {
                        header: 'Transaction Status',
                        accessorKey: 'transactionStatus',
                        type: 'badge',
                        valueMapping: transactionStatusMapping,
                    },
                ],
                rowActions: [
                    {
                        id: 'view',
                        label: 'View',
                        icon: 'Eye',
                        type: 'navigate',
                        target: '/quotations/:id',
                    },
                    {
                        id: 'withdraw',
                        label: 'Withdraw',
                        icon: 'XCircle',
                        variant: 'destructive',
                        type: 'api-mutation',
                        api: { endpoint: '/api/quotations/:id/withdraw', method: 'POST' },
                        confirm: {
                            title: 'Withdraw Quotation',
                            message: 'Are you sure you want to withdraw this quotation?',
                        },
                        successMessage: 'Quotation withdrawn successfully',
                    },
                ],
            },
        },
    },
};

// --- With bulk actions ---
export const WithBulkActions: Story = {
    args: {
        config: {
            id: 'data-table-bulk',
            type: 'data-table',
            props: {
                data: quotationRows,
                selectable: true,
                columns: [
                    { header: 'Quotation #',  accessorKey: 'quotationNumber', sortable: true },
                    { header: 'Client Name',  accessorKey: 'clientName',      sortable: true },
                    {
                        header: 'Transaction Status',
                        accessorKey: 'transactionStatus',
                        type: 'badge',
                        valueMapping: transactionStatusMapping,
                    },
                ],
                bulkActions: [
                    {
                        id: 'bulk-archive',
                        label: 'Archive Selected',
                        icon: 'Archive',
                        variant: 'outline',
                        type: 'api-mutation',
                        api: { endpoint: '/api/quotations/bulk-archive', method: 'POST' },
                        confirm: {
                            title: 'Archive Selected',
                            message: 'Are you sure you want to archive the selected quotations?',
                        },
                    },
                ],
            },
        },
    },
};

// --- With pagination ---
export const WithPagination: Story = {
    args: {
        config: {
            id: 'data-table-pagination',
            type: 'data-table',
            props: {
                data: quotationRows,
                columns: [
                    { header: 'Quotation #',  accessorKey: 'quotationNumber', sortable: true },
                    { header: 'Client Name',  accessorKey: 'clientName',      sortable: true },
                    { header: 'Type',         accessorKey: 'quotationType',   sortable: true },
                ],
                pagination: { enabled: true, pageSize: 3, pageSizeOptions: [3, 5, 10] },
            },
        },
    },
};

// --- Full featured ---
export const FullFeatured: Story = {
    args: {
        config: {
            id: 'data-table-full',
            type: 'data-table',
            props: {
                data: quotationRows,
                selectable: true,
                searchable: true,
                searchPlaceholder: 'Search quotations...',
                columns: [
                    { header: 'Quotation #',        accessorKey: 'quotationNumber',   sortable: true, filterable: true },
                    { header: 'Client Name',         accessorKey: 'clientName',        sortable: true, filterable: true },
                    { header: 'Type',                accessorKey: 'quotationType',     sortable: true },
                    { header: 'Channel',             accessorKey: 'channel',           sortable: true },
                    {
                        header: 'Main Status',
                        accessorKey: 'mainStatus',
                        type: 'badge',
                        sortable: true,
                        valueMapping: mainStatusMapping,
                    },
                    {
                        header: 'Transaction Status',
                        accessorKey: 'transactionStatus',
                        type: 'badge',
                        sortable: true,
                        valueMapping: transactionStatusMapping,
                    },
                ],
                rowActions: [
                    { id: 'view', label: 'View', icon: 'Eye', type: 'navigate', target: '/quotations/:id' },
                    {
                        id: 'withdraw',
                        label: 'Withdraw',
                        icon: 'XCircle',
                        variant: 'destructive',
                        type: 'api-mutation',
                        api: { endpoint: '/api/quotations/:id/withdraw', method: 'POST' },
                        confirm: { title: 'Withdraw Quotation', message: 'Are you sure you want to withdraw this quotation?' },
                    },
                ],
                bulkActions: [
                    {
                        id: 'bulk-archive',
                        label: 'Archive Selected',
                        icon: 'Archive',
                        variant: 'outline',
                        type: 'api-mutation',
                        api: { endpoint: '/api/quotations/bulk-archive', method: 'POST' },
                        confirm: { title: 'Archive Selected', message: 'Are you sure you want to archive the selected quotations?' },
                    },
                ],
                pagination: { enabled: true, pageSize: 5, pageSizeOptions: [5, 10, 20] },
            },
        },
    },
};

// --- Empty state ---
export const EmptyState: Story = {
    args: {
        config: {
            id: 'data-table-empty',
            type: 'data-table',
            props: {
                data: [],
                columns: [
                    { header: 'Quotation #', accessorKey: 'quotationNumber' },
                    { header: 'Client Name', accessorKey: 'clientName' },
                ],
                emptyState: {
                    title: 'No quotations found',
                    description: 'There are no quotations matching your criteria.',
                },
            },
        },
    },
};
