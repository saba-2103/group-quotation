import React from 'react';
import { WidgetConfig } from '@/types/widget';
import { cn } from '@/lib/utils';
import { ActionRenderer } from '../controls/ActionRenderer';

interface PageHeaderProps {
    config: WidgetConfig;
}

export const PageHeader: React.FC<PageHeaderProps> = ({ config }) => {
    const { title, description, actions, breadcrumbs } = config.props || {};

    return (
        <div className={cn("flex flex-col gap-4", config.props?.className)}>
            {/* Breadcrumbs placeholder */}

            <header className="flex flex-col gap-2">
                <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                        <h1 className="text-2xl font-semibold text-foreground">{title}</h1>
                        {description && <p className="text-muted-foreground mt-1">{description}</p>}
                    </div>
                    {actions && actions.length > 0 && (
                        <div className="flex items-center gap-2">
                            {actions.map((action: any) => (
                                <ActionRenderer key={action.id} action={action} />
                            ))}
                        </div>
                    )}
                </div>
            </header>
        </div>
    );
};
