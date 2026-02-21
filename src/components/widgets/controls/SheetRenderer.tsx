import React from 'react';
import { ActionConfig } from '@/types/widget';
import {
    Sheet,
    SheetContent,
    SheetHeader,
    SheetTitle,
    SheetDescription,
} from '@/components/ui/sheet';

type SheetRendererProps = {
    action: ActionConfig;
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSuccess?: (data: any) => void;
    initialData?: any;
};

export const SheetRenderer: React.FC<SheetRendererProps> = ({
    action,
    open,
    onOpenChange,
    onSuccess,
    initialData,
}) => {
    return (
        <Sheet open={open} onOpenChange={onOpenChange}>
            <SheetContent className="sm:max-w-lg overflow-y-auto">
                <SheetHeader>
                    <SheetTitle>{action.label}</SheetTitle>
                    <SheetDescription>
                        {action.actionProps?.description || "Please fill out the required information."}
                    </SheetDescription>
                </SheetHeader>
                <div className="py-6">
                    {/* Form rendering logic goes here. For now, we emulate the form loading and state. */}
                    <div className="flex flex-col gap-4">
                        <p className="text-sm text-muted-foreground border p-4 rounded bg-muted/50 border-dashed">
                            Form Placeholder
                        </p>
                        <div className="flex justify-end mt-4">
                            <button
                                className="bg-primary text-primary-foreground px-4 py-2 rounded-md hover:bg-primary/90 text-sm"
                                onClick={() => {
                                    onSuccess?.({});
                                    onOpenChange(false);
                                }}
                            >
                                Submit
                            </button>
                        </div>
                    </div>
                </div>
            </SheetContent>
        </Sheet>
    );
};
