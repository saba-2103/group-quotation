'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronLeft } from 'lucide-react';
import { useRfqBundle } from '@/context/RfqBundleContext';
import { addDocument } from '@/lib/api/quotation-client';
import { DocumentType, DocumentStatus } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

const DOC_TYPE_LABELS: Record<DocumentType, string> = {
  [DocumentType.SIGNED_PROPOSAL]: 'Signed Proposal',
  [DocumentType.QUOTE_ACCEPTANCE]: 'Quote Acceptance',
  [DocumentType.BOARD_RESOLUTION]: 'Board Resolution',
  [DocumentType.FINAL_PLACEMENT_LETTER]: 'Final Placement Letter',
  [DocumentType.OTHER]: 'Other',
};

const DEFAULT_NAMES: Partial<Record<DocumentType, string>> = {
  [DocumentType.SIGNED_PROPOSAL]: 'Signed Proposal Form',
  [DocumentType.QUOTE_ACCEPTANCE]: 'Quote Acceptance Letter',
  [DocumentType.BOARD_RESOLUTION]: 'Board Resolution',
  [DocumentType.FINAL_PLACEMENT_LETTER]: 'Final Placement Letter',
};

export default function NewDocumentPage() {
  const router = useRouter();
  const { bundle, refetch } = useRfqBundle();

  const [docType, setDocType] = useState<DocumentType>(DocumentType.SIGNED_PROPOSAL);
  const [name, setName] = useState(DEFAULT_NAMES[DocumentType.SIGNED_PROPOSAL] ?? '');
  const [status, setStatus] = useState<DocumentStatus>(DocumentStatus.DRAFT);
  const [source, setSource] = useState('');
  const [saving, setSaving] = useState(false);

  if (!bundle) return null;
  const rfqId = bundle.rfqId;

  function handleTypeChange(type: DocumentType) {
    setDocType(type);
    setName(DEFAULT_NAMES[type] ?? '');
  }

  async function handleSave() {
    setSaving(true);
    try {
      await addDocument(rfqId, {
        type: docType,
        name: name.trim() || (DEFAULT_NAMES[docType] ?? 'Document'),
        status,
        source: source.trim() || 'Manual upload',
      });
      // NOTE: file content not stored in this build
      await refetch();
      router.push(`/rfqs/${rfqId}/documents`);
    } catch {
      setSaving(false);
    }
  }

  return (
    <div className="min-h-screen bg-background flex items-start justify-center pt-16 px-4">
      <div className="w-full max-w-lg">
        <button
          className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground mb-6"
          onClick={() => router.push(`/rfqs/${rfqId}/documents`)}
        >
          <ChevronLeft className="size-3.5" /> Back to documents
        </button>
        <div className="rounded-2xl border border-border bg-card shadow-sm p-6 space-y-5">
          <div>
            <h1 className="text-base font-bold">Add Document</h1>
            <p className="text-xs text-muted-foreground mt-1">
              File content is not stored in this build — only metadata is saved.
            </p>
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground">Document Type *</label>
            <select
              className="w-full text-sm border border-border rounded-lg px-3 py-2 bg-background focus:outline-none focus:ring-1 focus:ring-primary/30"
              value={docType}
              onChange={(e) => handleTypeChange(e.target.value as DocumentType)}
            >
              {Object.values(DocumentType).map((t) => (
                <option key={t} value={t}>{DOC_TYPE_LABELS[t]}</option>
              ))}
            </select>
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground">Name</label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Document filename or label"
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground">Status</label>
            <select
              className="w-full text-sm border border-border rounded-lg px-3 py-2 bg-background focus:outline-none focus:ring-1 focus:ring-primary/30"
              value={status}
              onChange={(e) => setStatus(e.target.value as DocumentStatus)}
            >
              {[DocumentStatus.DRAFT, DocumentStatus.SIGNED].map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground">Source</label>
            <Input
              value={source}
              onChange={(e) => setSource(e.target.value)}
              placeholder="e.g. Broker email, DocuSign, Internal"
            />
          </div>
          <div className="rounded-lg border border-dashed border-border bg-muted/20 px-4 py-6 text-center">
            <p className="text-xs text-muted-foreground">
              File upload — metadata only; no file content stored in this build.
            </p>
            <input type="file" className="mt-2 text-xs" />
          </div>
          <div className="flex gap-3 pt-1">
            <Button
              variant="outline" className="flex-1"
              onClick={() => router.push(`/rfqs/${rfqId}/documents`)}
            >
              Cancel
            </Button>
            <Button className="flex-1" disabled={saving} onClick={handleSave}>
              {saving ? 'Saving…' : 'Save document'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
