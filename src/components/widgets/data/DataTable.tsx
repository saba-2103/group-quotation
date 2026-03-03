"use client";

import React, { useState, useMemo, useEffect } from 'react';
import { WidgetConfig } from '@/types/widget';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { cn } from '@/lib/utils';
import { useActionHandler } from '@/hooks/useActionHandler';
import { CellRenderer } from './CellRenderer';
import { ActionRenderer } from '../controls/ActionRenderer';
import { ArrowRight, ChevronDown, MoreHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface DataTableProps {
    config: WidgetConfig;
}

const SCROLLABLE_COLUMN_THRESHOLD = 7;
const MAX_INLINE_ACTIONS = 2;

export const DataTable: React.FC<DataTableProps> = ({ config }) => {
    const handleAction = useActionHandler();

    // Config parsing
    const {
        title,
        columns,
        rowActions,
        bulkActions,
        pagination,
        selectable,
        showViewAll,
        viewAllRoute,
        emptyState,
        className,
        isLoading,
        error
    } = config.props || {};

    const initialDataProp = config.props?.data;

    // State
    const [tableData, setTableData] = useState<any[]>(initialDataProp || []);
    const [selectedRows, setSelectedRows] = useState<Set<string>>(new Set());
    const [currentPage, setCurrentPage] = useState(1);

    // Sync incoming data changes
    useEffect(() => {
        setTableData(initialDataProp || []);
        setSelectedRows(new Set());
        setCurrentPage(1);
    }, [initialDataProp]);

    // Pagination Logic
    const pageSize = pagination?.pageSize ?? 20;
    const isPaginationEnabled = pagination?.enabled ?? false;
    const totalPages = Math.ceil(tableData.length / pageSize);

    const paginatedData = useMemo(() => {
        if (!isPaginationEnabled) return tableData;
        const startIndex = (currentPage - 1) * pageSize;
        return tableData.slice(startIndex, startIndex + pageSize);
    }, [tableData, currentPage, pageSize, isPaginationEnabled]);

    // Derived flags
    const isScrollable = (columns?.length || 0) > SCROLLABLE_COLUMN_THRESHOLD;
    const hasRowActions = rowActions && rowActions.length > 0;

    // Selection state
    const currentPageIds = useMemo(() => paginatedData.map((r) => String(r.id || r.quotationNumber)), [paginatedData]);
    const isAllSelected = currentPageIds.length > 0 && currentPageIds.every((id) => selectedRows.has(id));
    const isSomeSelected = currentPageIds.some((id) => selectedRows.has(id)) && !isAllSelected;

    if (error) return <div className="p-4 text-red-500 rounded-lg border bg-card">Error loading data</div>;

    // Handlers
    const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
        const checked = e.target.checked;
        if (checked) {
            setSelectedRows(prev => {
                const next = new Set(prev);
                currentPageIds.forEach(id => next.add(id));
                return next;
            });
        } else {
            setSelectedRows(prev => {
                const next = new Set(prev);
                currentPageIds.forEach(id => next.delete(id));
                return next;
            });
        }
    };

    const handleSelectRow = (rowId: string, checked: boolean) => {
        setSelectedRows(prev => {
            const next = new Set(prev);
            if (checked) next.add(rowId);
            else next.delete(rowId);
            return next;
        });
    };

    const handleClearSelection = () => setSelectedRows(new Set());

    // Row Actions
    const handleRowClick = (row: any) => {
        if (config.props?.onRowClick) {
            handleAction(config.props.onRowClick);
        }
    };

    const resolveLinkAndNavigate = (route: string, rowId: string) => {
        const resolvedRoute = route.replace(":id", rowId);
        handleAction({ type: "navigate", target: resolvedRoute });
    };

    const executeRowAction = async (action: any, row: any) => {
        const enhancedAction = { ...action };
        if (enhancedAction.actionProps?.route && row.id) {
            enhancedAction.actionProps.route = enhancedAction.actionProps.route.replace(":id", row.id || row.quotationNumber);
        }
        if (enhancedAction.actionProps?.api?.endpoint && row.id) {
            enhancedAction.actionProps.api.endpoint = enhancedAction.actionProps.api.endpoint.replace(":id", row.id || row.quotationNumber);
        }

        // Let ActionRenderer trigger the generic Action handler, we just pass down
    };

    // Styling helpers
    const getFrozenColumnClasses = (frozen: "left" | "right" | undefined, isHeader: boolean, leftOffset?: string) => {
        if (!isScrollable || !frozen) return "";
        const zIndex = isHeader ? "z-20" : "z-10";
        if (frozen === "left") {
            const shadow = "shadow-[2px_0_4px_-1px_rgba(0,0,0,0.1)]";
            return `sticky ${leftOffset ?? "left-0"} ${zIndex} bg-card ${shadow}`;
        }
        if (frozen === "right") {
            return `sticky right-0 ${zIndex} bg-card shadow-[-2px_0_4px_-1px_rgba(0,0,0,0.1)]`;
        }
        return "";
    };

    const getActionsColumnClasses = (isHeader: boolean) => {
        if (!isScrollable) return "";
        const zIndex = isHeader ? "z-20" : "z-10";
        return `sticky right-0 ${zIndex} bg-card shadow-[-2px_0_4px_-1px_rgba(0,0,0,0.1)]`;
    };

    const getCheckboxColumnClasses = (isHeader: boolean) => {
        if (!isScrollable) return "";
        const zIndex = isHeader ? "z-20" : "z-10";
        return `sticky left-0 ${zIndex} bg-card`;
    };

    // Render Blocks
    const renderRowActions = (row: any) => {
        if (!hasRowActions) return null;

        // Filter actions by visibility and map parameters
        const mappedActions = rowActions
            .filter((act: any) => checkVisibility(act.visible, row))
            .map((act: any) => {
                const a = { ...act };
                const rowId = row.id || row.quotationNumber;

                const replaceParams = (str: string) => str.replace(/:([a-zA-Z0-9_]+)/g, (match, p1) => String(row[p1] || rowId || match));

                // Handle root-level properties
                if (a.route) a.route = replaceParams(a.route);
                if (a.api?.endpoint) a.api = { ...a.api, endpoint: replaceParams(a.api.endpoint) };

                // Handle legacy nested properties
                if (a.actionProps?.route) a.actionProps = { ...a.actionProps, route: replaceParams(a.actionProps.route) };
                if (a.actionProps?.api?.endpoint) a.actionProps = { ...a.actionProps, api: { ...a.actionProps.api, endpoint: replaceParams(a.actionProps.api.endpoint) } };

                return a;
            });

        if (mappedActions.length === 0) return null;

        if (mappedActions.length <= MAX_INLINE_ACTIONS) {
            return (
                <div className="flex items-center justify-end gap-1">
                    {mappedActions.map((action: any) => (
                        <ActionRenderer key={action.id} action={{ ...action, display: "icon" }} />
                    ))}
                </div>
            );
        }

        return (
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                        <MoreHorizontal size={16} />
                        <span className="sr-only">Open menu</span>
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                    {mappedActions.map((action: any) => (
                        <ActionRenderer key={action.id} action={{ ...action, display: "menu-item" }} />
                    ))}
                </DropdownMenuContent>
            </DropdownMenu>
        );
    };

    const colSpan = (columns?.length || 0) + (selectable ? 1 : 0) + (hasRowActions ? 1 : 0);

    const checkVisibility = (visible: any, row: any) => {
        if (!visible) return true;
        const { field, value } = visible;
        return row[field] === value;
    };

    return (
        <div className="flex flex-col gap-4 h-full">
            {/* Header Section */}
            {(title || (config.props?.headerActions && config.props.headerActions.length > 0)) && (
                <div className="flex items-center justify-between gap-4">
                    {title && <h3 className="text-lg font-semibold tracking-tight">{title}</h3>}
                    <div className="flex items-center gap-2">
                        {config.props?.headerActions?.map((action: any) => (
                            <ActionRenderer key={action.id} action={action} />
                        ))}
                    </div>
                </div>
            )}

            {/* Bulk Actions Bar */}
            {selectable && selectedRows.size > 0 && bulkActions && bulkActions.length > 0 && (
                <div className="flex items-center gap-2 rounded-lg border bg-muted/50 px-4 py-2">
                    <span className="text-sm font-medium">
                        {selectedRows.size} {selectedRows.size === 1 ? "item" : "items"} selected
                    </span>
                    <div className="h-4 w-px bg-border" />
                    <div className="flex items-center gap-2">
                        {bulkActions.slice(0, 4).map((action: any) => (
                            <ActionRenderer
                                key={action.id}
                                action={{ ...action, variant: action.variant ?? "outline" }}
                                disabled={selectedRows.size === 0}
                            />
                        ))}
                    </div>
                    <div className="flex-1" />
                    <div className="flex items-center gap-2">
                        <Button variant="ghost" size="sm" onClick={handleClearSelection}>
                            Clear selection
                        </Button>
                    </div>
                </div>
            )}

            {/* Table Container */}
            <div
                className={cn(
                    "flex flex-col rounded-lg border bg-card flex-1",
                    isScrollable ? "overflow-auto overflow-x-auto" : "overflow-hidden"
                )}
            >
                <Table className={cn("relative", isScrollable && "w-max min-w-full")}>
                    <TableHeader>
                        <TableRow>
                            {selectable && (
                                <TableHead className={cn("w-[40px]", getCheckboxColumnClasses(true))}>
                                    <input
                                        type="checkbox"
                                        className="rounded border-gray-300 pointer-events-auto cursor-pointer"
                                        checked={isAllSelected}
                                        ref={input => { if (input) input.indeterminate = isSomeSelected; }}
                                        onChange={handleSelectAll}
                                        aria-label="Select all"
                                    />
                                </TableHead>
                            )}
                            {columns?.map((col: any) => {
                                const leftOffset = col.frozen === "left" && selectable ? "left-[40px]" : undefined;
                                return (
                                    <TableHead
                                        key={col.accessorKey || col.id || col.header || col.label}
                                        style={{ width: col.width, minWidth: col.width }}
                                        className={cn(col.align === "right" ? "text-right" : "", getFrozenColumnClasses(col.frozen, true, leftOffset))}
                                    >
                                        {col.header || col.label}
                                    </TableHead>
                                );
                            })}
                            {hasRowActions && (
                                <TableHead className={cn("w-[80px] text-right", getActionsColumnClasses(true))}>Actions</TableHead>
                            )}
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {isLoading ? (
                            <TableRow>
                                <TableCell colSpan={colSpan} className="h-48 text-center">
                                    <div className="text-muted-foreground">Loading...</div>
                                </TableCell>
                            </TableRow>
                        ) : tableData.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={colSpan} className="h-48 text-center">
                                    <div className="flex flex-col items-center justify-center gap-2">
                                        <p className="text-lg font-medium text-foreground">{emptyState?.title ?? "No data found"}</p>
                                        <p className="text-muted-foreground">{emptyState?.description ?? "There are no records to display."}</p>
                                    </div>
                                </TableCell>
                            </TableRow>
                        ) : (
                            paginatedData.map((row: any, i: number) => {
                                const rowId = String(row.id || row.quotationNumber || i);
                                const isSelected = selectedRows.has(rowId);

                                return (
                                    <TableRow
                                        key={rowId}
                                        data-state={isSelected ? "selected" : undefined}
                                        className={isSelected ? "bg-muted/50" : ""}
                                        onClick={() => handleRowClick(row)}
                                    >
                                        {selectable && (
                                            <TableCell className={cn("w-[40px]", getCheckboxColumnClasses(false))}>
                                                <input
                                                    type="checkbox"
                                                    className="rounded border-gray-300 pointer-events-auto cursor-pointer"
                                                    checked={isSelected}
                                                    onChange={(e) => handleSelectRow(rowId, e.target.checked)}
                                                    onClick={(e) => e.stopPropagation()}
                                                />
                                            </TableCell>
                                        )}
                                        {columns?.map((col: any) => {
                                            const leftOffset = col.frozen === "left" && selectable ? "left-[40px]" : undefined;
                                            const cellKey = col.accessorKey || col.id;
                                            return (
                                                <TableCell
                                                    key={`${rowId}-${cellKey}`}
                                                    className={cn(col.align === "right" ? "text-right" : "", getFrozenColumnClasses(col.frozen, false, leftOffset))}
                                                >
                                                    <CellRenderer
                                                        column={col}
                                                        value={row[cellKey]}
                                                        rowId={rowId}
                                                        onLinkClick={resolveLinkAndNavigate}
                                                    />
                                                </TableCell>
                                            );
                                        })}
                                        {hasRowActions && (
                                            <TableCell className={cn("w-[80px] text-right", getActionsColumnClasses(false))}>
                                                {renderRowActions(row)}
                                            </TableCell>
                                        )}
                                    </TableRow>
                                );
                            })
                        )}
                    </TableBody>
                </Table>
            </div>

            {/* Pagination */}
            {isPaginationEnabled && totalPages > 1 && (
                <div className="flex items-center justify-between px-4 py-2 border-t">
                    <div className="flex items-center gap-2">
                        <span className="text-sm text-muted-foreground">
                            Showing {(currentPage - 1) * pageSize + 1} to {Math.min(currentPage * pageSize, tableData.length)} of{" "}
                            {tableData.length} results
                        </span>
                    </div>

                    <div className="flex items-center gap-2">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                            disabled={currentPage === 1}
                        >
                            Previous
                        </Button>
                        <span className="text-sm">
                            Page {currentPage} of {totalPages}
                        </span>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                            disabled={currentPage === totalPages}
                        >
                            Next
                        </Button>
                    </div>
                </div>
            )}
        </div>
    );
};
