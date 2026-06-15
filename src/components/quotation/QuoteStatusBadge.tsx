'use client';

import { Badge } from '@/components/ui/badge';
import {
  QUOTE_STATUS_LABEL,
  QUOTE_STATUS_VARIANT,
  VERSION_STATUS_LABEL,
  VERSION_STATUS_VARIANT,
} from './quoteHelpers';
import type { QuoteStatus, QuoteVersionStatus } from '@/types/group-pas/quotation-v2';

export function QuoteStatusBadge({ status }: { status: QuoteStatus }) {
  return (
    <Badge variant={QUOTE_STATUS_VARIANT[status]}>
      {QUOTE_STATUS_LABEL[status]}
    </Badge>
  );
}

export function VersionStatusBadge({ status }: { status: QuoteVersionStatus }) {
  return (
    <Badge variant={VERSION_STATUS_VARIANT[status]}>
      {VERSION_STATUS_LABEL[status]}
    </Badge>
  );
}
