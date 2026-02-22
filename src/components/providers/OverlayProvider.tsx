import { useOverlayStore } from "@/hooks/useOverlayStore";
import { OverlaidForm } from "../widgets/forms/OverlaidForm";
import { ConfirmationDialog } from "../widgets/forms/ConfirmationDialog";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "../ui/dialog";
import { Sheet, SheetContent, SheetTitle, SheetDescription } from "../ui/sheet";

export const OverlayProvider = () => {
    const { openOverlays, close } = useOverlayStore();
    const overlays = Object.entries(openOverlays);

    if (overlays.length === 0) return null;

    return (
        <>
            {overlays.map(([id, config]) => {
                const isOpen = true; // Exists in state -> is open
                const handleOpenChange = (open: boolean) => {
                    if (!open) close(id);
                };

                if (config.type === "modal") {
                    return (
                        <Dialog key={id} open={isOpen} onOpenChange={handleOpenChange}>
                            <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
                                <DialogTitle className="sr-only">Form Modal</DialogTitle>
                                <DialogDescription className="sr-only">Please fill out the form below.</DialogDescription>
                                <OverlaidForm formId={id} />
                            </DialogContent>
                        </Dialog>
                    );
                }

                if (config.type === "sheet") {
                    return (
                        <Sheet key={id} open={isOpen} onOpenChange={handleOpenChange}>
                            <SheetContent className="sm:max-w-lg overflow-y-auto">
                                <SheetTitle className="sr-only">Form Sheet</SheetTitle>
                                <SheetDescription className="sr-only">Please fill out the form below.</SheetDescription>
                                <OverlaidForm formId={id} />
                            </SheetContent>
                        </Sheet>
                    );
                }

                if (config.type === "dialog") {
                    // Safe cast as we enforce `action` payload for dialog types in useActionHandler
                    return <ConfirmationDialog key={id} id={id} action={config.data} />;
                }

                return null;
            })}
        </>
    );
};
