'use client';

import { useState } from 'react';
import { Download, FileX, Paperclip, Plus } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
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
import { formatDateTime } from '../quoteHelpers';
import type { DocumentAttachment, Quote } from '@/types/group-pas/quotation-v2';

// ─────────────────────────────────────────────────────────────────────────────
// Document type definitions (quote-scoped types only)
// ─────────────────────────────────────────────────────────────────────────────

const QUOTE_DOC_TYPES = [
  { id: 'QUOTE_SLIP', label: 'Quote Slip' },
  { id: 'MEMBER_CENSUS', label: 'Member Census' },
  { id: 'BROKER_CORRESPONDENCE', label: 'Broker Correspondence' },
] as const;

type QuoteDocTypeId = typeof QUOTE_DOC_TYPES[number]['id'];

// ─────────────────────────────────────────────────────────────────────────────
// Attach Document Modal
// ─────────────────────────────────────────────────────────────────────────────

interface AttachDocumentModalProps {
  open: boolean;
  onClose: () => void;
  onAttach: (doc: DocumentAttachment) => void;
  uploadedBy: string;
}

function AttachDocumentModal({ open, onClose, onAttach, uploadedBy }: AttachDocumentModalProps) {
  const [docTypeId, setDocTypeId] = useState<QuoteDocTypeId | ''>('');
  const [fileName, setFileName] = useState('');
  const [notes, setNotes] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});

  function validate() {
    const next: Record<string, string> = {};
    if (!docTypeId) next.docTypeId = 'Document type is required';
    if (!fileName.trim()) next.fileName = 'File name is required';
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  function handleSubmit() {
    if (!validate()) return;
    const docType = QUOTE_DOC_TYPES.find((t) => t.id === docTypeId)!;
    const attachment: DocumentAttachment = {
      attachmentId: `ATT-${Date.now()}`,
      documentTypeId: docTypeId as string,
      documentTypeName: docType.label,
      fileName: fileName.trim(),
      fileUrl: `/mock-files/${fileName.trim().replace(/\s+/g, '-').toLowerCase()}`,
      uploadedBy,
      uploadedAt: new Date().toISOString(),
      notes: notes.trim() || undefined,
    };
    onAttach(attachment);
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
          <DialogTitle>Attach Document</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-4 py-2">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="doc-type">
              Document Type <span className="text-destructive">*</span>
            </Label>
            <Select value={docTypeId} onValueChange={(v) => setDocTypeId(v as QuoteDocTypeId)}>
              <SelectTrigger id="doc-type" aria-invalid={!!errors.docTypeId}>
                <SelectValue placeholder="Select type…" />
              </SelectTrigger>
              <SelectContent>
                {QUOTE_DOC_TYPES.map((t) => (
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
            <Label htmlFor="doc-file">
              File <span className="text-destructive">*</span>
            </Label>
            <Input
              id="doc-file"
              type="text"
              placeholder="Enter filename (e.g. quote_slip_v1.pdf)"
              value={fileName}
              onChange={(e) => setFileName(e.target.value)}
              aria-invalid={!!errors.fileName}
            />
            {errors.fileName && (
              <p className="text-xs text-destructive">{errors.fileName}</p>
            )}
            <p className="text-[11px] text-muted-foreground">
              Enter the filename — actual upload is mocked.
            </p>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="doc-notes">Notes (optional)</Label>
            <Textarea
              id="doc-notes"
              placeholder="Any context about this document…"
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            Cancel
          </Button>
          <Button onClick={handleSubmit}>
            <Paperclip className="size-4" />
            Attach
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Collect all quote-scope documents from all versions
// ─────────────────────────────────────────────────────────────────────────────

const QUOTE_SCOPE_DOC_TYPE_IDS = new Set(['QUOTE_SLIP', 'MEMBER_CENSUS', 'BROKER_CORRESPONDENCE']);

function collectQuoteDocs(quote: Quote): DocumentAttachment[] {
  const docs: DocumentAttachment[] = [];
  for (const v of quote.versions) {
    for (const doc of v.attached_documents) {
      if (QUOTE_SCOPE_DOC_TYPE_IDS.has(doc.documentTypeId)) {
        docs.push(doc);
      }
    }
  }
  return docs.sort((a, b) => b.uploadedAt.localeCompare(a.uploadedAt));
}

// ─────────────────────────────────────────────────────────────────────────────
// Documents Tab
// ─────────────────────────────────────────────────────────────────────────────

interface DocumentsTabProps {
  quote: Quote;
  onAttach: (doc: DocumentAttachment, targetVersionId: string) => void;
  uploadedBy: string;
}

export function DocumentsTab({ quote, onAttach, uploadedBy }: DocumentsTabProps) {
  const [attachModalOpen, setAttachModalOpen] = useState(false);

  const docs = collectQuoteDocs(quote);
  const latestVersionId = quote.versions.at(-1)?.version_id ?? '';

  function handleAttach(doc: DocumentAttachment) {
    onAttach(doc, latestVersionId);
  }

  function formatFileSize(bytes?: number): string {
    if (!bytes) return '';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground">
          {docs.length} document{docs.length !== 1 ? 's' : ''}
        </p>
        <Button
          size="sm"
          variant="outline"
          className="gap-1.5"
          onClick={() => setAttachModalOpen(true)}
          disabled={!latestVersionId}
        >
          <Plus className="size-3.5" />
          Attach Document
        </Button>
      </div>

      {docs.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 gap-3 text-muted-foreground border rounded-lg bg-muted/30">
          <FileX className="size-8 opacity-30" />
          <p className="text-sm">No documents attached</p>
          <p className="text-xs">Attach a Quote Slip, Member Census, or Broker Correspondence.</p>
        </div>
      ) : (
        <div className="rounded-lg border border-border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="text-xs">
                <TableHead>File Name</TableHead>
                <TableHead className="w-[180px]">Type</TableHead>
                <TableHead className="w-[140px]">Uploaded By</TableHead>
                <TableHead className="w-[120px]">Uploaded At</TableHead>
                <TableHead>Notes</TableHead>
                <TableHead className="w-[60px]" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {docs.map((doc) => (
                <TableRow key={doc.attachmentId}>
                  <TableCell>
                    <span className="text-sm font-medium">{doc.fileName}</span>
                    {doc.sizeBytes && (
                      <span className="ml-2 text-[11px] text-muted-foreground">
                        {formatFileSize(doc.sizeBytes)}
                      </span>
                    )}
                  </TableCell>
                  <TableCell>
                    <span className="text-xs">{doc.documentTypeName}</span>
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
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <AttachDocumentModal
        open={attachModalOpen}
        onClose={() => setAttachModalOpen(false)}
        onAttach={handleAttach}
        uploadedBy={uploadedBy}
      />
    </div>
  );
}
