'use client';

/**
 * SubmitSendTab
 *
 * Pre-submission readiness checklist + required fields form +
 * action hub for the full version lifecycle:
 *   RATED → SUBMITTED → SENT_TO_CLIENT → ACCEPTED/REJECTED → FINALIZED
 */

import { useRef, useState } from 'react';
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  CheckSquare,
  ChevronDown,
  ChevronUp,
  Loader2,
  Send,
  XCircle,
} from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { formatDateTime } from '@/components/quotation/quoteHelpers';
import type {
  AgeDefinitionRule,
  Quote,
  QuoteStatus,
  QuoteVersion,
  QuoteVersionStatus,
} from '@/types/group-pas/quotation-v2';

// ─────────────────────────────────────────────────────────────────────────────
// Exported types
// ─────────────────────────────────────────────────────────────────────────────

export interface VersionEditableFields {
  effective_date?: string;
  expiry_date?: string;
  inception_date?: string;
  age_definition_rule?: AgeDefinitionRule;
  risk_term_classification?: string;
  version_label?: string;
}

interface SubmitSendTabProps {
  version: QuoteVersion;
  quote: Quote;
  onStatusChange: (status: QuoteVersionStatus) => void;
  onVersionFieldsChange: (fields: VersionEditableFields) => void;
  onQuoteStatusChange: (status: QuoteStatus) => void;
  onSupersedeSiblings: (keepVersionId: string) => void;
  onSwitchTab: (tab: string) => void;
}

// ─────────────────────────────────────────────────────────────────────────────
// Checklist helpers
// ─────────────────────────────────────────────────────────────────────────────

interface ChecklistItem {
  id: string;
  label: string;
  met: boolean;
  fixTarget?: string;
  fixLabel?: string;
  note?: string;
}

const UW_DONE: QuoteVersionStatus[] = [
  'EVALUATED',
  'RATED',
  'REFERRED_MANUAL_PRICING',
  'SUBMITTED',
  'SENT_TO_CLIENT',
  'ACCEPTED',
  'FINALIZED',
];
const PRICING_DONE: QuoteVersionStatus[] = [
  'RATED',
  'SUBMITTED',
  'SENT_TO_CLIENT',
  'ACCEPTED',
  'FINALIZED',
];

function buildChecklist(version: QuoteVersion, schemeType: string): ChecklistItem[] {
  const isGCL = schemeType === 'GCL';
  const multiPlan = version.plans.length > 1;
  const s = version.status as QuoteVersionStatus;

  return [
    {
      id: 'plans',
      label: 'At least one plan configured',
      met: version.plans.length > 0,
      fixTarget: 'plans',
      fixLabel: 'Go to Plans',
    },
    {
      id: 'fields',
      label: 'Required version fields present',
      met: !!(version.effective_date && version.expiry_date && version.inception_date),
      fixLabel: 'Fill below ↓',
    },
    {
      id: 'uw',
      label: 'UW evaluation completed',
      met: UW_DONE.includes(s),
      fixTarget: 'uw',
      fixLabel: 'Go to UW Evaluation',
    },
    {
      id: 'pricing',
      label: 'Rate card validated and priced',
      met: PRICING_DONE.includes(s),
      fixTarget: 'pricing',
      fixLabel: 'Go to Pricing',
    },
    {
      id: 'premium',
      label: 'Initial premium calculated',
      met: !!version.premium,
      fixTarget: 'premium',
      fixLabel: 'Go to Premium',
    },
    {
      id: 'census',
      label: 'Aggregate census set',
      met: isGCL || version.aggregate_census.headcount > 0,
      fixTarget: 'census',
      fixLabel: 'Go to Census',
      note: isGCL ? 'Not required for GCL' : undefined,
    },
    {
      id: 'mapping',
      label: 'Member-to-plan mapping configured',
      met: !multiPlan || !!version.member_to_plan_mapping,
      fixTarget: 'census',
      fixLabel: 'Go to Census & Mapping',
      note: !multiPlan ? 'Not required (single plan)' : undefined,
    },
  ];
}

// ─────────────────────────────────────────────────────────────────────────────
// ChecklistSection
// ─────────────────────────────────────────────────────────────────────────────

function ChecklistSection({
  version,
  schemeType,
  onSwitchTab,
  onScrollToForm,
}: {
  version: QuoteVersion;
  schemeType: string;
  onSwitchTab: (tab: string) => void;
  onScrollToForm: () => void;
}) {
  const items = buildChecklist(version, schemeType);
  const allMet = items.every((i) => i.met);
  const missingCount = items.filter((i) => !i.met).length;

  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <p className="text-sm font-semibold">Readiness Checklist</p>
        {allMet ? (
          <Badge variant="success" className="text-xs">
            All requirements met
          </Badge>
        ) : (
          <Badge variant="warning" className="text-xs">
            {missingCount} requirement{missingCount !== 1 ? 's' : ''} missing
          </Badge>
        )}
      </div>
      <div className="divide-y overflow-hidden rounded-lg border">
        {items.map((item, i) => (
          <div key={item.id} className="flex items-center gap-3 bg-background px-4 py-3">
            <span className="w-4 shrink-0 font-mono text-xs text-muted-foreground">
              {i + 1}
            </span>
            {item.met ? (
              <CheckCircle2 className="size-4 shrink-0 text-emerald-500" />
            ) : (
              <XCircle className="size-4 shrink-0 text-red-400" />
            )}
            <span className={`flex-1 text-sm ${item.met ? '' : 'text-muted-foreground'}`}>
              {item.label}
              {item.note && (
                <span className="ml-2 text-xs text-muted-foreground">({item.note})</span>
              )}
            </span>
            {!item.met && item.fixLabel && (
              <button
                className="flex shrink-0 items-center gap-1 text-xs font-medium text-primary hover:underline"
                onClick={() => {
                  if (item.id === 'fields') {
                    onScrollToForm();
                  } else if (item.fixTarget) {
                    onSwitchTab(item.fixTarget);
                  }
                }}
              >
                {item.fixLabel}
                <ArrowRight className="size-3" />
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Required Fields Form
// ─────────────────────────────────────────────────────────────────────────────

const AGE_DEF_LABELS: Record<AgeDefinitionRule, string> = {
  ALB: 'Age Last Birthday (ALB)',
  ANB: 'Age Next Birthday (ANB)',
  COMPLETED_YEARS: 'Completed Years',
};

const RISK_TERM_OPTIONS = [
  'SHORT_TERM',
  'ANNUAL',
  'MULTI_YEAR',
  'OPEN_TERM',
] as const;

function RequiredFieldsForm({
  version,
  quote,
  editable,
  formRef,
  onSave,
}: {
  version: QuoteVersion;
  quote: Quote;
  editable: boolean;
  formRef: React.RefObject<HTMLDivElement | null>;
  onSave: (fields: VersionEditableFields) => void;
}) {
  const [open, setOpen] = useState(true);
  const [draft, setDraft] = useState<VersionEditableFields>({
    effective_date: version.effective_date ?? '',
    expiry_date: version.expiry_date ?? '',
    inception_date: version.inception_date ?? '',
    age_definition_rule: version.age_definition_rule ?? undefined,
    risk_term_classification: version.risk_term_classification ?? '',
    version_label: version.version_label ?? '',
  });

  function set<K extends keyof VersionEditableFields>(
    key: K,
    val: VersionEditableFields[K],
  ) {
    setDraft((d) => ({ ...d, [key]: val }));
  }

  function handleSave() {
    onSave(draft);
  }

  const hasRequiredFields =
    !!version.effective_date && !!version.expiry_date && !!version.inception_date;

  return (
    <div ref={formRef} className="rounded-lg border">
      {/* Collapsible header */}
      <button
        className="flex w-full items-center justify-between px-4 py-3"
        onClick={() => setOpen((p) => !p)}
      >
        <div className="flex items-center gap-2">
          <p className="text-sm font-semibold">Version Fields</p>
          {!hasRequiredFields && editable && (
            <Badge variant="destructive" className="text-[10px]">
              Required
            </Badge>
          )}
          {hasRequiredFields && (
            <Badge variant="success" className="text-[10px]">
              Complete
            </Badge>
          )}
        </div>
        {open ? (
          <ChevronUp className="size-4 text-muted-foreground" />
        ) : (
          <ChevronDown className="size-4 text-muted-foreground" />
        )}
      </button>

      {open && (
        <div className="border-t px-4 py-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {/* Effective date */}
            <div>
              <Label className="text-xs">
                Effective Date <span className="text-destructive">*</span>
              </Label>
              <Input
                type="date"
                className="mt-1 h-8 text-xs"
                value={draft.effective_date ?? ''}
                onChange={(e) => set('effective_date', e.target.value)}
                readOnly={!editable}
                disabled={!editable}
              />
            </div>

            {/* Expiry date */}
            <div>
              <Label className="text-xs">
                Expiry Date <span className="text-destructive">*</span>
              </Label>
              <Input
                type="date"
                className="mt-1 h-8 text-xs"
                value={draft.expiry_date ?? ''}
                onChange={(e) => set('expiry_date', e.target.value)}
                readOnly={!editable}
                disabled={!editable}
              />
            </div>

            {/* Inception date */}
            <div>
              <Label className="text-xs">
                Inception Date <span className="text-destructive">*</span>
              </Label>
              <Input
                type="date"
                className="mt-1 h-8 text-xs"
                value={draft.inception_date ?? ''}
                onChange={(e) => set('inception_date', e.target.value)}
                readOnly={!editable}
                disabled={!editable}
              />
            </div>

            {/* Age definition rule */}
            <div>
              <Label className="text-xs">Age Definition Rule</Label>
              {editable ? (
                <Select
                  value={draft.age_definition_rule ?? ''}
                  onValueChange={(v) => set('age_definition_rule', v as AgeDefinitionRule)}
                >
                  <SelectTrigger className="mt-1 h-8 text-xs">
                    <SelectValue placeholder="Select…" />
                  </SelectTrigger>
                  <SelectContent>
                    {(Object.keys(AGE_DEF_LABELS) as AgeDefinitionRule[]).map((k) => (
                      <SelectItem key={k} value={k} className="text-xs">
                        {AGE_DEF_LABELS[k]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <Input
                  className="mt-1 h-8 text-xs"
                  value={
                    version.age_definition_rule
                      ? AGE_DEF_LABELS[version.age_definition_rule]
                      : '—'
                  }
                  readOnly
                  disabled
                />
              )}
            </div>

            {/* Risk term */}
            <div>
              <Label className="text-xs">Risk Term Classification</Label>
              {editable ? (
                <Select
                  value={draft.risk_term_classification ?? ''}
                  onValueChange={(v) => set('risk_term_classification', v)}
                >
                  <SelectTrigger className="mt-1 h-8 text-xs">
                    <SelectValue placeholder="Select…" />
                  </SelectTrigger>
                  <SelectContent>
                    {RISK_TERM_OPTIONS.map((o) => (
                      <SelectItem key={o} value={o} className="text-xs">
                        {o.replace(/_/g, ' ')}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <Input
                  className="mt-1 h-8 text-xs"
                  value={version.risk_term_classification?.replace(/_/g, ' ') ?? '—'}
                  readOnly
                  disabled
                />
              )}
            </div>

            {/* Line of business (quote-level, read-only) */}
            <div>
              <Label className="text-xs">Line of Business</Label>
              <Input
                className="mt-1 h-8 text-xs"
                value={quote.line_of_business ?? '—'}
                readOnly
                disabled
              />
            </div>

            {/* Premium type (quote-level, read-only) */}
            <div>
              <Label className="text-xs">Premium Type</Label>
              <Input
                className="mt-1 h-8 text-xs"
                value={quote.premium_type}
                readOnly
                disabled
              />
            </div>

            {/* Version label */}
            <div>
              <Label className="text-xs">Version Label (optional)</Label>
              <Input
                className="mt-1 h-8 text-xs"
                placeholder="e.g. Base offer"
                value={draft.version_label ?? ''}
                onChange={(e) => set('version_label', e.target.value)}
                readOnly={!editable}
                disabled={!editable}
              />
            </div>
          </div>

          {editable && (
            <div className="mt-4 flex items-center gap-2">
              <Button size="sm" onClick={handleSave}>
                Save Fields
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Outcome card (terminal states)
// ─────────────────────────────────────────────────────────────────────────────

function OutcomeCard({ version, pimRef }: { version: QuoteVersion; pimRef?: string }) {
  const { status } = version;

  const configs: Record<
    string,
    { bg: string; border: string; icon: string; title: string; body: string }
  > = {
    FINALIZED: {
      bg: 'bg-emerald-50',
      border: 'border-emerald-200',
      icon: '✓',
      title: 'Quote Finalized — Handed off to PIM',
      body: pimRef
        ? `Proposal ID: ${pimRef}`
        : 'This version has been finalized and handed off to Policy Issuance.',
    },
    REJECTED: {
      bg: 'bg-red-50',
      border: 'border-red-200',
      icon: '✗',
      title: 'Rejected by Client',
      body: 'The client declined this version.',
    },
    WITHDRAWN: {
      bg: 'bg-slate-50',
      border: 'border-slate-200',
      icon: '—',
      title: 'Version Withdrawn',
      body: 'This version was withdrawn before the client accepted.',
    },
    SUPERSEDED: {
      bg: 'bg-slate-50',
      border: 'border-slate-200',
      icon: '→',
      title: 'Superseded',
      body: version.superseded_by_version_id
        ? `Replaced by ${version.superseded_by_version_id}`
        : 'This version was superseded by a newer version.',
    },
    EXPIRED: {
      bg: 'bg-amber-50',
      border: 'border-amber-200',
      icon: '⏱',
      title: 'Version Expired',
      body: 'This version has passed its expiry date.',
    },
  };

  const cfg = configs[status];
  if (!cfg) return null;

  return (
    <div className={`rounded-xl border p-5 ${cfg.bg} ${cfg.border}`}>
      <div className="flex items-center gap-3">
        <span className="text-2xl">{cfg.icon}</span>
        <div>
          <p className="font-semibold">{cfg.title}</p>
          <p className="mt-0.5 text-sm text-muted-foreground">{cfg.body}</p>
        </div>
      </div>
      {version.finalized_at && (
        <p className="mt-2 text-xs text-muted-foreground">
          Finalized at: {formatDateTime(version.finalized_at)}
        </p>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// ── Modals ───────────────────────────────────────────────────────────────────
// ─────────────────────────────────────────────────────────────────────────────

function SubmitVersionModal({
  open,
  onClose,
  version,
  quote,
  onConfirm,
}: {
  open: boolean;
  onClose: () => void;
  version: QuoteVersion;
  quote: Quote;
  onConfirm: () => void;
}) {
  const [loading, setLoading] = useState(false);

  async function handleConfirm() {
    setLoading(true);
    await new Promise((r) => setTimeout(r, 700));
    setLoading(false);
    onConfirm();
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Submit Version</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-4 py-2">
          {/* Summary */}
          <dl className="grid grid-cols-2 gap-x-4 gap-y-2 rounded-lg bg-muted/40 px-4 py-3 text-xs">
            <dt className="text-muted-foreground">Version</dt>
            <dd className="font-medium">V{version.version_number}</dd>
            <dt className="text-muted-foreground">Client</dt>
            <dd className="font-medium">{quote.client_name}</dd>
            <dt className="text-muted-foreground">Scheme</dt>
            <dd className="font-medium">{quote.scheme_type}</dd>
            {version.premium && (
              <>
                <dt className="text-muted-foreground">Total Premium</dt>
                <dd className="font-mono font-medium">
                  ₹{version.premium.totalPremium.amount.toLocaleString('en-IN')}
                </dd>
              </>
            )}
          </dl>
          {/* Warning */}
          <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2">
            <AlertTriangle className="mt-0.5 size-4 shrink-0 text-amber-600" />
            <p className="text-xs text-amber-800">
              Once submitted, plan configuration is{' '}
              <span className="font-semibold">sealed and cannot be edited</span>. Clone this
              version if you need to make changes.
            </p>
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" size="sm" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button size="sm" onClick={handleConfirm} disabled={loading}>
            {loading ? <Loader2 className="mr-2 size-4 animate-spin" /> : null}
            Submit
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function SendToClientModal({
  open,
  onClose,
  clientName,
  onConfirm,
}: {
  open: boolean;
  onClose: () => void;
  clientName: string;
  onConfirm: () => void;
}) {
  const [loading, setLoading] = useState(false);

  async function handleConfirm() {
    setLoading(true);
    await new Promise((r) => setTimeout(r, 700));
    setLoading(false);
    onConfirm();
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Send Quote to Client</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-3 py-2">
          <p className="text-sm">
            Send the quote document to{' '}
            <span className="font-semibold">{clientName}</span>?
          </p>
          <div className="flex items-start gap-2 rounded-lg bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
            <span className="mt-0.5 shrink-0">ℹ</span>
            <span>
              A quote document will be generated and can be dispatched via CCM. (mocked)
            </span>
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" size="sm" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button size="sm" onClick={handleConfirm} disabled={loading}>
            {loading ? <Loader2 className="mr-2 size-4 animate-spin" /> : <Send className="mr-2 size-4" />}
            Send to Client
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function MarkAcceptedModal({
  open,
  onClose,
  clientName,
  onConfirm,
}: {
  open: boolean;
  onClose: () => void;
  clientName: string;
  onConfirm: () => void;
}) {
  const [loading, setLoading] = useState(false);

  async function handleConfirm() {
    setLoading(true);
    await new Promise((r) => setTimeout(r, 500));
    setLoading(false);
    onConfirm();
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Mark as Accepted</DialogTitle>
        </DialogHeader>
        <p className="py-2 text-sm text-muted-foreground">
          Mark this version as accepted by{' '}
          <span className="font-semibold text-foreground">{clientName}</span>?
        </p>
        <DialogFooter>
          <Button variant="ghost" size="sm" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button
            size="sm"
            className="bg-emerald-600 hover:bg-emerald-700 text-white"
            onClick={handleConfirm}
            disabled={loading}
          >
            {loading ? <Loader2 className="mr-2 size-4 animate-spin" /> : null}
            Confirm Acceptance
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function MarkRejectedModal({
  open,
  onClose,
  onConfirm,
}: {
  open: boolean;
  onClose: () => void;
  onConfirm: (reason: string) => void;
}) {
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleConfirm() {
    if (!reason.trim()) return;
    setLoading(true);
    await new Promise((r) => setTimeout(r, 500));
    setLoading(false);
    onConfirm(reason.trim());
    setReason('');
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Mark as Rejected</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-3 py-2">
          <div>
            <label className="mb-1 block text-xs font-medium">
              Rejection reason from client <span className="text-destructive">*</span>
            </label>
            <Input
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g. Premium too high, coverage mismatch…"
              className="text-sm"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" size="sm" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button
            size="sm"
            variant="destructive"
            onClick={handleConfirm}
            disabled={!reason.trim() || loading}
          >
            {loading ? <Loader2 className="mr-2 size-4 animate-spin" /> : null}
            Mark as Rejected
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function FinalizeVersionModal({
  open,
  onClose,
  version,
  quote,
  onConfirm,
}: {
  open: boolean;
  onClose: () => void;
  version: QuoteVersion;
  quote: Quote;
  onConfirm: () => void;
}) {
  const [loading, setLoading] = useState(false);

  const TERMINAL = new Set(['SUPERSEDED', 'REJECTED', 'WITHDRAWN', 'EXPIRED', 'FINALIZED']);
  const siblings = quote.versions.filter(
    (v) => v.version_id !== version.version_id && !TERMINAL.has(v.status),
  );

  async function handleConfirm() {
    setLoading(true);
    await new Promise((r) => setTimeout(r, 900));
    setLoading(false);
    onConfirm();
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-lg">Finalize Quote</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-4 py-2">
          {/* Version summary card */}
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4">
            <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-emerald-700">
              Version being finalized
            </p>
            <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs">
              <dt className="text-emerald-700/70">Version</dt>
              <dd className="font-semibold text-emerald-900">V{version.version_number}</dd>
              <dt className="text-emerald-700/70">Client</dt>
              <dd className="font-semibold text-emerald-900">{quote.client_name}</dd>
              <dt className="text-emerald-700/70">Scheme</dt>
              <dd className="font-semibold text-emerald-900">{quote.scheme_type}</dd>
              {version.premium && (
                <>
                  <dt className="text-emerald-700/70">Total Premium</dt>
                  <dd className="font-mono font-semibold text-emerald-900">
                    ₹{version.premium.totalPremium.amount.toLocaleString('en-IN')}
                  </dd>
                </>
              )}
            </dl>
          </div>

          {/* Siblings to supersede */}
          {siblings.length > 0 && (
            <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3">
              <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold text-amber-800">
                <AlertTriangle className="size-3.5" />
                The following versions will be automatically superseded:
              </p>
              <ul className="space-y-1">
                {siblings.map((v) => (
                  <li key={v.version_id} className="text-xs text-amber-700">
                    · V{v.version_number}
                    {v.version_label ? ` — ${v.version_label}` : ''}
                    <span className="ml-1 text-amber-600/70">({v.status})</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Irreversible warning */}
          <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2">
            <AlertTriangle className="mt-0.5 size-4 shrink-0 text-red-600" />
            <p className="text-xs text-red-800">
              This quote will be handed off to{' '}
              <span className="font-semibold">Policy Issuance (PIM)</span>. This action is{' '}
              <span className="font-semibold">irreversible</span>.
            </p>
          </div>
        </div>

        <DialogFooter className="flex-col gap-2 sm:flex-col">
          <Button
            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white"
            size="sm"
            onClick={handleConfirm}
            disabled={loading}
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 size-4 animate-spin" />
                Finalizing…
              </>
            ) : (
              'Finalize & Handoff to PIM'
            )}
          </Button>
          <Button variant="ghost" size="sm" className="w-full" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Action area
// ─────────────────────────────────────────────────────────────────────────────

type ActiveModal =
  | 'submit'
  | 'send'
  | 'accept'
  | 'reject'
  | 'finalize'
  | null;

function ActionArea({
  version,
  quote,
  allChecksMet,
  onStatusChange,
  onQuoteStatusChange,
  onSupersedeSiblings,
}: {
  version: QuoteVersion;
  quote: Quote;
  allChecksMet: boolean;
  onStatusChange: (s: QuoteVersionStatus) => void;
  onQuoteStatusChange: (s: QuoteStatus) => void;
  onSupersedeSiblings: (keepId: string) => void;
}) {
  const [modal, setModal] = useState<ActiveModal>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [pimRef, setPimRef] = useState<string | null>(null);

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(null), 4500);
  }

  const { status } = version;
  const TERMINAL = ['SUPERSEDED', 'REJECTED', 'WITHDRAWN', 'EXPIRED', 'FINALIZED'];

  if (TERMINAL.includes(status)) {
    return (
      <>
        <OutcomeCard version={version} pimRef={pimRef ?? undefined} />
        {toast && (
          <div className="fixed bottom-6 right-6 z-50 rounded-lg bg-emerald-600 px-4 py-3 text-sm text-white shadow-lg">
            {toast}
          </div>
        )}
      </>
    );
  }

  return (
    <>
      {/* Toast */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 rounded-lg bg-emerald-600 px-4 py-3 text-sm text-white shadow-lg">
          {toast}
        </div>
      )}

      {/* Action buttons */}
      <div className="rounded-lg border bg-muted/20 px-5 py-4">
        <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Actions
        </p>
        <div className="flex flex-wrap items-center gap-3">
          {status === 'RATED' && (
            <Button
              size="sm"
              disabled={!allChecksMet}
              onClick={() => setModal('submit')}
              title={!allChecksMet ? 'Complete all checklist items first' : undefined}
            >
              <CheckSquare className="mr-2 size-4" />
              Submit Version
            </Button>
          )}

          {status === 'SUBMITTED' && (
            <Button size="sm" onClick={() => setModal('send')}>
              <Send className="mr-2 size-4" />
              Send to Client
            </Button>
          )}

          {status === 'SENT_TO_CLIENT' && (
            <>
              <Button
                size="sm"
                className="bg-emerald-600 hover:bg-emerald-700 text-white"
                onClick={() => setModal('accept')}
              >
                Mark as Accepted
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="border-red-300 text-red-600 hover:bg-red-50"
                onClick={() => setModal('reject')}
              >
                Mark as Rejected
              </Button>
            </>
          )}

          {status === 'ACCEPTED' && (
            <Button
              size="sm"
              className="bg-indigo-600 hover:bg-indigo-700 text-white"
              onClick={() => setModal('finalize')}
            >
              Finalize Version
            </Button>
          )}

          {/* State description */}
          <p className="text-xs text-muted-foreground">
            {status === 'RATED' && !allChecksMet && 'Complete all checklist items to enable submission.'}
            {status === 'RATED' && allChecksMet && 'Ready to submit to compliance review.'}
            {status === 'SUBMITTED' && 'Submitted. Ready to send the quote document to the client.'}
            {status === 'SENT_TO_CLIENT' && 'Awaiting client decision.'}
            {status === 'ACCEPTED' && 'Client accepted. Finalize to hand off to Policy Issuance.'}
          </p>
        </div>
      </div>

      {/* Modals */}
      <SubmitVersionModal
        open={modal === 'submit'}
        onClose={() => setModal(null)}
        version={version}
        quote={quote}
        onConfirm={() => {
          onStatusChange('SUBMITTED');
          if (quote.status === 'DRAFT') onQuoteStatusChange('ACTIVE');
          setModal(null);
          showToast(
            quote.status === 'DRAFT'
              ? 'Version submitted. Quote is now Active — intent fields are locked.'
              : 'Version submitted successfully.',
          );
        }}
      />

      <SendToClientModal
        open={modal === 'send'}
        onClose={() => setModal(null)}
        clientName={quote.client_name}
        onConfirm={() => {
          onStatusChange('SENT_TO_CLIENT');
          setModal(null);
          showToast('Quote sent to client.');
        }}
      />

      <MarkAcceptedModal
        open={modal === 'accept'}
        onClose={() => setModal(null)}
        clientName={quote.client_name}
        onConfirm={() => {
          onStatusChange('ACCEPTED');
          setModal(null);
          showToast('Version marked as accepted.');
        }}
      />

      <MarkRejectedModal
        open={modal === 'reject'}
        onClose={() => setModal(null)}
        onConfirm={(_reason) => {
          onStatusChange('REJECTED');
          setModal(null);
          showToast('Version marked as rejected by client.');
        }}
      />

      <FinalizeVersionModal
        open={modal === 'finalize'}
        onClose={() => setModal(null)}
        version={version}
        quote={quote}
        onConfirm={() => {
          const ref = `PIM-MOCK-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
          setPimRef(ref);
          onStatusChange('FINALIZED');
          onQuoteStatusChange('FINALIZED');
          onSupersedeSiblings(version.version_id);
          setModal(null);
          showToast(`Finalized and handed off to PIM · Proposal ID: ${ref}`);
        }}
      />
    </>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// SubmitSendTab (exported)
// ─────────────────────────────────────────────────────────────────────────────

export function SubmitSendTab({
  version,
  quote,
  onStatusChange,
  onVersionFieldsChange,
  onQuoteStatusChange,
  onSupersedeSiblings,
  onSwitchTab,
}: SubmitSendTabProps) {
  const formRef = useRef<HTMLDivElement>(null);

  const EDITABLE_STATUSES: QuoteVersionStatus[] = ['DRAFT', 'EVALUATED', 'RATED'];
  const isEditable = EDITABLE_STATUSES.includes(version.status as QuoteVersionStatus);

  const allChecksMet = buildChecklist(version, quote.scheme_type).every((i) => i.met);

  function scrollToForm() {
    if (formRef.current) {
      formRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
      // Brief highlight
      formRef.current.classList.add('ring-2', 'ring-primary/50');
      setTimeout(() => formRef.current?.classList.remove('ring-2', 'ring-primary/50'), 1500);
    }
  }

  return (
    <div className="flex flex-col gap-6 px-6 py-5">
      {/* Checklist */}
      <ChecklistSection
        version={version}
        schemeType={quote.scheme_type}
        onSwitchTab={onSwitchTab}
        onScrollToForm={scrollToForm}
      />

      <Separator />

      {/* Required fields form */}
      <RequiredFieldsForm
        version={version}
        quote={quote}
        editable={isEditable}
        formRef={formRef}
        onSave={onVersionFieldsChange}
      />

      <Separator />

      {/* Actions + modals */}
      <ActionArea
        version={version}
        quote={quote}
        allChecksMet={allChecksMet}
        onStatusChange={onStatusChange}
        onQuoteStatusChange={onQuoteStatusChange}
        onSupersedeSiblings={onSupersedeSiblings}
      />
    </div>
  );
}
