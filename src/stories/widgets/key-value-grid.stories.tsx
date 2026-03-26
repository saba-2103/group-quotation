import type { Meta, StoryObj } from '@storybook/react';
import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { KeyValueGrid } from '../../components/widgets/data/KeyValueGrid';
import { TenantConfigProvider } from '../../contexts/TenantConfigContext';

const meta: Meta<typeof KeyValueGrid> = {
    title: 'Widgets/KeyValueGrid',
    component: KeyValueGrid,
    tags: ['autodocs'],
    parameters: {
        nextjs: { appDirectory: true },
    },
};

export default meta;
type Story = StoryObj<typeof KeyValueGrid>;

// ── Mock data ─────────────────────────────────────────────────────────────────

const MOCK_ENDPOINT = '/api/mock/policy-summary';

const policyData = {
    policyNumber: 'POL-2026-00123',
    clientName: 'Reliance Group',
    effectiveDate: '2026-01-01',
    expiryDate: '2026-12-31',
    tranStatus: { label: 'Active', variant: 'success' },
    channel: 'Broker',
    sumInsured: '5,000,000',
    renewable: 'Yes',
};

// Decorator that pre-seeds React Query cache — no network call needed
const withMockData = (data: object) => (Story: React.ComponentType) => {
    const client = new QueryClient({ defaultOptions: { queries: { staleTime: Infinity } } });
    client.setQueryData([MOCK_ENDPOINT, 'GET', undefined], data);
    return (
        <QueryClientProvider client={client}>
            <Story />
        </QueryClientProvider>
    );
};

const mockDataSource = {
    api: { endpoint: MOCK_ENDPOINT, method: 'GET' as const },
};

// ── Empty (no data source) ────────────────────────────────────────────────────

export const Empty: Story = {
    name: 'Empty — No Data',
    args: {
        config: {
            id: 'kv-empty',
            type: 'key-value-grid',
            props: {
                fields: [
                    { id: 'policyNumber',  label: 'Policy Number',  accessorKey: 'policyNumber' },
                    { id: 'clientName',    label: 'Client Name',    accessorKey: 'clientName' },
                    { id: 'effectiveDate', label: 'Effective Date', accessorKey: 'effectiveDate', type: 'date' },
                    { id: 'tranStatus',    label: 'Status',         accessorKey: 'tranStatus',    type: 'badge' },
                ],
            },
        },
    },
};

// ── Basic — text fields ───────────────────────────────────────────────────────

export const Basic: Story = {
    name: 'Basic — Text Fields',
    decorators: [withMockData(policyData)],
    args: {
        config: {
            id: 'kv-basic',
            type: 'key-value-grid',
            dataSource: mockDataSource,
            props: {
                fields: [
                    { id: 'policyNumber', label: 'Policy Number', accessorKey: 'policyNumber' },
                    { id: 'clientName',   label: 'Client Name',   accessorKey: 'clientName' },
                    { id: 'channel',      label: 'Channel',       accessorKey: 'channel' },
                    { id: 'sumInsured',   label: 'Sum Insured',   accessorKey: 'sumInsured' },
                ],
            },
        },
    },
};

// ── Date fields — DD/MM/YYYY ──────────────────────────────────────────────────

export const WithDateFieldsDDMMYYYY: Story = {
    name: 'Date Fields — DD/MM/YYYY',
    decorators: [
        withMockData(policyData),
        (Story) => (
            <TenantConfigProvider dateFormat="DD/MM/YYYY">
                <Story />
            </TenantConfigProvider>
        ),
    ],
    args: {
        config: {
            id: 'kv-dates-dmy',
            type: 'key-value-grid',
            dataSource: mockDataSource,
            props: {
                fields: [
                    { id: 'policyNumber',  label: 'Policy Number',  accessorKey: 'policyNumber' },
                    { id: 'effectiveDate', label: 'Effective Date',  accessorKey: 'effectiveDate', type: 'date' },
                    { id: 'expiryDate',    label: 'Expiry Date',     accessorKey: 'expiryDate',    type: 'date' },
                    { id: 'channel',       label: 'Channel',         accessorKey: 'channel' },
                ],
            },
        },
    },
};

// ── Date fields — MM/DD/YYYY ──────────────────────────────────────────────────

export const WithDateFieldsMMDDYYYY: Story = {
    name: 'Date Fields — MM/DD/YYYY',
    decorators: [
        withMockData(policyData),
        (Story) => (
            <TenantConfigProvider dateFormat="MM/DD/YYYY">
                <Story />
            </TenantConfigProvider>
        ),
    ],
    args: {
        config: {
            id: 'kv-dates-mdy',
            type: 'key-value-grid',
            dataSource: mockDataSource,
            props: {
                fields: [
                    { id: 'policyNumber',  label: 'Policy Number',  accessorKey: 'policyNumber' },
                    { id: 'effectiveDate', label: 'Effective Date',  accessorKey: 'effectiveDate', type: 'date' },
                    { id: 'expiryDate',    label: 'Expiry Date',     accessorKey: 'expiryDate',    type: 'date' },
                    { id: 'channel',       label: 'Channel',         accessorKey: 'channel' },
                ],
            },
        },
    },
};

// ── Transaction status ────────────────────────────────────────────────────────

export const WithTransactionStatus: Story = {
    name: 'Transaction Status Field',
    decorators: [withMockData(policyData)],
    args: {
        config: {
            id: 'kv-tran-status',
            type: 'key-value-grid',
            dataSource: mockDataSource,
            props: {
                fields: [
                    { id: 'policyNumber', label: 'Policy Number', accessorKey: 'policyNumber' },
                    { id: 'clientName',   label: 'Client Name',   accessorKey: 'clientName' },
                    { id: 'tranStatus',   label: 'Status',        accessorKey: 'tranStatus', type: 'badge' },
                    { id: 'channel',      label: 'Channel',       accessorKey: 'channel' },
                ],
            },
        },
    },
};

// ── All 7 transaction status codes ───────────────────────────────────────────

const STATUS_OBJECTS = [
    { label: 'Draft',            variant: 'grey'        },
    { label: 'Completed',        variant: 'info'        },
    { label: 'Review',           variant: 'warning'     },
    { label: 'Review Completed', variant: 'teal'        },
    { label: 'Active',           variant: 'success'     },
    { label: 'Active Draft',     variant: 'amber'       },
    { label: 'In-Active',        variant: 'destructive' },
] as const;

export const AllTransactionStatuses: Story = {
    name: 'All Transaction Status Codes',
    render: () => (
        <div className="flex flex-col gap-4">
            {STATUS_OBJECTS.map((status) => {
                const client = new QueryClient({ defaultOptions: { queries: { staleTime: Infinity } } });
                const endpoint = `/api/mock/policy-${status.label}`;
                client.setQueryData([endpoint, 'GET', undefined], { ...policyData, tranStatus: status });
                return (
                    <QueryClientProvider key={status.label} client={client}>
                        <KeyValueGrid
                            config={{
                                id: `kv-status-${status.label}`,
                                type: 'key-value-grid',
                                dataSource: { api: { endpoint, method: 'GET' as const } },
                                props: {
                                    fields: [
                                        { id: 'policyNumber',  label: 'Policy Number',  accessorKey: 'policyNumber' },
                                        { id: 'clientName',    label: 'Client Name',    accessorKey: 'clientName' },
                                        { id: 'tranStatus',    label: 'Status',         accessorKey: 'tranStatus', type: 'badge' },
                                        { id: 'effectiveDate', label: 'Effective Date', accessorKey: 'effectiveDate', type: 'date' },
                                    ],
                                },
                            }}
                        />
                    </QueryClientProvider>
                );
            })}
        </div>
    ),
};

// ── All field types combined ──────────────────────────────────────────────────

export const AllFieldTypes: Story = {
    name: 'All Field Types — Text + Date + Status + Badge',
    decorators: [
        withMockData(policyData),
        (Story) => (
            <TenantConfigProvider dateFormat="DD/MM/YYYY">
                <Story />
            </TenantConfigProvider>
        ),
    ],
    args: {
        config: {
            id: 'kv-all-types',
            type: 'key-value-grid',
            dataSource: mockDataSource,
            props: {
                fields: [
                    { id: 'policyNumber',  label: 'Policy Number',  accessorKey: 'policyNumber' },
                    { id: 'clientName',    label: 'Client Name',    accessorKey: 'clientName' },
                    { id: 'effectiveDate', label: 'Effective Date', accessorKey: 'effectiveDate', type: 'date' },
                    { id: 'expiryDate',    label: 'Expiry Date',    accessorKey: 'expiryDate',    type: 'date' },
                    { id: 'tranStatus',    label: 'Status',         accessorKey: 'tranStatus',    type: 'badge' },
                    { id: 'channel',       label: 'Channel',        accessorKey: 'channel' },
                    { id: 'sumInsured',    label: 'Sum Insured',    accessorKey: 'sumInsured' },
                ],
            },
        },
    },
};
