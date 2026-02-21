import React, { useState } from 'react';
import { ActionConfig } from '@/types/widget';
import { ActionButton } from './ActionButton';
import { useActionHandler } from '@/hooks/useActionHandler';
import { SheetRenderer } from './SheetRenderer';
import { ModalRenderer } from './ModalRenderer';

interface ActionRendererProps {
    action: ActionConfig;
    onSuccess?: () => void;
    disabled?: boolean;
}

export const ActionRenderer: React.FC<ActionRendererProps> = ({ action, onSuccess, disabled }) => {
    const handleAction = useActionHandler();
    const [sheetOpen, setSheetOpen] = useState(false);
    const [modalOpen, setModalOpen] = useState(false);

    // Get interaction type from action configuration
    const interaction = action.actionProps?.interaction ?? "sheet";

    const handleClick = async () => {
        switch (interaction) {
            case "sheet":
                setSheetOpen(true);
                break;
            case "modal":
                setModalOpen(true);
                break;
            default:
                await handleAction(action);
                onSuccess?.();
        }
    };

    const handleFormSuccess = () => {
        onSuccess?.();
    };

    return (
        <>
            <ActionButton action={action} onClick={handleClick} disabled={disabled} />
            <SheetRenderer
                action={action}
                open={sheetOpen}
                onOpenChange={setSheetOpen}
                onSuccess={handleFormSuccess}
            />
            <ModalRenderer
                action={action}
                open={modalOpen}
                onOpenChange={setModalOpen}
                onSuccess={handleFormSuccess}
            />
        </>
    );
};
