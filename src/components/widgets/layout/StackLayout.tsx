import React from 'react';
import { WidgetConfig } from '@/types/widget';
import { cn } from '@/lib/utils';
// import { WidgetRenderer } from '../../registry/WidgetRenderer'; // Circular dependency if imported directly? 
// We will pass WidgetRenderer as a prop or context later, or just import it if Next.js handles it fine (usually does)
import { WidgetRenderer } from '@/components/registry/WidgetRenderer';

interface StackLayoutProps {
    config: WidgetConfig;
}

export const StackLayout: React.FC<StackLayoutProps> = ({ config }) => {
    const { direction = 'column', gap = 4, align = 'stretch', justify = 'start', className } = config.props || {};

    return (
        <div
            className={cn(
                'flex min-w-0',
                direction === 'row' ? 'flex-row' : 'flex-col',
                align === 'center' && 'items-center',
                align === 'start' && 'items-start',
                align === 'end' && 'items-end',
                align === 'stretch' && 'items-stretch',
                justify === 'center' && 'justify-center',
                justify === 'between' && 'justify-between',
                justify === 'start' && 'justify-start',
                justify === 'end' && 'justify-end',
                className
            )}
            style={{ gap: gap ? `${gap * 0.25}rem` : undefined }} // Tailwind gap scale approx
        >
            {config.children?.map((child) => (
                <WidgetRenderer key={child.id} config={child} />
            ))}
        </div>
    );
};
