'use client';

import { useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { ChevronLeft, Trash2, AlertTriangle } from 'lucide-react';
import { useRfqBundle } from '@/context/RfqBundleContext';
import { deleteDocument } from '@/lib/api/quotation-client';
import { DocumentType } from '@/lib/types';
import { Button } from '@/components/ui/button';

const DOC_TYPE_LABELS: Record<DocumentType, string> = {
  [DocumentType.SIGNED_PROPOSAL]: 'Signed Proposal',
  [DocumentType.QUOTE_ACCEPTANCE]: 'Quote Acceptance',
  [DocumentType.BOARD_RESOLUTION]: 'Board Resolution',
  [DocumentType.FINAL_PLACEMENT_LETTER]: 'Final Placement Letter',
  [DocumentType.OTHER]: 'Other',
};

export default function DeleteDocumentPage() {
  const router = useRouter();
  const params = useParams<{ rfqId: string; documentId: string }>();
  const { rfqId, documentId } = params;
  const { bundle, refetch } = useRfqBundle();
  const [deleting, setDeleting] = useState(false);

  if (!bundle) return null;

  const doc = bundle.documents.find((d) => d.documentId === documentId);

  if (!doc) {
    return (
      <div className="p-8 text-center text-sm text-muted-foreground">
        Document not found.{' '}
        <button className="underline" onClick={() => router.push(`/rfqs/${rfqId}/documents`)}>
          Back to documents
        </button>
      </div>
    );
  }

  async function handleDelete() {
    setDeleting(true);
    try {
      await deleteDocument(rfqId, documentId);
      await refetch();
      router.push(`/rfqs/${rfqId}/documents`);
    } catch {
      setDeleting(false);
    }
  }

  return (
    <div className="min-h-screen bg-background flex items-start justify-center pt-16 px-4">
      <div className="w-full max-w-md">
        <button
          className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground mb-6"
          onClick={() => router.push(`/rfqs/${rfqId}/documents`)}
        >
          <ChevronLeft className="size-3.5" /> Back to documents
        </button>
        <div className="rounded-2xl border border-destructive/30 bg-card shadow-sm overflow-hidden">
          <div className="bg-destructive px-6 py-4 flex items-center gap-3">
            <Trash2 className="size-5 text-white" />
            <h1 className="text-base font-bold text-white">Delete Document</h1>
          </div>
          <div className="px-6 py-5 space-y-4">
            <div className="rounded-lg bg-destructive/5 border border-destructive/20 px-4 py-3">
              <p className="text-sm text-destructive font-medium">
                Delete document: {doc.name}
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {DOC_TYPE_LABELS[doc.type] ?? doc.type} — {doc.status}
              </p>
            </div>
            <div className="flex items-start gap-2 text-xs text-muted-foreground">
              <AlertTriangle className="size-3.5 text-amber-500 mt-0.5 shrink-0" />
              This action cannot be undone.
            </div>
            <div className="flex gap-3 pt-1">
              <Button
                variant="outline" className="flex-1"
                onClick={() => router.push(`/rfqs/${rfqId}/documents`)}
                disabled={deleting}
              >
                Cancel
              </Button>
              <Button
                variant="destructive" className="flex-1"
                onClick={handleDelete}
                disabled={deleting}
              >
                {deleting ? 'Deleting…' : 'Delete document'}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
