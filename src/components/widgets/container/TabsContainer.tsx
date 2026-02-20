import React from 'react';
import { WidgetConfig } from '@/types/widget';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { WidgetRenderer } from '@/components/registry/WidgetRenderer';

export const TabsContainer: React.FC<{ config: WidgetConfig }> = ({ config }) => {
    const { children } = config; // Each child is a Tab Panel?
    // We expect children to be "tab-panel" widgets

    if (!children || children.length === 0) return null;

    return (
        <Tabs defaultValue={children[0].id} className="w-full">
            <TabsList>
                {children.map(tab => (
                    <TabsTrigger key={tab.id} value={tab.id}>
                        {tab.props?.label || tab.id}
                    </TabsTrigger>
                ))}
            </TabsList>
            {children.map(tab => (
                <TabsContent key={tab.id} value={tab.id}>
                    {/* The content of the tab panel is its children */}
                    {tab.children?.map(child => (
                        <WidgetRenderer key={child.id} config={child} />
                    ))}
                </TabsContent>
            ))}
        </Tabs>
    );
};
