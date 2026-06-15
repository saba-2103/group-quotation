'use client';

import { useState } from 'react';
import {
  AlertTriangle,
  Briefcase,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Clock,
  FileText,
  GitBranch,
  Link2,
  RefreshCw,
  User,
} from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { formatDate, formatDateTime, PREMIUM_TYPE_LABEL } from '@/components/quotation/quoteHelpers';
import type { QuoteVersion } from '@/types/group-pas/quotation-v2';

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function daysUntil(isoDate?: string): number | null {
  if (!isoDate) return null;
  const diff = new Date(isoDate).getTime() - Date.now();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

function PathBadge({ label, value }: { label: string; value: 'AUTO' | 'MANUAL' }) {
  return (
    <span
      className={`inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-semibold ring-1 ring-inset ${
        value === 'AUTO'
          ? 'bg-emerald-50 text-emerald-700 ring-emerald-200'
          : 'bg-orange-50 text-orange-700 ring-orange-200'
      }`}
    >
      {label}: {value}
    </span>
  );
}

function MetaRow({
  icon: Icon,
  label,
  children,
}: {
  icon: React.ElementType;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="grid grid-cols-[1fr_auto] items-start gap-x-2 gap-y-0.5">
      <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
        <Icon className="size-3 shrink-0" />
        <span>{label}</span>
      </div>
      <div className="text-right text-[11px] text-foreground">{children}</div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// VersionMetaSidebar
// ─────────────────────────────────────────────────────────────────────────────

interface VersionMetaSidebarProps {
  version: QuoteVersion;
}

export function VersionMetaSidebar({ version }: VersionMetaSidebarProps) {
  const [collapsed, setCollapsed] = useState(false);

  const uwRounds = version.round_log.filter((r) => r.roundKind === 'UW').length;
  const pxRounds = version.round_log.filter((r) => r.roundKind === 'PRICING').length;
  const expiryDays = daysUntil(version.expired_at);
  const expiryWarning = expiryDays !== null && expiryDays <= 14 && expiryDays >= 0;

  // ── Collapsed strip ──────────────────────────────────────────────────────
  if (collapsed) {
    return (
      <div className="flex w-8 flex-col items-center gap-3 border-l bg-muted/30 py-4">
        <button
          onClick={() => setCollapsed(false)}
          className="rounded p-1 hover:bg-accent"
          title="Expand sidebar"
        >
          <ChevronLeft className="size-4 text-muted-foreground" />
        </button>
        <Separator />
        <span title="UW / Pricing Path"><GitBranch className="size-4 text-muted-foreground" /></span>
        <span title="Dates"><CalendarDays className="size-4 text-muted-foreground" /></span>
        <span title="Created by"><User className="size-4 text-muted-foreground" /></span>
        <span title="Rounds"><RefreshCw className="size-4 text-muted-foreground" /></span>
      </div>
    );
  }

  // ── Expanded panel ───────────────────────────────────────────────────────
  return (
    <aside className="flex w-[260px] shrink-0 flex-col border-l bg-muted/20">
      {/* Header */}
      <div className="flex h-10 items-center justify-between border-b px-3">
        <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
          Version Info
        </span>
        <button
          onClick={() => setCollapsed(true)}
          className="rounded p-1 hover:bg-accent"
          title="Collapse sidebar"
        >
          <ChevronRight className="size-4 text-muted-foreground" />
        </button>
      </div>

      {/* Content */}
      <div className="flex flex-col gap-4 overflow-y-auto px-3 py-4">
        {/* Routing paths */}
        <section>
          <p className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
            Routing
          </p>
          <div className="flex flex-wrap gap-1.5">
            <PathBadge label="UW" value={version.uw_path} />
            <PathBadge label="Px" value={version.pricing_path} />
          </div>
        </section>

        <Separator />

        {/* Dates */}
        <section>
          <p className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
            Dates
          </p>
          <div className="flex flex-col gap-2">
            <MetaRow icon={CalendarDays} label="Created">
              {formatDateTime(version.created_at)}
            </MetaRow>
            {version.expired_at && (
              <MetaRow icon={Clock} label="Expires">
                <span className={expiryWarning ? 'text-amber-600 font-medium' : ''}>
                  {formatDate(version.expired_at)}
                  {expiryWarning && (
                    <span className="ml-1 inline-flex items-center">
                      <AlertTriangle className="size-3 text-amber-500" />
                    </span>
                  )}
                </span>
              </MetaRow>
            )}
            {version.submitted_at && (
              <MetaRow icon={Clock} label="Submitted">
                {formatDateTime(version.submitted_at)}
              </MetaRow>
            )}
            {version.sent_to_client_at && (
              <MetaRow icon={Clock} label="Sent to Client">
                {formatDateTime(version.sent_to_client_at)}
              </MetaRow>
            )}
            {version.accepted_at && (
              <MetaRow icon={Clock} label="Accepted">
                {formatDateTime(version.accepted_at)}
              </MetaRow>
            )}
            {version.finalized_at && (
              <MetaRow icon={Clock} label="Finalized">
                {formatDateTime(version.finalized_at)}
              </MetaRow>
            )}
          </div>
        </section>

        <Separator />

        {/* Authorship */}
        <section>
          <p className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
            Ownership
          </p>
          <div className="flex flex-col gap-2">
            <MetaRow icon={User} label="Created by">
              {version.created_by}
            </MetaRow>
          </div>
        </section>

        <Separator />

        {/* Premium type */}
        {version.premium && (
          <>
            <section>
              <p className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                Premium
              </p>
              <div className="flex flex-col gap-2">
                <MetaRow icon={Briefcase} label="Type">
                  <Badge variant="secondary" className="text-[10px]">
                    {/* premium_type lives on Quote not QuoteVersion; show gross if present */}
                    {new Intl.NumberFormat('en-IN', {
                      style: 'currency',
                      currency: version.premium.grossPremium.currency,
                      maximumFractionDigits: 0,
                    }).format(version.premium.grossPremium.amount)}
                  </Badge>
                </MetaRow>
              </div>
            </section>
            <Separator />
          </>
        )}

        {/* Round log summary */}
        <section>
          <p className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
            Round Log
          </p>
          <div className="flex flex-col gap-2">
            <MetaRow icon={RefreshCw} label="UW rounds">
              <span className="tabular-nums">{uwRounds}</span>
            </MetaRow>
            <MetaRow icon={RefreshCw} label="Pricing rounds">
              <span className="tabular-nums">{pxRounds}</span>
            </MetaRow>
          </div>
        </section>

        {/* Finalized — consumed for proposal */}
        {version.status === 'FINALIZED' && version.superseded_by_version_id && (
          <>
            <Separator />
            <section>
              <p className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                Supersession
              </p>
              <div className="flex items-start gap-1.5 text-[11px] text-muted-foreground">
                <Link2 className="mt-0.5 size-3 shrink-0" />
                <span className="break-all font-mono text-[10px]">
                  {version.superseded_by_version_id}
                </span>
              </div>
            </section>
          </>
        )}

        {/* Documents summary */}
        {version.attached_documents.length > 0 && (
          <>
            <Separator />
            <section>
              <p className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                Documents
              </p>
              <MetaRow icon={FileText} label="Attached">
                <span className="tabular-nums">{version.attached_documents.length}</span>
              </MetaRow>
            </section>
          </>
        )}
      </div>
    </aside>
  );
}
