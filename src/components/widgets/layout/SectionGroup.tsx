import React from 'react';
import { WidgetConfig } from '@/types/widget';
import { cn } from '@/lib/utils';
// Need to import WidgetRenderer to render children. Since there may be circular deps,
// we assume WidgetRenderer is available or we pass children already rendered.
// Actually, WidgetRenderer is meant to be recursive.
import { WidgetRenderer } from '@/components/registry/WidgetRenderer';

export const SectionGroup: React.FC<{ config: WidgetConfig }> = ({ config }) => {
    const { title, columns } = config.props || {};
    const gridCols = columns === 2 ? "md:grid-cols-2" : columns === 3 ? "md:grid-cols-3" : columns === 4 ? "md:grid-cols-4" : "grid-cols-1";

    return (
        <section className="flex flex-col gap-5">
            {title && <h2 className="text-lg font-bold text-foreground">{title}</h2>}
            <div className={cn("grid gap-5 grid-cols-1", gridCols)}>
                {config.children?.map(child => (
                    <WidgetRenderer key={child.id} config={child} />
                ))}
            </div>
        </section>
    );
};
