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
    tranStatus: 'AC',
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
                    { id: 'tranStatus',    label: 'Status',         accessorKey: 'tranStatus',    type: 'transaction-status' },
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
                    { id: 'policyNumber', label: 'Policy Number', accessorKey: 'policyNumber', icon: 'FileText' },
                    { id: 'clientName',   label: 'Client Name',   accessorKey: 'clientName',   icon: 'Building2' },
                    { id: 'channel',      label: 'Channel',       accessorKey: 'channel',      icon: 'Network' },
                    { id: 'sumInsured',   label: 'Sum Insured',   accessorKey: 'sumInsured',   icon: 'Banknote' },
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
                    { id: 'effectiveDate', label: 'Effective Date',  accessorKey: 'effectiveDate', type: 'date', icon: 'CalendarCheck' },
                    { id: 'expiryDate',    label: 'Expiry Date',     accessorKey: 'expiryDate',    type: 'date', icon: 'CalendarX' },
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
                    { id: 'effectiveDate', label: 'Effective Date',  accessorKey: 'effectiveDate', type: 'date', icon: 'CalendarCheck' },
                    { id: 'expiryDate',    label: 'Expiry Date',     accessorKey: 'expiryDate',    type: 'date', icon: 'CalendarX' },
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
                    { id: 'tranStatus',   label: 'Status',        accessorKey: 'tranStatus', type: 'transaction-status', icon: 'Activity' },
                    { id: 'channel',      label: 'Channel',       accessorKey: 'channel' },
                ],
            },
        },
    },
};

// ── All 7 transaction status codes ───────────────────────────────────────────

export const AllTransactionStatuses: Story = {
    name: 'All Transaction Status Codes',
    render: () => (
        <div className="flex flex-col gap-4">
            {(['DR', 'CM', 'RV', 'RC', 'AC', 'AD', 'IA'] as const).map((code) => {
                const client = new QueryClient({ defaultOptions: { queries: { staleTime: Infinity } } });
                const endpoint = `/api/mock/policy-${code}`;
                client.setQueryData([endpoint, 'GET', undefined], { ...policyData, tranStatus: code });
                return (
                    <QueryClientProvider key={code} client={client}>
                        <KeyValueGrid
                            config={{
                                id: `kv-status-${code}`,
                                type: 'key-value-grid',
                                dataSource: { api: { endpoint, method: 'GET' } },
                                props: {
                                    fields: [
                                        { id: 'policyNumber',  label: 'Policy Number',  accessorKey: 'policyNumber' },
                                        { id: 'clientName',    label: 'Client Name',    accessorKey: 'clientName' },
                                        { id: 'tranStatus',    label: 'Status',         accessorKey: 'tranStatus', type: 'transaction-status', icon: 'Activity' },
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
                    { id: 'policyNumber',  label: 'Policy Number',  accessorKey: 'policyNumber',  icon: 'FileText' },
                    { id: 'clientName',    label: 'Client Name',    accessorKey: 'clientName',    icon: 'Building2' },
                    { id: 'effectiveDate', label: 'Effective Date', accessorKey: 'effectiveDate', type: 'date',               icon: 'CalendarCheck' },
                    { id: 'expiryDate',    label: 'Expiry Date',    accessorKey: 'expiryDate',    type: 'date',               icon: 'CalendarX' },
                    { id: 'tranStatus',    label: 'Status',         accessorKey: 'tranStatus',    type: 'transaction-status', icon: 'Activity' },
                    { id: 'renewable',     label: 'Renewable',      accessorKey: 'renewable',     type: 'badge',              icon: 'RefreshCw' },
                    { id: 'channel',       label: 'Channel',        accessorKey: 'channel',       icon: 'Network' },
                    { id: 'sumInsured',    label: 'Sum Insured',    accessorKey: 'sumInsured',    icon: 'Banknote' },
                ],
            },
        },
    },
};
