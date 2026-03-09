import type { Meta, StoryObj } from '@storybook/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { DataTable } from '@/components/widgets/data/DataTable';

const makeQueryClient = () =>
    new QueryClient({ defaultOptions: { queries: { retry: false } } });

const meta: Meta<typeof DataTable> = {
    title: 'Widgets/Data/DataTable',
    component: DataTable,
    decorators: [
        (Story) => (
            <QueryClientProvider client={makeQueryClient()}>
                <div className="p-4" style={{ minHeight: '400px' }}>
                    <Story />
                </div>
            </QueryClientProvider>
        ),
    ],
};

export default meta;
type Story = StoryObj<typeof DataTable>;

// ─── Shared Configurations ───────────────────────────────────────────
const textCols = [
    { header: 'Client Name', accessorKey: 'name', type: 'text' },
    { header: 'Branch', accessorKey: 'branch', type: 'text' },
    { header: 'Email', accessorKey: 'email', type: 'text' },
];

const linkCols = [
    { header: 'Quotation No', accessorKey: 'quotationNumber', type: 'link', linkRoute: '/quotations/:id' },
    { header: 'Client', accessorKey: 'client', type: 'text' },
];

const badgeCols = [
    { header: 'Quotation No', accessorKey: 'quotationNumber', type: 'text' },
    {
        header: 'Status', accessorKey: 'status', type: 'badge',
        valueMapping: [
            { value: 'Approved', label: 'Approved', color: 'success' },
            { value: 'Pending', label: 'Pending', color: 'warning' },
            { value: 'Rejected', label: 'Rejected', color: 'error' },
        ]
    },
];

const currencyCols = [
    { header: 'Policy No', accessorKey: 'policyNo', type: 'text' },
    { header: 'Premium', accessorKey: 'premium', type: 'currency' },
    { header: 'Sum Insured', accessorKey: 'sumInsured', type: 'currency' },
];

const scrollCols = Array.from({ length: 12 }, (_, i) => ({
    header: `Column ${i + 1}`,
    accessorKey: `col${i + 1}`,
    type: 'text',
    width: 150
}));

// ─── All Variants Composite Story ────────────────────────────────

export const AllVariants: Story = {
    render: () => (
        <div className="flex flex-col gap-12 space-y-8">
            <div>
                <h3 className="text-lg font-semibold mb-4 text-foreground border-b pb-2">1. All Column Types (Text, Link, Badge, Currency, Number)</h3>
                <DataTable config={{
                    id: 'all-cols', type: 'data-table', props: {
                        columns: [
                            { header: 'Quotation', accessorKey: 'quotation', type: 'link', linkRoute: '#' },
                            { header: 'Client', accessorKey: 'client', type: 'text' },
                            { header: 'Status', accessorKey: 'status', type: 'badge', valueMapping: [{ value: 'Approved', color: 'success' }, { value: 'Pending', color: 'warning' }] },
                            { header: 'Premium', accessorKey: 'premium', type: 'currency' },
                            { header: 'Lives', accessorKey: 'lives', type: 'number' },
                        ],
                        data: [
                            { id: '1', quotation: 'Q-001', client: 'Acme Corp', status: 'Approved', premium: 12500, lives: 450 },
                            { id: '2', quotation: 'Q-002', client: 'GlobalTech', status: 'Pending', premium: 8400, lives: 120 },
                        ]
                    }
                }} />
            </div>

            <div>
                <h3 className="text-lg font-semibold mb-4 text-foreground border-b pb-2">2. Features: Selectable, Pagination, Row & Bulk Actions</h3>
                <DataTable config={{
                    id: 'all-features', type: 'data-table', props: {
                        selectable: true,
                        pagination: { enabled: true, pageSize: 2 },
                        columns: [
                            { header: 'Quotation', accessorKey: 'quotation', type: 'text' },
                            { header: 'Status', accessorKey: 'status', type: 'badge', valueMapping: [{ value: 'Pending', color: 'warning' }] },
                        ],
                        bulkActions: [{ id: 'bulk-approve', type: 'trigger-event', label: 'Approve Selected', variant: 'default', target: 'approve' }],
                        rowActions: [{ id: 'view', type: 'trigger-event', label: 'View', icon: 'Eye', target: 'view' }],
                        data: [
                            { id: '1', quotation: 'Q-001', status: 'Pending' },
                            { id: '2', quotation: 'Q-002', status: 'Pending' },
                            { id: '3', quotation: 'Q-003', status: 'Pending' },
                        ]
                    }
                }} />
            </div>

            <div>
                <h3 className="text-lg font-semibold mb-4 text-foreground border-b pb-2">3. Layout: Horizontal Scrolling (Many Columns)</h3>
                <div className="w-full max-w-full overflow-hidden">
                    <DataTable config={{
                        id: 'table-scroll-demo', type: 'data-table', props: {
                            selectable: true,
                            columns: scrollCols,
                            data: [
                                { id: '1', ...Object.fromEntries(Array.from({ length: 12 }, (_, i) => [`col${i + 1}`, `Data 1-${i + 1}`])) },
                                { id: '2', ...Object.fromEntries(Array.from({ length: 12 }, (_, i) => [`col${i + 1}`, `Data 2-${i + 1}`])) },
                            ]
                        }
                    }} />
                </div>
            </div>

            <div>
                <h3 className="text-lg font-semibold mb-4 text-foreground border-b pb-2">4. States: Empty & Loading</h3>
                <div className="flex flex-col gap-6">
                    <DataTable config={{ id: 'empty', type: 'data-table', props: { columns: textCols, data: [] } }} />
                    <DataTable config={{ id: 'loading', type: 'data-table', props: { columns: textCols, isLoading: true } }} />
                </div>
            </div>
        </div>
    )
};


// ─── Individual Stories ──────────────────────────────────────

export const TextColumns: Story = {
    args: {
        config: {
            id: 'table-text', type: 'data-table',
            props: {
                columns: textCols,
                data: [
                    { id: '1', name: 'Acme Corp', branch: 'Dubai', email: 'acme@corp.com' },
                    { id: '2', name: 'GlobalTech', branch: 'Abu Dhabi', email: 'info@globaltech.com' },
                ],
            },
        },
    },
};

export const LinkColumns: Story = {
    args: {
        config: {
            id: 'table-link', type: 'data-table',
            props: {
                columns: linkCols,
                data: [{ id: '1', quotationNumber: 'Q-2024-001', client: 'Acme Corp' }],
            },
        },
    },
};

export const BadgeColumns: Story = {
    args: {
        config: {
            id: 'table-badge', type: 'data-table',
            props: {
                columns: badgeCols,
                data: [
                    { id: '1', quotationNumber: 'Q-2024-001', status: 'Approved' },
                    { id: '2', quotationNumber: 'Q-2024-002', status: 'Pending' },
                ],
            },
        },
    },
};

export const CurrencyColumns: Story = {
    args: {
        config: {
            id: 'table-currency', type: 'data-table',
            props: {
                columns: currencyCols,
                data: [{ id: '1', policyNo: 'POL-001', premium: 12500, sumInsured: 500000 }],
            },
        },
    },
};

export const HorizontalScroll: Story = {
    args: {
        config: {
            id: 'table-scroll', type: 'data-table',
            props: {
                columns: scrollCols, // SCROLLABLE_COLUMN_THRESHOLD is 7. Passing 12 forces scroll.
                data: [
                    { id: '1', ...Object.fromEntries(Array.from({ length: 12 }, (_, i) => [`col${i + 1}`, `Data 1-${i + 1}`])) },
                    { id: '2', ...Object.fromEntries(Array.from({ length: 12 }, (_, i) => [`col${i + 1}`, `Data 2-${i + 1}`])) },
                ],
            },
        },
    },
};

export const WithPagination: Story = {
    args: {
        config: {
            id: 'table-pagination', type: 'data-table',
            props: {
                pagination: { enabled: true, pageSize: 3 },
                columns: textCols,
                data: Array.from({ length: 9 }, (_, i) => ({
                    id: String(i + 1), name: `Client ${i + 1}`, branch: 'Dubai', email: `client${i + 1}@corp.com`
                })),
            },
        },
    },
};

export const WithRowAndBulkActions: Story = {
    args: {
        config: {
            id: 'table-actions', type: 'data-table',
            props: {
                selectable: true,
                columns: badgeCols,
                data: [
                    { id: '1', quotationNumber: 'Q-2024-001', status: 'Pending' },
                    { id: '2', quotationNumber: 'Q-2024-002', status: 'Pending' },
                ],
                bulkActions: [
                    { id: 'bulk-approve', type: 'trigger-event', label: 'Approve', variant: 'default', target: 'approve' }
                ],
                rowActions: [
                    { id: 'view', type: 'trigger-event', label: 'View', icon: 'Eye', target: 'view' }
                ],
            },
        },
    },
};
