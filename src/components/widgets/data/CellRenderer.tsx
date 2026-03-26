import React from 'react';
import { Badge } from '@/components/ui/badge';
import { DateDisplay } from '@/components/widgets/controls/dateWidget/DateDisplay';

interface CellRendererProps {
    column: any;
    value: unknown;
    rowId?: string;
    onLinkClick?: (route: string, rowId: string) => void;
}

const colorClasses: Record<string, string> = {
    success: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
    warning: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300',
    error: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300',
    info: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300',
    default: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300',
};

export const CellRenderer: React.FC<CellRendererProps> = ({ column, value, rowId, onLinkClick }) => {
    if (value === undefined || value === null) {
        return <span className="text-muted-foreground">-</span>;
    }

    switch (column.type) {
        case 'link': {
            const isInteractive = column.linkRoute && rowId && onLinkClick;
            if (isInteractive) {
                return (
                    <button
                        type="button"
                        className="text-primary hover:underline font-medium"
                        onClick={() => onLinkClick(column.linkRoute!, rowId)}
                    >
                        {String(value)}
                    </button>
                );
            }
            return <span className="text-primary font-medium">{String(value)}</span>;
        }

        case 'badge':
        case 'status': {
            const mapping = column.valueMapping?.find((m: any) => m.value === value) ?? value;
            // if mapping config contains matching variant of badge, render it.
            if (mapping?.variant) {
                return <Badge variant={mapping.variant}>{mapping.label || String(value)}</Badge>;
            }
            const colorKey = mapping?.color || 'default';
            // Determine if a tailwind class mapping exists, otherwise fall back to 'default' or direct class
            const resolvedClass = colorClasses[colorKey] || colorClasses.default;

            return (
                <Badge variant="outline" className={resolvedClass}>
                    {mapping?.label || String(value)}
                </Badge>
            );
        }

        case 'currency': {
            const num = Number(value);
            if (isNaN(num)) return <span>{String(value)}</span>;
            return <span>{new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(num)}</span>;
        }

        case 'number':
            return <span>{Number(value)}</span>;

        case 'date':
            return <DateDisplay value={String(value)} />;

        default:
            return <span>{String(value)}</span>;
    }
};
