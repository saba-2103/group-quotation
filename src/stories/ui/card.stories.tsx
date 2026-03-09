import type { Meta, StoryObj } from '@storybook/react';
import {
    Card,
    CardHeader,
    CardTitle,
    CardDescription,
    CardContent,
    CardFooter,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

const meta: Meta<typeof Card> = {
    title: 'UI/Card',
    component: Card,
    tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof Card>;

// --- Grid of Cards (All Variants style) ---
export const AllVariants: Story = {
    render: () => (
        <div className="grid grid-cols-3 gap-4 border p-4 bg-muted/20 rounded-xl">
            {['Total Claims', 'Pending Quotations', 'Active Policies'].map((title, i) => (
                <Card key={title}>
                    <CardHeader className="pb-2">
                        <CardDescription>{title}</CardDescription>
                        <CardTitle className="text-3xl font-bold">{(i + 1) * 40}</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <Badge variant={i === 1 ? 'warning' : 'success'}>
                            {i === 1 ? 'Pending' : 'Active'}
                        </Badge>
                    </CardContent>
                </Card>
            ))}
        </div>
    ),
};


// --- Basic Card ---

export const Default: Story = {
    render: () => (
        <Card className="w-[380px]">
            <CardHeader>
                <CardTitle>Card Title</CardTitle>
                <CardDescription>Card description goes here.</CardDescription>
            </CardHeader>
            <CardContent>
                <p className="text-sm text-muted-foreground">This is the card content area.</p>
            </CardContent>
        </Card>
    ),
};

// --- Card with Footer Actions ---
export const WithFooter: Story = {
    render: () => (
        <Card className="w-[380px]">
            <CardHeader>
                <CardTitle>Create Quotation</CardTitle>
                <CardDescription>Enter the basic details to start a new quotation.</CardDescription>
            </CardHeader>
            <CardContent>
                <p className="text-sm text-muted-foreground">Form fields would appear here.</p>
            </CardContent>
            <CardFooter className="flex justify-end gap-2">
                <Button variant="outline">Cancel</Button>
                <Button variant="default">Create Quotation</Button>
            </CardFooter>
        </Card>
    ),
};

// --- Metric / Summary Card (as used in your dashboard widgets) ---
export const MetricCard: Story = {
    render: () => (
        <Card className="w-[220px]">
            <CardHeader className="pb-2">
                <CardDescription>Total Claims</CardDescription>
                <CardTitle className="text-3xl font-bold">120</CardTitle>
            </CardHeader>
            <CardContent>
                <Badge variant="success">+12% this month</Badge>
            </CardContent>
        </Card>
    ),
};
