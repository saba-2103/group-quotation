'use client';

import { FileText } from 'lucide-react';
import { AuditTimeline } from '../AuditTimeline';
import { deriveAuditEvents } from './auditUtils';
import type { Quote } from '@/types/group-pas/quotation-v2';

interface AuditLogTabProps {
  quote: Quote;
}

export function AuditLogTab({ quote }: AuditLogTabProps) {
  const events = deriveAuditEvents(quote);

  if (events.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-3 text-muted-foreground border rounded-lg bg-muted/30">
        <FileText className="size-8 opacity-30" />
        <p className="text-sm">No events yet</p>
      </div>
    );
  }

  return <AuditTimeline events={events} />;
}
