import React from 'react';
import { ActionConfig } from '@/types/widget';
import { Button } from '@/components/ui/button';
import { DropdownMenuItem } from '@/components/ui/dropdown-menu';
import * as LucideIcons from 'lucide-react';

type ActionButtonProps = {
    action: ActionConfig;
    onClick: () => void;
    disabled?: boolean;
};

export const ActionButton: React.FC<ActionButtonProps> = ({ action, onClick, disabled }) => {
    const display = action.display ?? "button";

    // Dynamically resolve icon if provided
    const IconComponent = action.icon ? (LucideIcons as any)[action.icon] : null;

    if (display === "icon") {
        const hasIcon = !!action.icon;
        const isDestructive = action.variant === "destructive";

        return (
            <Button
                variant="ghost"
                size="sm"
                onClick={onClick}
                disabled={disabled}
                className={`${hasIcon ? "h-8 w-8 p-0" : ""} ${isDestructive ? "text-destructive hover:text-destructive hover:bg-destructive/10" : ""}`}
            >
                {hasIcon && IconComponent ? (
                    <>
                        <IconComponent size={16} />
                        <span className="sr-only">{action.label}</span>
                    </>
                ) : (
                    action.label
                )}
            </Button>
        );
    }

    if (display === "menu-item") {
        const handleSelect = (e: Event) => {
            e.preventDefault();
            onClick();
        };

        return (
            <DropdownMenuItem
                onSelect={handleSelect}
                disabled={disabled}
                className={action.variant === "destructive" ? "text-destructive focus:text-destructive" : ""}
            >
                {IconComponent && <IconComponent size={16} className="mr-2" />}
                {action.label}
            </DropdownMenuItem>
        );
    }

    return (
        <Button variant={action.variant || "default"} onClick={onClick} disabled={disabled}>
            {IconComponent && <IconComponent size={16} className="mr-2" />}
            {action.label}
        </Button>
    );
};
