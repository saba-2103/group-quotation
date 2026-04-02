import React, { useState } from 'react';
import { useOverlayStore } from '@/hooks/useOverlayStore';
import { useActionHandler } from '@/hooks/useActionHandler';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ActionButton } from '@/components/widgets/controls/ActionButton';
import { ActionConfig } from '@/types/widget';

type ApiMutationAction = Extract<ActionConfig, { type: 'api-mutation' }>;

interface ConfirmationDialogProps {
    id: string;
    action: ApiMutationAction;
}

export const ConfirmationDialog: React.FC<ConfirmationDialogProps> = ({ id, action }) => {
    const { close } = useOverlayStore();
    const handleAction = useActionHandler();
    const [mutationError, setMutationError] = useState<string | null>(null);
    const [isPending, setIsPending] = useState(false);

    const handleConfirm = async () => {
        try {
            setMutationError(null);
            setIsPending(true);
            // Strip `confirm` so useActionHandler executes the mutation directly
            // without re-opening a confirmation dialog.
            await handleAction({ ...action, confirm: undefined });
            close(id);
        } catch (err) {
            setMutationError(err instanceof Error ? err.message : 'Confirmation failed.');
        } finally {
            setIsPending(false);
        }
    };

    return (
        <Dialog open={true} onOpenChange={() => {}}>
            <DialogContent
                onInteractOutside={(e) => e.preventDefault()}
                onEscapeKeyDown={(e) => e.preventDefault()}
            >
                <DialogHeader>
                    <DialogTitle>{action.confirm?.title ?? action.label ?? 'Confirm Action'}</DialogTitle>
                    <DialogDescription>{action.confirm?.message ?? 'Are you sure you want to proceed?'}</DialogDescription>
                </DialogHeader>

                {mutationError && (
                    <p className="text-sm text-destructive text-center mt-2">{mutationError}</p>
                )}

                <DialogFooter className="flex-row gap-3 sm:justify-end mt-4">
                    <Button variant="outline" onClick={() => close(id)} disabled={isPending}>
                        Cancel
                    </Button>
                    <ActionButton action={action} onClick={handleConfirm} disabled={isPending} />
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};
