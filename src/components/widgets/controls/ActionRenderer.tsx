import React from 'react';
import { ActionConfig } from '@/types/widget';
import { ActionButton } from './ActionButton';
import { useActionHandler } from '@/hooks/useActionHandler';

interface ActionRendererProps {
    action: ActionConfig;
    disabled?: boolean;
}

export const ActionRenderer: React.FC<ActionRendererProps> = ({ action, disabled }) => {
    const handleAction = useActionHandler();

    const handleClick = async () => {
        await handleAction(action);
    };

    return (
        <ActionButton action={action} onClick={handleClick} disabled={disabled} />
    );
};
