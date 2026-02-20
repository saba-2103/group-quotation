import React from 'react';
import { WidgetConfig } from '@/types/widget';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { cn } from '@/lib/utils';
import { useActionHandler } from '@/hooks/useActionHandler';
import { ArrowRight } from "lucide-react";

interface DataTableProps {
    config: WidgetConfig;
}

// Emulating the CellRenderer from the old project
const CellRenderer = ({ col, value, onClick }: { col: any, value: any, onClick: () => void }) => {
    if (col.type === "link") {
        return <span className="text-primary hover:underline cursor-pointer" onClick={onClick}>{value}</span>;
    }

    if (col.type === "currency") {
        const formatted = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(value || 0);
        return <span>{formatted}</span>;
    }

    if (col.type === "badge") {
        const mapping = col.valueMapping?.find((m: any) => m.value === value) || { label: value, color: "default" };
        const colorClasses: Record<string, string> = {
            success: "bg-green-100 text-green-800 border-green-200",
            warning: "bg-amber-100 text-amber-800 border-amber-200",
            error: "bg-red-100 text-red-800 border-red-200",
            default: "bg-gray-100 text-gray-800 border-gray-200",
        };
        const bgClass = colorClasses[mapping.color] || colorClasses.default;

        return (
            <span className={cn("inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2", bgClass)}>
                {mapping.label}
            </span>
        );
    }

    return <span>{value}</span>;
};

export const DataTable: React.FC<DataTableProps> = ({ config }) => {
    const { title, columns, showViewAll, viewAllRoute, emptyState, className, isLoading, error } = config.props || {};
    const data = config.props?.data || [];
    const handleAction = useActionHandler();

    if (error) return <div className="p-4 text-red-500 rounded-lg border bg-card">Error loading data</div>;

    const handleRowClick = (row: any) => {
        if (config.props?.onRowClick) {
            handleAction(config.props.onRowClick);
        } else if (config.props?.rowAction) {
            const action = { ...config.props.rowAction };
            if (action.target) {
                action.target = action.target.replace(':id', row.id || row.key);
            }
            handleAction(action);
        }
    };

    const handleViewAll = () => {
        if (viewAllRoute) {
            handleAction({ type: "navigate", target: viewAllRoute });
        }
    };

    return (
        <div className={cn("flex flex-col gap-3 rounded-lg border bg-card p-4", className)}>
            {(title || showViewAll) && (
                <div className="flex items-center justify-between mb-2">
                    {title && <h3 className="text-sm font-semibold text-foreground">{title}</h3>}
                    {showViewAll && viewAllRoute && (
                        <button
                            onClick={handleViewAll}
                            className="flex items-center gap-1 text-sm text-primary hover:underline"
                        >
                            View all <ArrowRight className="h-4 w-4" />
                        </button>
                    )}
                </div>
            )}
            <Table>
                <TableHeader>
                    <TableRow>
                        {columns?.map((col: any) => (
                            <TableHead key={col.accessorKey || col.header} className={col.align === "right" ? "text-right" : ""}>
                                {col.header}
                            </TableHead>
                        ))}
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {isLoading ? (
                        <TableRow>
                            <TableCell colSpan={columns?.length} className="h-24 text-center">
                                Loading data...
                            </TableCell>
                        </TableRow>
                    ) : data.length === 0 ? (
                        <TableRow>
                            <TableCell colSpan={columns?.length} className="h-24 text-center">
                                {emptyState?.message || "No results."}
                            </TableCell>
                        </TableRow>
                    ) : (
                        data.map((row: any, i: number) => (
                            <TableRow
                                key={row.id || i}
                                className={cn(config.props?.rowAction && "cursor-pointer")}
                            >
                                {columns?.map((col: any) => (
                                    <TableCell key={`${row.id || i}-${col.accessorKey}`} className={col.align === "right" ? "text-right" : ""}>
                                        <CellRenderer
                                            col={col}
                                            value={row[col.accessorKey]}
                                            onClick={() => handleRowClick(row)}
                                        />
                                    </TableCell>
                                ))}
                            </TableRow>
                        ))
                    )}
                </TableBody>
            </Table>
        </div>
    );
};
