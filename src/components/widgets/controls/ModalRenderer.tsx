import React, { useState } from 'react';
import { ActionConfig } from '@/types/widget';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { AlertTriangle } from 'lucide-react';

type ModalRendererProps = {
    action: ActionConfig;
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onConfirm?: () => Promise<void> | void;
    onSuccess?: (data: any) => void;
    initialData?: any;
};

export const ModalRenderer: React.FC<ModalRendererProps> = ({
    action,
    open,
    onOpenChange,
    onConfirm,
    onSuccess,
    initialData,
}) => {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const isDestructive = action.intent === "delete" || action.variant === "destructive";
    const confirmationMessage =
        action.actionProps?.confirmationMessage ?? "Are you sure you want to proceed with this action?";

    const hasForm = !!action.actionProps?.formId;

    const handleConfirm = async () => {
        try {
            setLoading(true);
            setError(null);
            await onConfirm?.();
            onOpenChange(false);
            onSuccess?.({});
        } catch (err) {
            setError(err instanceof Error ? err.message : "Action failed. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    const handleCancel = () => {
        setError(null);
        onOpenChange(false);
    };

    if (hasForm) {
        return (
            <Dialog open={open} onOpenChange={onOpenChange}>
                <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>{action.label}</DialogTitle>
                        <DialogDescription>{action.actionProps?.description}</DialogDescription>
                    </DialogHeader>
                    <div className="py-4">
                        <p className="text-sm text-muted-foreground border p-4 rounded bg-muted/50 border-dashed">
                            Form Placeholder
                        </p>
                        <div className="flex justify-end mt-4">
                            <Button onClick={handleConfirm} disabled={loading}>
                                {loading ? "Processing..." : "Submit"}
                            </Button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>
        );
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-md">
                <DialogHeader className="items-center text-center">
                    <div
                        className={`flex h-12 w-12 items-center justify-center rounded-full ${isDestructive ? "bg-destructive/10" : "bg-primary/10"
                            }`}
                    >
                        <AlertTriangle className={`h-6 w-6 ${isDestructive ? "text-destructive" : "text-primary"}`} />
                    </div>
                    <DialogTitle>{action.label}</DialogTitle>
                    <DialogDescription>{confirmationMessage}</DialogDescription>
                </DialogHeader>

                {error && <p className="text-sm text-destructive text-center">{error}</p>}

                <DialogFooter className="flex-row gap-3 sm:justify-center mt-4">
                    <Button variant="outline" className="flex-1" onClick={handleCancel} disabled={loading}>
                        Cancel
                    </Button>
                    <Button
                        variant={isDestructive ? "destructive" : "default"}
                        className="flex-1"
                        onClick={handleConfirm}
                        disabled={loading}
                    >
                        {loading ? "Processing..." : action.label}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};
