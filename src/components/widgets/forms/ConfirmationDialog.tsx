import React, { useState } from 'react';
import { useOverlayStore } from '@/hooks/useOverlayStore';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ActionConfig } from '@/types/widget';
import { useMutation, useQueryClient } from '@tanstack/react-query';

interface ConfirmationDialogProps {
    id: string; // The store ID
    action: ActionConfig; // The mutation action configuration passed as payload data
}

export const ConfirmationDialog: React.FC<ConfirmationDialogProps> = ({ id, action }) => {
    const { close } = useOverlayStore();
    const queryClient = useQueryClient();
    const [error, setError] = useState<string | null>(null);

    const { mutateAsync, isPending } = useMutation({
        mutationFn: async (act: ActionConfig) => {
            if (act.type !== 'api-mutation' || !act.api) return;
            const res = await fetch(act.api.endpoint, {
                method: act.api.method,
                body: JSON.stringify(act.api.body),
                headers: { 'Content-Type': 'application/json' }
            });
            if (!res.ok) throw new Error(`Action failed: ${res.statusText}`);
            if (res.status === 204) return null;
            const text = await res.text();
            return text ? JSON.parse(text) : null;
        }
    });

    if (action.type !== 'api-mutation') return null;

    const handleConfirm = async () => {
        try {
            setError(null);
            await mutateAsync(action);
            if (action.successMessage) {
                console.log("Success Toast:", action.successMessage); // Placeholder toast
            }
            if (action.refreshKey) {
                // Allow for partial matching of the query key (e.g. invalidate all queries starting with the endpoint)
                queryClient.invalidateQueries({ queryKey: [action.refreshKey] });
            }
            close(id);
        } catch (err) {
            setError(err instanceof Error ? err.message : "Confirmation failed.");
        }
    };

    const isDestructive = action.variant === "destructive";

    return (
        <Dialog open={true} onOpenChange={(open: boolean) => !open && close(id)}>
            <DialogContent className="max-w-md">
                <DialogHeader>
                    <DialogTitle>{action.confirm?.title || action.label || "Confirm Action"}</DialogTitle>
                    <DialogDescription>{action.confirm?.message || "Are you sure you want to proceed?"}</DialogDescription>
                </DialogHeader>

                {error && <p className="text-sm text-destructive text-center mt-2">{error}</p>}

                <DialogFooter className="flex-row gap-3 sm:justify-end mt-4">
                    <Button variant="outline" onClick={() => close(id)} disabled={isPending}>
                        Cancel
                    </Button>
                    <Button
                        variant={isDestructive ? "destructive" : "default"}
                        onClick={handleConfirm}
                        disabled={isPending}
                    >
                        {isPending ? "Processing..." : (action.label || "Confirm")}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};
