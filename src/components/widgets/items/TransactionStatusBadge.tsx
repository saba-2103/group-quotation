import React from 'react';
import { Badge, badgeVariants } from '@/components/ui/badge';
import type { VariantProps } from 'class-variance-authority';

type BadgeVariant = VariantProps<typeof badgeVariants>['variant'];

const TRANSACTION_STATUS_MAP: Record<string, { label: string; variant: BadgeVariant }> = {
    DR: { label: 'Draft',            variant: 'grey' },
    CM: { label: 'Completed',        variant: 'info' },
    RV: { label: 'Review',           variant: 'warning' },
    RC: { label: 'Review Completed', variant: 'teal' },
    AC: { label: 'Active',           variant: 'success' },
    AD: { label: 'Active Draft',     variant: 'amber' },
    IA: { label: 'In-Active',        variant: 'destructive' },
};

interface TransactionStatusBadgeProps {
    code: string;
}

export const TransactionStatusBadge: React.FC<TransactionStatusBadgeProps> = ({ code }) => {
    const status = TRANSACTION_STATUS_MAP[code];
    if (!status) return <Badge variant="outline">{code}</Badge>;
    return <Badge variant={status.variant}>{status.label}</Badge>;
};
