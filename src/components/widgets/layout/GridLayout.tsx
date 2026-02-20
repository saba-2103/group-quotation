import React from 'react';
import { WidgetConfig } from '@/types/widget';
import { cn } from '@/lib/utils';
import { WidgetRenderer } from '@/components/registry/WidgetRenderer';

interface GridLayoutProps {
    config: WidgetConfig;
}

export const GridLayout: React.FC<GridLayoutProps> = ({ config }) => {
    const { columns = 1, gap = 4, className } = config.props || {};

    // Handle responsive columns if it's an object, or simple number
    const getGridColsClass = () => {
        if (typeof columns === 'number') {
            return `grid-cols-${columns}`;
        }
        // If object, we'd need custom logic or style generation, for simplicity here assume number or mapping
        // Real implementation would parse { sm: 1, md: 2 } to 'sm:grid-cols-1 md:grid-cols-2'
        return 'grid-cols-1';
    };

    return (
        <div
            className={cn(
                'grid',
                getGridColsClass(),
                className
            )}
            style={{
                gap: gap ? `${gap * 0.25}rem` : undefined,
                gridTemplateColumns: typeof columns === 'number' ? `repeat(${columns}, minmax(0, 1fr))` : undefined
            }}
        >
            {config.children?.map((child) => (
                <WidgetRenderer key={child.id} config={child} />
            ))}
        </div>
    );
};
