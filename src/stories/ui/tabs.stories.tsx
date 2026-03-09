import type { Meta, StoryObj } from '@storybook/react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';

const meta: Meta<typeof Tabs> = {
    title: 'UI/Tabs',
    component: Tabs,
    tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof Tabs>;

// --- All Variants Composite Story ---

export const AllVariants: Story = {
    render: () => {
        const manyTabs = [
            'Common Header', 'Policy Profile', 'Documents', 'Exclusions',
            'Subsidiaries', 'Plans', 'Health', 'Term Life',
        ];

        return (
            <div className="flex flex-col gap-12 space-y-8 max-w-4xl p-4">
                <div>
                     <h3 className="text-sm font-semibold mb-4 text-muted-foreground uppercase tracking-widest">Default (Pill Design)</h3>
                     <Tabs defaultValue="overview">
                        <TabsList variant="default">
                            <TabsTrigger variant="default" value="overview">Overview</TabsTrigger>
                            <TabsTrigger variant="default" value="policy">Policy</TabsTrigger>
                            <TabsTrigger variant="default" value="documents">Documents</TabsTrigger>
                        </TabsList>
                        <div className="border border-t-0 p-4 rounded-b-lg border-muted">
                            <TabsContent value="overview" className="mt-0">Overview content goes here.</TabsContent>
                            <TabsContent value="policy" className="mt-0">Policy content goes here.</TabsContent>
                            <TabsContent value="documents" className="mt-0">Documents content goes here.</TabsContent>
                        </div>
                     </Tabs>
                </div>

                <div>
                     <h3 className="text-sm font-semibold mb-4 text-muted-foreground uppercase tracking-widest">Case Variant (Underline Design)</h3>
                     <Tabs defaultValue="header">
                        <TabsList variant="case">
                            <TabsTrigger variant="case" value="header">Common Header</TabsTrigger>
                            <TabsTrigger variant="case" value="profile">Policy Profile</TabsTrigger>
                            <TabsTrigger variant="case" value="disabled" disabled>Disabled Tab</TabsTrigger>
                        </TabsList>
                        <div className="p-4 bg-muted/10">
                            <TabsContent value="header" className="mt-0">Common Header tab content.</TabsContent>
                            <TabsContent value="profile" className="mt-0">Policy Profile tab content.</TabsContent>
                        </div>
                     </Tabs>
                </div>

                <div>
                     <h3 className="text-sm font-semibold mb-4 text-muted-foreground uppercase tracking-widest">Many Tabs (Horizontal Scroll)</h3>
                     <Tabs defaultValue={manyTabs[0]}>
                        <TabsList variant="case" className="overflow-x-auto overflow-y-hidden border-b block whitespace-nowrap scrollbar-hide">
                            {manyTabs.map((tab) => (
                                <TabsTrigger key={tab} variant="case" value={tab}>
                                    {tab}
                                </TabsTrigger>
                            ))}
                        </TabsList>
                        <div className="p-4 bg-muted/10">
                            {manyTabs.map((tab) => (
                                <TabsContent key={tab} value={tab} className="mt-0">
                                    {tab} specific payload.
                                </TabsContent>
                            ))}
                        </div>
                     </Tabs>
                </div>
            </div>
        );
    }
};


// --- Default Variant (pill-style background) ---
export const Default: Story = {
    render: () => (
        <Tabs defaultValue="overview">
            <TabsList variant="default">
                <TabsTrigger variant="default" value="overview">Overview</TabsTrigger>
                <TabsTrigger variant="default" value="policy">Policy</TabsTrigger>
                <TabsTrigger variant="default" value="documents">Documents</TabsTrigger>
            </TabsList>
            <TabsContent value="overview">
                <p className="text-sm text-muted-foreground p-4">Overview content goes here.</p>
            </TabsContent>
            <TabsContent value="policy">
                <p className="text-sm text-muted-foreground p-4">Policy content goes here.</p>
            </TabsContent>
            <TabsContent value="documents">
                <p className="text-sm text-muted-foreground p-4">Documents content goes here.</p>
            </TabsContent>
        </Tabs>
    ),
};

// --- Case Variant (underline-style, used in quotation detail tabs) ---
export const Case: Story = {
    render: () => (
        <Tabs defaultValue="header">
            <TabsList variant="case">
                <TabsTrigger variant="case" value="header">Common Header</TabsTrigger>
                <TabsTrigger variant="case" value="profile">Policy Profile</TabsTrigger>
                <TabsTrigger variant="case" value="documents">Documents</TabsTrigger>
                <TabsTrigger variant="case" value="plans">Plans</TabsTrigger>
            </TabsList>
            <TabsContent value="header">
                <p className="text-sm text-muted-foreground p-4">Common Header tab content.</p>
            </TabsContent>
            <TabsContent value="profile">
                <p className="text-sm text-muted-foreground p-4">Policy Profile tab content.</p>
            </TabsContent>
            <TabsContent value="documents">
                <p className="text-sm text-muted-foreground p-4">Documents tab content.</p>
            </TabsContent>
            <TabsContent value="plans">
                <p className="text-sm text-muted-foreground p-4">Plans tab content.</p>
            </TabsContent>
        </Tabs>
    ),
};

// --- Disabled Tab ---
export const WithDisabledTab: Story = {
    render: () => (
        <Tabs defaultValue="overview">
            <TabsList variant="case">
                <TabsTrigger variant="case" value="overview">Overview</TabsTrigger>
                <TabsTrigger variant="case" value="policy">Policy</TabsTrigger>
                <TabsTrigger variant="case" value="plans" disabled>Plans (Disabled)</TabsTrigger>
            </TabsList>
            <TabsContent value="overview">
                <p className="text-sm text-muted-foreground p-4">Overview content.</p>
            </TabsContent>
            <TabsContent value="policy">
                <p className="text-sm text-muted-foreground p-4">Policy content.</p>
            </TabsContent>
        </Tabs>
    ),
};

// --- Many Tabs (as in quotation-detail with 20 tabs) ---
export const ManyTabs: Story = {
    render: () => {
        const tabs = [
            'Common Header', 'Policy Profile', 'Documents', 'Exclusions',
            'Subsidiaries', 'Plans', 'Plan Products', 'Health', 'Term Life',
            'Credit Life', 'Investment', 'Benefits',
        ];
        return (
            <Tabs defaultValue={tabs[0]}>
                <TabsList variant="case" className="overflow-x-auto">
                    {tabs.map((tab) => (
                        <TabsTrigger key={tab} variant="case" value={tab}>
                            {tab}
                        </TabsTrigger>
                    ))}
                </TabsList>
                {tabs.map((tab) => (
                    <TabsContent key={tab} value={tab}>
                        <p className="text-sm text-muted-foreground p-4">{tab} content goes here.</p>
                    </TabsContent>
                ))}
            </Tabs>
        );
    },
};
