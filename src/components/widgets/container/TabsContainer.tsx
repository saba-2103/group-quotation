"use client";

import React, { useState } from "react";
import { ChevronLeft, ChevronRight, MoreHorizontal } from "lucide-react";
import { WidgetConfig, ActionConfig } from "@/types/widget";
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
import { useSmartQuery } from "@/hooks/useSmartQuery";
import { evaluateCondition } from "@/lib/conditions";
import { ActionRenderer } from "@/components/widgets/controls/ActionRenderer";
import { LucideIcon } from "@/components/ui/lucide-icon";

const WidgetRenderer = React.lazy(() =>
    import("@/components/registry/WidgetRenderer").then((m) => ({ default: m.WidgetRenderer }))
);

// ── Prop interfaces ───────────────────────────────────────────────────────────

interface TabsContainerProps {
    hasWorkflow?: boolean;
    confirmNavigation?: boolean;
    prevLabel?: string;
    nextLabel?: string;
    completeLabel?: string;
}

interface TabPanelProps {
    label?: string;
    icon?: string;
    deleteAction?: ActionConfig;
}

// ── Component ─────────────────────────────────────────────────────────────────

export const TabsContainer: React.FC<{ config: WidgetConfig }> = ({ config }) => {
    const { children, dataSource } = config;
    const {
        hasWorkflow = false,
        confirmNavigation = false,
        prevLabel = "Prev",
        nextLabel = "Next",
        completeLabel = "Complete",
    } = (config.props ?? {}) as TabsContainerProps;

    const handleAction = useActionHandler();

    // When `dataSource` is set, fetch the parent entity so we can evaluate
    // each child tab's `visibleWhen` against it. Cheap because useSmartQuery
    // is dedupe-keyed by endpoint — other widgets on the same page that hit
    // the same URL share the cache.
    const { data: entity } = useSmartQuery(dataSource);

    // Filter children whose visibleWhen rejects against the current entity.
    // If the entity hasn't loaded yet, tabs with `visibleWhen` are hidden
    // (default-deny) to avoid flicker; once data arrives they reappear.
    const visibleChildren = React.useMemo(() => {
        if (!children) return [] as WidgetConfig[];
        return children.filter((tab) => {
            if (!tab.visibleWhen) return true;
            if (!entity) return false;
            return evaluateCondition(tab.visibleWhen, entity);
        });
    }, [children, entity]);

    const [activeTab, setActiveTab] = useState(visibleChildren[0]?.id ?? children?.[0]?.id ?? "");
    const [pendingTab, setPendingTab] = useState<string | null>(null);
    const [showNavGuard, setShowNavGuard] = useState(false);

    // If the active tab is no longer in the visible set (entity loaded and
    // hid it), snap to the first visible tab.
    React.useEffect(() => {
        if (visibleChildren.length === 0) return;
        if (!visibleChildren.find((t) => t.id === activeTab)) {
            setActiveTab(visibleChildren[0].id);
        }
    }, [visibleChildren, activeTab]);

    if (!visibleChildren || visibleChildren.length === 0) return null;

    const currentIndex = visibleChildren.findIndex((t) => t.id === activeTab);
    const isFirst = currentIndex === 0;
    const isLast = currentIndex === visibleChildren.length - 1;
    const currentTabProps = (visibleChildren[currentIndex]?.props ?? {}) as TabPanelProps;
    const deleteAction = currentTabProps.deleteAction;

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
                            {visibleChildren.map((tab) => (
                                <TabsTrigger key={tab.id} value={tab.id}>
                                    {tab.props?.icon && (
                                        <LucideIcon name={tab.props.icon as string} size={14} className="mr-1.5 shrink-0" />
                                    )}
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
                            {visibleChildren.map((tab) => (
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
                {visibleChildren.map((tab) => (
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
                        {deleteAction && <ActionRenderer action={deleteAction} />}
                    </div>

                    <div className="flex items-center gap-2">
                        {!isFirst && (
                            <Button variant="outline" size="sm" onClick={() => requestNavigate(visibleChildren[currentIndex - 1].id)}>
                                <ChevronLeft className="h-4 w-4 mr-1" />
                                {prevLabel}
                            </Button>
                        )}
                        {!isLast && (
                            <Button size="sm" onClick={() => requestNavigate(visibleChildren[currentIndex + 1].id)}>
                                {nextLabel}
                                <ChevronRight className="h-4 w-4 ml-1" />
                            </Button>
                        )}
                        {isLast && hasWorkflow && (
                            <Button size="sm" onClick={() => handleAction({ id: "complete", type: "trigger-event", target: "complete" })}>
                                {completeLabel}
                            </Button>
                        )}
                    </div>
                </div>
            </Tabs>

            {/* Nav guard — local UI dialog, not an API action */}
            <Dialog open={showNavGuard} onOpenChange={(isOpen) => !isOpen && cancelNav()}>
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
                        <Button onClick={async () => {
                            await handleAction({ id: "save", type: "trigger-event", target: "save" });
                            confirmNav();
                        }}>
                            Save & Continue
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
};
