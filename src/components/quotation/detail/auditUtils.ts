/**
 * Derives a chronological audit event log from a Quote + its versions.
 */

import type { Quote, QuoteVersion } from '@/types/group-pas/quotation-v2';

// ─────────────────────────────────────────────────────────────────────────────

export type AuditEventType =
  | 'QUOTE_CREATED'
  | 'VERSION_CREATED'
  | 'STATUS_CHANGE'
  | 'DOCUMENT_ATTACHED'
  | 'ROUND_ASSIGNED'
  | 'ROUND_COMPLETED'
  | 'SENT_TO_CLIENT'
  | 'ACCEPTED'
  | 'FINALIZED'
  | 'REJECTED'
  | 'WITHDRAWN';

export interface AuditEvent {
  id: string;
  timestamp: string;
  actor: string;
  type: AuditEventType;
  title: string;
  description?: string;
  versionNumber?: number;
}

// ─────────────────────────────────────────────────────────────────────────────

function event(
  id: string,
  timestamp: string,
  actor: string,
  type: AuditEventType,
  title: string,
  description?: string,
  versionNumber?: number,
): AuditEvent {
  return { id, timestamp, actor, type, title, description, versionNumber };
}

// ─────────────────────────────────────────────────────────────────────────────

export function deriveAuditEvents(quote: Quote): AuditEvent[] {
  const events: AuditEvent[] = [];

  // ── Quote created ──
  events.push(
    event(
      `q-created`,
      quote.created_at,
      quote.created_by,
      'QUOTE_CREATED',
      'Quote created',
      `${quote.quote_number} · ${quote.scheme_type} · ${quote.business_type.replace(/_/g, ' ')}`,
    ),
  );

  // ── Version events ──
  for (const v of quote.versions) {
    const vn = v.version_number;

    // Version created
    events.push(
      event(
        `v${vn}-created`,
        v.created_at,
        v.created_by,
        'VERSION_CREATED',
        `Version ${vn}${v.version_label ? ` — ${v.version_label}` : ''} created`,
        v.uw_path === 'MANUAL' ? 'Manual UW path' : 'Automatic routing',
        vn,
      ),
    );

    // Round log
    for (const round of v.round_log) {
      const kind = round.roundKind === 'UW' ? 'UW' : 'Pricing';
      events.push(
        event(
          `v${vn}-round${round.roundNumber}-assign`,
          round.assignedAt,
          'System',
          'ROUND_ASSIGNED',
          `${kind} round ${round.roundNumber} assigned`,
          `Assigned to ${round.assignedToName}`,
          vn,
        ),
      );
      if (round.completedAt && round.outcome) {
        events.push(
          event(
            `v${vn}-round${round.roundNumber}-complete`,
            round.completedAt,
            round.assignedToName,
            'ROUND_COMPLETED',
            `${kind} round ${round.roundNumber}: ${round.outcome}`,
            round.remarks,
            vn,
          ),
        );
      }
    }

    // Documents attached
    for (const doc of v.attached_documents) {
      events.push(
        event(
          `v${vn}-doc-${doc.attachmentId}`,
          doc.uploadedAt,
          doc.uploadedBy,
          'DOCUMENT_ATTACHED',
          `Document attached — ${doc.documentTypeName}`,
          doc.fileName,
          vn,
        ),
      );
    }

    // Lifecycle timestamps
    const lifeCycleEvents: Array<[string | undefined, AuditEventType, string]> = [
      [v.submitted_at, 'STATUS_CHANGE', `Version ${vn} submitted`],
      [v.sent_to_client_at, 'SENT_TO_CLIENT', `Version ${vn} sent to client`],
      [v.accepted_at, 'ACCEPTED', `Version ${vn} accepted by client`],
      [v.finalized_at, 'FINALIZED', `Version ${vn} finalized`],
      [v.rejected_at, 'REJECTED', `Version ${vn} rejected`],
      [v.withdrawn_at, 'WITHDRAWN', `Version ${vn} withdrawn`],
      [v.expired_at, 'STATUS_CHANGE', `Version ${vn} expired`],
    ];
    for (const [ts, type, title] of lifeCycleEvents) {
      if (ts) {
        events.push(event(`v${vn}-${type.toLowerCase()}`, ts, quote.created_by, type, title, undefined, vn));
      }
    }
  }

  // Sort chronologically
  events.sort((a, b) => a.timestamp.localeCompare(b.timestamp));

  return events;
}
