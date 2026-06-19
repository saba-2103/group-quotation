'use client';

import { useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { AlertTriangle, ChevronRight, ShieldOff, Trash2 } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useRole } from '@/hooks/useRole';
import { canAuthorTemplate } from '@/lib/permissions';
import { getCustomTemplates, removeTemplate } from '@/lib/templateRegistry';
import { SumAssuredBasis } from '@/lib/types';

const SA_BASIS_LABELS: Record<SumAssuredBasis, string> = {
  [SumAssuredBasis.FLAT]:            'Flat sum insured',
  [SumAssuredBasis.SALARY_MULTIPLE]: 'Salary multiple',
  [SumAssuredBasis.GRADE_SLAB]:      'Grade slab (census-seeded)',
};

export default function DeleteTemplatePage() {
  const router = useRouter();
  const params = useParams<{ templateId: string }>();
  const { templateId } = params;
  const { role, salesLevel } = useRole();
  const [deleting, setDeleting] = useState(false);

  if (!canAuthorTemplate(role, salesLevel)) {
    return (
      <div className="p-12 max-w-lg mx-auto text-center space-y-4">
        <ShieldOff className="size-10 text-muted-foreground/40 mx-auto" />
        <h1 className="text-lg font-bold">Access restricted</h1>
        <p className="text-sm text-muted-foreground">
          Template authoring requires Sales Supervisor (L4) or Admin access.
        </p>
        <Button variant="outline" onClick={() => router.push('/plan-templates')}>
          Back
        </Button>
      </div>
    );
  }

  const template = getCustomTemplates().find((t) => t.id === templateId);

  if (!template) {
    return (
      <div className="p-12 max-w-lg mx-auto text-center space-y-4">
        <p className="text-sm text-muted-foreground">
          This template cannot be deleted.
        </p>
        <Button variant="outline" onClick={() => router.push('/plan-templates')}>
          Back to templates
        </Button>
      </div>
    );
  }

  function handleDelete() {
    setDeleting(true);
    removeTemplate(templateId);
    router.push('/plan-templates');
  }

  return (
    <div className="max-w-lg mx-auto px-4 py-8 space-y-6">

      {/* Breadcrumb */}
      <nav className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <button
          type="button"
          onClick={() => router.push('/plan-templates')}
          className="hover:text-foreground hover:underline"
        >
          Plan Templates
        </button>
        <ChevronRight className="size-3" />
        <span>{template.name}</span>
        <ChevronRight className="size-3" />
        <span className="text-destructive font-medium">Delete</span>
      </nav>

      {/* P-DECISION: Confirmation panel */}
      <div className="rounded-xl border border-destructive/30 bg-card shadow-sm overflow-hidden">
        {/* Header */}
        <div className="bg-destructive px-6 py-4 flex items-center gap-3">
          <Trash2 className="size-5 text-white" />
          <h1 className="text-base font-bold text-white">
            Delete template — {template.name}?
          </h1>
        </div>

        <div className="px-6 py-5 space-y-5">
          {/* Template summary */}
          <div className="rounded-lg bg-muted/60 border px-4 py-3 space-y-2 text-sm">
            <div className="grid grid-cols-[6rem_1fr] gap-y-1.5 text-sm">
              <span className="text-muted-foreground">Name</span>
              <span className="font-medium">{template.name}</span>
              <span className="text-muted-foreground">SA basis</span>
              <span>{SA_BASIS_LABELS[template.sumAssuredBasis] ?? template.sumAssuredBasis}</span>
              <span className="text-muted-foreground">Tags</span>
              <span className="flex flex-wrap gap-1">
                {template.tags.length > 0
                  ? template.tags.map((tag) => (
                      <Badge key={tag} variant="secondary" className="text-xs">
                        {tag}
                      </Badge>
                    ))
                  : <span className="text-muted-foreground">—</span>
                }
              </span>
              <span className="text-muted-foreground">Census-aware</span>
              <span>{template.censusAware ? 'Yes' : 'No'}</span>
            </div>
          </div>

          {/* Consequences */}
          <div className="flex items-start gap-2 rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            <AlertTriangle className="mt-0.5 size-4 shrink-0 text-amber-600" />
            <div className="space-y-1">
              <p>
                This template will be removed from the catalogue and will no
                longer appear in the &ldquo;Start from a template&rdquo; picker
                on any RFQ.
              </p>
              <p className="text-xs text-amber-800">
                Plans already created from this template are unaffected —
                templates are pre-fill blueprints, not live links.
              </p>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-3 pt-1">
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => router.push('/plan-templates')}
              disabled={deleting}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              className="flex-1"
              onClick={handleDelete}
              disabled={deleting}
            >
              {deleting ? 'Deleting…' : 'Delete template'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
