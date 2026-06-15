'use client';

/**
 * Version-scoped Documents tab.
 *
 * Allowed document types (anchored to QUOTE_VERSION):
 *   QUOTE_ACCEPTANCE           → valid in: SENT_TO_CLIENT, ACCEPTED
 *   RATE_CARD_OVERRIDE_EVIDENCE → valid in: REFERRED_MANUAL_PRICING, RATED
 *   UW_DECISION_EVIDENCE       → valid in: REFERRED_MANUAL_UW, EVALUATED
 *
 * Attach is disabled at terminal states or while locked (referred).
 * The type selector only shows types valid for the current version state.
 */

import { useState } from 'react';
import { Download, FileX, Paperclip, Plus } from 'lucide-react';

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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Textarea } from '@/components/ui/textarea';
import { formatDateTime } from '../quoteHelpers';
import type { DocumentAttachment, QuoteVersion, QuoteVersionStatus } from '@/types/group-pas/quotation-v2';

// ─────────────────────────────────────────────────────────────────────────────
// Document type registry
// ─────────────────────────────────────────────────────────────────────────────

interface VersionDocType {
  id: string;
  label: string;
  allowedStates: QuoteVersionStatus[];
}

const VERSION_DOC_TYPES: VersionDocType[] = [
  {
    id: 'UW_DECISION_EVIDENCE',
    label: 'UW Decision Evidence',
    allowedStates: ['REFERRED_MANUAL_UW', 'EVALUATED'],
  },
  {
    id: 'RATE_CARD_OVERRIDE_EVIDENCE',
    label: 'Rate Card Override Evidence',
    allowedStates: ['REFERRED_MANUAL_PRICING', 'RATED'],
  },
  {
    id: 'QUOTE_ACCEPTANCE',
    label: 'Quote Acceptance',
    allowedStates: ['SENT_TO_CLIENT', 'ACCEPTED'],
  },
];

const VERSION_DOC_TYPE_IDS = new Set(VERSION_DOC_TYPES.map((t) => t.id));

const TERMINAL_STATES: QuoteVersionStatus[] = [
  'SUPERSEDED', 'REJECTED', 'WITHDRAWN', 'EXPIRED',
];

function isTerminal(status: QuoteVersionStatus) {
  return TERMINAL_STATES.includes(status);
}

function availableDocTypes(status: QuoteVersionStatus): VersionDocType[] {
  return VERSION_DOC_TYPES.filter((t) => t.allowedStates.includes(status));
}

// ─────────────────────────────────────────────────────────────────────────────
// Doc type badge
// ─────────────────────────────────────────────────────────────────────────────

const DOC_TYPE_VARIANT: Record<string, React.ComponentProps<typeof Badge>['variant']> = {
  UW_DECISION_EVIDENCE: 'amber',
  RATE_CARD_OVERRIDE_EVIDENCE: 'info',
  QUOTE_ACCEPTANCE: 'success',
};

function DocTypeBadge({ typeId, typeName }: { typeId: string; typeName: string }) {
  return (
    <Badge variant={DOC_TYPE_VARIANT[typeId] ?? 'secondary'} className="text-[11px]">
      {typeName}
    </Badge>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Attach Document modal
// ─────────────────────────────────────────────────────────────────────────────

interface AttachModalProps {
  open: boolean;
  onClose: () => void;
  onAttach: (doc: DocumentAttachment) => void;
  versionStatus: QuoteVersionStatus;
  uploadedBy: string;
}

function AttachDocumentModal({
  open,
  onClose,
  onAttach,
  versionStatus,
  uploadedBy,
}: AttachModalProps) {
  const allowed = availableDocTypes(versionStatus);

  const [docTypeId, setDocTypeId] = useState('');
  const [fileName, setFileName] = useState('');
  const [notes, setNotes] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});

  function validate() {
    const next: Record<string, string> = {};
    if (!docTypeId) next.docTypeId = 'Document type is required.';
    else if (!allowed.find((t) => t.id === docTypeId)) {
      next.docTypeId = `This document type is not allowed in the current version state (${versionStatus}).`;
    }
    if (!fileName.trim()) next.fileName = 'File name is required.';
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  function handleSubmit() {
    if (!validate()) return;
    const docType = VERSION_DOC_TYPES.find((t) => t.id === docTypeId)!;
    const doc: DocumentAttachment = {
      attachmentId: `ATT-V-${Date.now()}`,
      documentTypeId: docTypeId,
      documentTypeName: docType.label,
      fileName: fileName.trim(),
      fileUrl: `/mock-files/${fileName.trim().replace(/\s+/g, '-').toLowerCase()}`,
      uploadedBy,
      uploadedAt: new Date().toISOString(),
      notes: notes.trim() || undefined,
    };
    onAttach(doc);
    handleClose();
  }

  function handleClose() {
    setDocTypeId('');
    setFileName('');
    setNotes('');
    setErrors({});
    onClose();
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && handleClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Attach Version Document</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-4 py-2">
          {allowed.length === 0 ? (
            <p className="rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-800 ring-1 ring-amber-200">
              No document types are allowed for this version state (<strong>{versionStatus}</strong>).
            </p>
          ) : (
            <>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="vdoc-type">
                  Document Type <span className="text-destructive">*</span>
                </Label>
                <Select value={docTypeId} onValueChange={setDocTypeId}>
                  <SelectTrigger id="vdoc-type" aria-invalid={!!errors.docTypeId}>
                    <SelectValue placeholder="Select type…" />
                  </SelectTrigger>
                  <SelectContent>
                    {allowed.map((t) => (
                      <SelectItem key={t.id} value={t.id}>
                        {t.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.docTypeId && (
                  <p className="text-xs text-destructive">{errors.docTypeId}</p>
                )}
              </div>

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="vdoc-file">
                  File <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="vdoc-file"
                  type="text"
                  placeholder="e.g. uw_report_v2.pdf"
                  value={fileName}
                  onChange={(e) => setFileName(e.target.value)}
                  aria-invalid={!!errors.fileName}
                />
                {errors.fileName && (
                  <p className="text-xs text-destructive">{errors.fileName}</p>
                )}
                <p className="text-[11px] text-muted-foreground">
                  Enter the filename — upload is mocked.
                </p>
              </div>

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="vdoc-notes">Notes (optional)</Label>
                <Textarea
                  id="vdoc-notes"
                  placeholder="Context about this document…"
                  rows={2}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                />
              </div>
            </>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            Cancel
          </Button>
          {allowed.length > 0 && (
            <Button onClick={handleSubmit}>
              <Paperclip className="size-4" />
              Attach
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// File size formatter
// ─────────────────────────────────────────────────────────────────────────────

function formatFileSize(bytes?: number): string {
  if (!bytes) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

// ─────────────────────────────────────────────────────────────────────────────
// Main tab
// ─────────────────────────────────────────────────────────────────────────────

export interface VersionDocumentsTabProps {
  version: QuoteVersion;
  onAttach: (doc: DocumentAttachment) => void;
  uploadedBy: string;
  /** Ref used by RoundLog to scroll-to and highlight a specific attachment row. */
  highlightAttachmentId?: string | null;
}

export function VersionDocumentsTab({
  version,
  onAttach,
  uploadedBy,
  highlightAttachmentId,
}: VersionDocumentsTabProps) {
  const [attachModalOpen, setAttachModalOpen] = useState(false);

  // Only show version-scoped doc types in this tab
  const docs = version.attached_documents.filter((d) =>
    VERSION_DOC_TYPE_IDS.has(d.documentTypeId),
  );

  const canAttach = !isTerminal(version.status);

  return (
    <div className="flex flex-col gap-4 p-6">
      {/* Header row */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-foreground">Version Documents</h3>
          <p className="text-xs text-muted-foreground">
            {docs.length > 0
              ? `${docs.length} document${docs.length !== 1 ? 's' : ''} attached`
              : 'UW reports, rate card evidence, and acceptance letters for this version.'}
          </p>
        </div>
        <Button
          size="sm"
          variant="outline"
          className="gap-1.5"
          onClick={() => setAttachModalOpen(true)}
          disabled={!canAttach}
          title={!canAttach ? 'Cannot attach documents to a terminal version.' : undefined}
        >
          <Plus className="size-3.5" />
          Attach Document
        </Button>
      </div>

      {/* Allowed types info for current state */}
      {canAttach && (
        <div className="flex flex-wrap items-center gap-1.5 text-[11px] text-muted-foreground">
          <span>Allowed in this state:</span>
          {availableDocTypes(version.status).length > 0 ? (
            availableDocTypes(version.status).map((t) => (
              <Badge key={t.id} variant={DOC_TYPE_VARIANT[t.id] ?? 'secondary'} className="text-[11px]">
                {t.label}
              </Badge>
            ))
          ) : (
            <span className="italic">None — attach not applicable at this stage.</span>
          )}
        </div>
      )}

      {/* Table or empty state */}
      {docs.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-3 rounded-lg border bg-muted/30 py-16 text-muted-foreground">
          <FileX className="size-8 opacity-30" />
          <p className="text-sm">No documents attached to this version yet.</p>
          {canAttach && availableDocTypes(version.status).length > 0 && (
            <p className="text-xs">
              Attach a{' '}
              {availableDocTypes(version.status)
                .map((t) => t.label)
                .join(' or ')}{' '}
              using the button above.
            </p>
          )}
        </div>
      ) : (
        <div className="overflow-hidden rounded-lg border border-border">
          <Table>
            <TableHeader>
              <TableRow className="text-xs">
                <TableHead>File Name</TableHead>
                <TableHead className="w-[220px]">Document Type</TableHead>
                <TableHead className="w-[140px]">Uploaded By</TableHead>
                <TableHead className="w-[160px]">Uploaded At</TableHead>
                <TableHead className="w-[140px]">State at Upload</TableHead>
                <TableHead>Notes</TableHead>
                <TableHead className="w-[56px]" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {docs.map((doc) => {
                const isHighlighted = doc.attachmentId === highlightAttachmentId;
                return (
                  <TableRow
                    key={doc.attachmentId}
                    id={`doc-${doc.attachmentId}`}
                    className={isHighlighted ? 'bg-amber-50 ring-2 ring-inset ring-amber-300' : undefined}
                  >
                    <TableCell>
                      <span className="text-sm font-medium">{doc.fileName}</span>
                      {doc.sizeBytes && (
                        <span className="ml-2 text-[11px] text-muted-foreground">
                          {formatFileSize(doc.sizeBytes)}
                        </span>
                      )}
                    </TableCell>
                    <TableCell>
                      <DocTypeBadge typeId={doc.documentTypeId} typeName={doc.documentTypeName} />
                    </TableCell>
                    <TableCell>
                      <span className="text-xs text-muted-foreground">{doc.uploadedBy}</span>
                    </TableCell>
                    <TableCell>
                      <span className="text-xs text-muted-foreground">
                        {formatDateTime(doc.uploadedAt)}
                      </span>
                    </TableCell>
                    <TableCell>
                      <span className="rounded bg-muted px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground">
                        {version.status}
                      </span>
                    </TableCell>
                    <TableCell>
                      <span className="text-xs text-muted-foreground">{doc.notes ?? '—'}</span>
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        title="Download (mocked)"
                        onClick={() => alert(`Mock download: ${doc.fileName}`)}
                      >
                        <Download className="size-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}

      <AttachDocumentModal
        open={attachModalOpen}
        onClose={() => setAttachModalOpen(false)}
        onAttach={onAttach}
        versionStatus={version.status}
        uploadedBy={uploadedBy}
      />
    </div>
  );
}
