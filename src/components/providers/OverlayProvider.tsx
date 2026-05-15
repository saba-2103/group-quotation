import { useOverlayStore } from "@/hooks/useOverlayStore";
import { OverlaidForm } from "../widgets/forms/OverlaidForm";
import { ConfirmationDialog } from "../widgets/forms/ConfirmationDialog";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "../ui/dialog";
import { Sheet, SheetContent, SheetTitle, SheetDescription } from "../ui/sheet";

// Tailwind doesn't generate classes from interpolated strings, so we map the
// allowed `size` tokens (declared on the open-modal/open-sheet action) to
// literal class names the JIT compiler can see.
const MODAL_SIZE_CLASS: Record<string, string> = {
    sm: "max-w-sm",
    md: "max-w-md",
    lg: "max-w-lg",
    xl: "max-w-xl",
    "2xl": "max-w-2xl",
    "3xl": "max-w-3xl",
    "4xl": "max-w-4xl",
    "5xl": "max-w-5xl",
    "6xl": "max-w-6xl",
    "7xl": "max-w-7xl",
};

const SHEET_SIZE_CLASS: Record<string, string> = {
    sm: "sm:max-w-sm",
    md: "sm:max-w-md",
    lg: "sm:max-w-lg",
    xl: "sm:max-w-xl",
    "2xl": "sm:max-w-2xl",
    "3xl": "sm:max-w-3xl",
    "4xl": "sm:max-w-4xl",
    "5xl": "sm:max-w-5xl",
    "6xl": "sm:max-w-6xl",
    "7xl": "sm:max-w-7xl",
};

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
                const sizeKey = config.options?.size;

                if (config.type === "modal") {
                    const widthClass = (sizeKey && MODAL_SIZE_CLASS[sizeKey]) ?? MODAL_SIZE_CLASS.lg;
                    return (
                        <Dialog key={id} open={isOpen} onOpenChange={handleOpenChange}>
                            <DialogContent className={`${widthClass} max-h-[90vh] overflow-y-auto`}>
                                <DialogTitle className="sr-only">Form Modal</DialogTitle>
                                <DialogDescription className="sr-only">Please fill out the form below.</DialogDescription>
                                <OverlaidForm formId={id} />
                            </DialogContent>
                        </Dialog>
                    );
                }

                if (config.type === "sheet") {
                    const widthClass = (sizeKey && SHEET_SIZE_CLASS[sizeKey]) ?? SHEET_SIZE_CLASS.lg;
                    return (
                        <Sheet key={id} open={isOpen} onOpenChange={handleOpenChange}>
                            <SheetContent className={`${widthClass} overflow-y-auto`}>
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
