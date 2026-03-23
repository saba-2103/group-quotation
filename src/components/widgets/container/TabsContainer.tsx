"use client";

import React, { useState } from "react";
import { ChevronLeft, ChevronRight, MoreHorizontal, Trash2 } from "lucide-react";
import { WidgetConfig } from "@/types/widget";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
    DropdownMenu,
    DropdownMenuTrigger,
    DropdownMenuContent,
    DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useActionHandler } from "@/hooks/useActionHandler";
import { useOverlayStore } from "@/hooks/useOverlayStore";
import { ConfirmationDialog } from "../forms/ConfirmationDialog";

const WidgetRenderer = React.lazy(() =>
    import("@/components/registry/WidgetRenderer").then((m) => ({ default: m.WidgetRenderer }))
);

const DELETE_DIALOG_ID = "tabs-delete-confirm";

export const TabsContainer: React.FC<{ config: WidgetConfig }> = ({ config }) => {
    const { children } = config;
    const hasWorkflow: boolean = config.props?.hasWorkflow ?? false;
    const confirmNavigation: boolean = config.props?.confirmNavigation ?? false;

    const handleAction = useActionHandler();
    const { open, openOverlays } = useOverlayStore();

    const [activeTab, setActiveTab] = useState(children?.[0]?.id ?? "");
    const [pendingTab, setPendingTab] = useState<string | null>(null);
    const [showNavGuard, setShowNavGuard] = useState(false);

    if (!children || children.length === 0) return null;

    const currentIndex = children.findIndex((t) => t.id === activeTab);
    const isFirst = currentIndex === 0;
    const isLast = currentIndex === children.length - 1;
    const currentTab = children[currentIndex];
    const deleteAction = currentTab?.props?.deleteAction;

    // ── Navigation ────────────────────────────────────────────────────────────

    const requestNavigate = (tabId: string) => {
        if (confirmNavigation && tabId !== activeTab) {
            setPendingTab(tabId);
            setShowNavGuard(true);
        } else {
            setActiveTab(tabId);
        }
    };

    const confirmNav = () => {
        if (pendingTab) setActiveTab(pendingTab);
        setPendingTab(null);
        setShowNavGuard(false);
    };

    const cancelNav = () => {
        setPendingTab(null);
        setShowNavGuard(false);
    };

    return (
        <>
            <Tabs value={activeTab} onValueChange={requestNavigate} className="w-full">
                {/* Tab bar */}
                <div className="w-full mb-6 flex items-center gap-1 border-b border-border">
                    <div className="flex-1 min-w-0 overflow-x-auto overflow-y-hidden [&::-webkit-scrollbar]:h-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-muted-foreground/20 [&::-webkit-scrollbar-thumb]:rounded-full hover:[&::-webkit-scrollbar-thumb]:bg-muted-foreground/40">
                        <TabsList className="inline-flex w-max">
                            {children.map((tab) => (
                                <TabsTrigger key={tab.id} value={tab.id}>
                                    <span className="whitespace-nowrap">{tab.props?.label || tab.id}</span>
                                </TabsTrigger>
                            ))}
                        </TabsList>
                    </div>

                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="shrink-0 h-8 w-8 mb-0.5">
                                <MoreHorizontal size={18} />
                                <span className="sr-only">More tabs</span>
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="max-h-80 overflow-y-auto">
                            {children.map((tab) => (
                                <DropdownMenuItem
                                    key={tab.id}
                                    onSelect={() => requestNavigate(tab.id)}
                                    className={activeTab === tab.id ? "bg-accent" : ""}
                                >
                                    {tab.props?.label || tab.id}
                                </DropdownMenuItem>
                            ))}
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>

                {/* Tab content */}
                {children.map((tab) => (
                    <TabsContent key={tab.id} value={tab.id}>
                        <React.Suspense fallback={null}>
                            {tab.children?.map((child: WidgetConfig) => (
                                <WidgetRenderer key={child.id} config={child} />
                            ))}
                        </React.Suspense>
                    </TabsContent>
                ))}

                {/* Footer: Delete / Prev / Next / Complete */}
                <div className="flex items-center justify-between pt-4 mt-4 border-t">
                    <div>
                        {deleteAction && (
                            <Button
                                variant="destructive"
                                size="sm"
                                onClick={() => open(DELETE_DIALOG_ID, 'dialog', deleteAction)}
                            >
                                <Trash2 className="h-3.5 w-3.5 mr-1.5" />
                                Delete
                            </Button>
                        )}
                    </div>

                    <div className="flex items-center gap-2">
                        {!isFirst && (
                            <Button variant="outline" size="sm" onClick={() => requestNavigate(children[currentIndex - 1].id)}>
                                <ChevronLeft className="h-4 w-4 mr-1" />
                                Prev
                            </Button>
                        )}
                        {!isLast && (
                            <Button size="sm" onClick={() => requestNavigate(children[currentIndex + 1].id)}>
                                Next
                                <ChevronRight className="h-4 w-4 ml-1" />
                            </Button>
                        )}
                        {isLast && hasWorkflow && (
                            <Button size="sm" onClick={() => handleAction({ id: 'complete', type: 'trigger-event', target: 'complete' })}>
                                Complete
                            </Button>
                        )}
                    </div>
                </div>
            </Tabs>

            {/* Nav guard — simple dialog, not an API action */}
            <Dialog open={showNavGuard} onOpenChange={(open) => !open && cancelNav()}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle>Unsaved Changes</DialogTitle>
                        <DialogDescription>
                            You have unsaved changes on this tab. Do you want to save before continuing?
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter className="flex-row gap-3 sm:justify-end mt-4">
                        <Button variant="outline" onClick={cancelNav}>Stay</Button>
                        <Button variant="ghost" onClick={confirmNav}>Discard & Continue</Button>
                        <Button onClick={() => { handleAction({ id: 'save', type: 'trigger-event', target: 'save' }); confirmNav(); }}>
                            Save & Continue
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Delete — reuses ConfirmationDialog via overlay store */}
            {openOverlays[DELETE_DIALOG_ID] && (
                <ConfirmationDialog
                    id={DELETE_DIALOG_ID}
                    action={openOverlays[DELETE_DIALOG_ID].data}
                />
            )}
        </>
    );
};
