import React from 'react';
import { ActionConfig } from '@/types/widget';
import { ActionButton } from './ActionButton';
import { useActionHandler } from '@/hooks/useActionHandler';

interface ActionRendererProps {
    action: ActionConfig & { display?: "button" | "icon" | "menu-item" };
    disabled?: boolean;
}

export const ActionRenderer: React.FC<ActionRendererProps> = ({ action, disabled }) => {
    const handleAction = useActionHandler();

    // The schema sometimes nests interaction payloads inside the `action` property.
    // We flatten it here so `useActionHandler` can read `type` and `target` natively.
    const resolvedAction = (action as any).action ? { ...action, ...(action as any).action } : action;

    const handleClick = async () => {
        await handleAction(resolvedAction);
    };

    return (
        <ActionButton action={resolvedAction} onClick={handleClick} disabled={disabled} displayAs={action.display} />
    );
};
