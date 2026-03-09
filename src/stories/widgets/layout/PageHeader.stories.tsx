import type { Meta, StoryObj } from '@storybook/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { PageHeader } from '@/components/widgets/layout/PageHeader';

const makeQueryClient = () =>
    new QueryClient({ defaultOptions: { queries: { retry: false } } });

const meta: Meta<typeof PageHeader> = {
    title: 'Widgets/Layout/PageHeader',
    component: PageHeader,
    decorators: [
        (Story) => (
            <QueryClientProvider client={makeQueryClient()}>
                <div className="p-6 bg-background space-y-2">
                    <Story />
                </div>
            </QueryClientProvider>
        ),
    ],
};

export default meta;
type Story = StoryObj<typeof PageHeader>;

// ─── All Variants Composite Story ────────────────────────────────

export const AllVariants: Story = {
    render: () => (
        <div className="flex flex-col gap-16">
            <div>
                <h3 className="text-sm font-semibold mb-4 text-muted-foreground uppercase tracking-widest">Minimal (Title Only)</h3>
                <div className="border rounded-lg shadow-sm">
                    <PageHeader config={{
                        id: 'v-minimal', type: 'page-header',
                        props: { title: 'Dashboard' }
                    }} />
                </div>
            </div>

            <div>
                <h3 className="text-sm font-semibold mb-4 text-muted-foreground uppercase tracking-widest">Default (Title + Description)</h3>
                <div className="border rounded-lg shadow-sm">
                    <PageHeader config={{
                        id: 'v-default', type: 'page-header',
                        props: { title: 'Settings', description: 'Manage your application preferences and configurations.' }
                    }} />
                </div>
            </div>

            <div>
                <h3 className="text-sm font-semibold mb-4 text-muted-foreground uppercase tracking-widest">Complex (Title + Description + Action Buttons)</h3>
                <div className="border rounded-lg shadow-sm">
                    <PageHeader config={{
                        id: 'v-complex', type: 'page-header',
                        props: { 
                            title: 'User Management', 
                            description: 'Add, revoke, or modify user access across the organization.',
                            actions: [
                                { id: 'filter', type: 'trigger-event', label: 'Filter', icon: 'Filter', variant: 'outline', target: 'filter' },
                                { id: 'invite', type: 'trigger-event', label: 'Invite User', icon: 'Plus', variant: 'default', target: 'invite' },
                            ]
                        }
                    }} />
                </div>
            </div>
        </div>
    )
};


// ─── Individual Stories ──────────────────────────────────────

export const Default: Story = {
    args: {
        config: {
            id: 'page-header-default', type: 'page-header',
            props: {
                title: 'Quotation Details',
                description: 'Manage and review the submitted quotation details here.',
            },
        },
    },
};

export const WithActions: Story = {
    args: {
        config: {
            id: 'page-header-with-actions', type: 'page-header',
            props: {
                title: 'Client Management',
                description: 'Overview of all registered clients in the system.',
                actions: [
                    { id: 'export', type: 'trigger-event', label: 'Export', icon: 'Download', variant: 'outline', target: 'export' },
                    { id: 'create', type: 'trigger-event', label: 'Create Client', icon: 'Plus', variant: 'default', target: 'create' },
                ],
            },
        },
    },
};

export const Minimal: Story = {
    args: {
        config: {
            id: 'page-header-minimal', type: 'page-header',
            props: { title: 'Settings' },
        },
    },
};
