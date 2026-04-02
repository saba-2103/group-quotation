import type { Meta, StoryObj } from '@storybook/react';
import { Skeleton } from '@/components/ui/skeleton';

const meta: Meta<typeof Skeleton> = {
    title: 'UI/Skeleton',
    component: Skeleton,
    tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof Skeleton>;

export const AllVariants: Story = {
    render: () => (
        <div className="flex flex-col gap-12 max-w-2xl">
            <div>
                 <h3 className="text-sm font-semibold mb-4 text-muted-foreground uppercase tracking-widest">Base Element</h3>
                 <Skeleton className="h-4 w-[250px]" />
            </div>
            
            <div>
                 <h3 className="text-sm font-semibold mb-4 text-muted-foreground uppercase tracking-widest">Paragraph Block</h3>
                 <div className="flex flex-col gap-2">
                    <Skeleton className="h-4 w-[300px]" />
                    <Skeleton className="h-4 w-[260px]" />
                    <Skeleton className="h-4 w-[220px]" />
                </div>
            </div>

            <div>
                 <h3 className="text-sm font-semibold mb-4 text-muted-foreground uppercase tracking-widest">Card Placeholder</h3>
                 <div className="rounded-lg border bg-card p-6 w-[300px] space-y-4 shadow-sm">
                    <div className="space-y-2">
                        <Skeleton className="h-4 w-[120px]" />
                        <Skeleton className="h-8 w-[80px]" />
                    </div>
                    <Skeleton className="h-4 w-[160px]" />
                </div>
            </div>

            <div>
                 <h3 className="text-sm font-semibold mb-4 text-muted-foreground uppercase tracking-widest">Table Row Simulation</h3>
                 <div className="w-full space-y-3 p-4 border rounded-lg shadow-sm">
                    {[...Array(3)].map((_, i) => (
                        <div key={i} className="flex gap-4 items-center border-b last:border-0 pb-3 last:pb-0">
                            <Skeleton className="h-4 w-[120px]" />
                            <Skeleton className="h-4 w-[160px]" />
                            <Skeleton className="h-4 flex-1" />
                            <Skeleton className="h-6 w-[60px] rounded-full" />
                        </div>
                    ))}
                </div>
            </div>
        </div>
    )
};

// --- Basic ---

export const Default: Story = {
    render: () => <Skeleton className="h-4 w-[250px]" />,
};

// --- Paragraph Block ---
export const Paragraph: Story = {
    render: () => (
        <div className="flex flex-col gap-2">
            <Skeleton className="h-4 w-[300px]" />
            <Skeleton className="h-4 w-[260px]" />
            <Skeleton className="h-4 w-[220px]" />
        </div>
    ),
};

// --- Card Loading Placeholder (as used in your dashboard) ---
export const CardSkeleton: Story = {
    render: () => (
        <div className="rounded-lg border bg-card p-6 w-[300px] space-y-4">
            <div className="space-y-2">
                <Skeleton className="h-4 w-[120px]" />
                <Skeleton className="h-8 w-[80px]" />
            </div>
            <Skeleton className="h-4 w-[160px]" />
        </div>
    ),
};

// --- Table Row Loading Placeholder ---
export const TableRowSkeleton: Story = {
    render: () => (
        <div className="w-full space-y-3">
            {[...Array(5)].map((_, i) => (
                <div key={i} className="flex gap-4 items-center">
                    <Skeleton className="h-4 w-[120px]" />
                    <Skeleton className="h-4 w-[160px]" />
                    <Skeleton className="h-4 w-[100px]" />
                    <Skeleton className="h-4 w-[80px]" />
                    <Skeleton className="h-6 w-[60px] rounded-full" />
                </div>
            ))}
        </div>
    ),
};

// --- Page Header Loading Placeholder ---
export const PageHeaderSkeleton: Story = {
    render: () => (
        <div className="space-y-2">
            <Skeleton className="h-8 w-[200px]" />
            <Skeleton className="h-4 w-[350px]" />
        </div>
    ),
};
