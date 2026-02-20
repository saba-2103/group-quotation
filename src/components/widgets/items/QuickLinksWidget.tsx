import React from 'react';
import { WidgetConfig } from '@/types/widget';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
// Need to map strings to LucideIcons manually in keystone if there isn't a global mapper
import * as Icons from 'lucide-react';
import { useActionHandler } from '@/hooks/useActionHandler';

// Basic LucideIcon mapper for keystone
const LucideIcon = ({ name, className }: { name: string, className?: string }) => {
    const IconComponent = (Icons as any)[name];
    if (!IconComponent) return null;
    return <IconComponent className={className} />;
};

interface QuickLinksWidgetProps {
    config: WidgetConfig;
}

export const QuickLinksWidget: React.FC<QuickLinksWidgetProps> = ({ config }) => {
    const { title, layout, links } = config.props || {};
    const isGrid = layout === "grid";

    return (
        <div className={cn("flex flex-col gap-3", isGrid ? "md:col-span-full" : "")}>
            {title && <h3 className="text-sm font-medium text-muted-foreground">{title}</h3>}
            <div className={cn(isGrid ? "grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4" : "flex flex-wrap gap-2")}>
                {links?.map((link: any) => (
                    <QuickLinkCard key={link.id} link={link} />
                ))}
            </div>
        </div>
    );
};

const QuickLinkCard = ({ link }: { link: any }) => {
    const handleAction = useActionHandler();

    const handleClick = () => {
        if (link.action) {
            handleAction(link.action);
        }
    };

    if (link.type === "card") {
        return (
            <button
                onClick={handleClick}
                className="flex flex-col items-start gap-3 p-6 rounded-lg border bg-card hover:bg-accent hover:border-primary/50 transition-colors text-left"
            >
                {link.icon && (
                    <LucideIcon name={link.icon} className="h-6 w-6 text-primary mb-1" />
                )}
                <div className="flex flex-col gap-1">
                    <span className="text-base font-semibold text-foreground">{link.label}</span>
                    {link.description && (
                        <p className="text-sm text-muted-foreground">{link.description}</p>
                    )}
                </div>
            </button>
        );
    }

    return (
        <Button
            variant="outline"
            size="sm"
            className="gap-2"
            onClick={handleClick}
        >
            {link.icon && <LucideIcon name={link.icon} className="h-4 w-4" />}
            {link.label}
        </Button>
    );
};
