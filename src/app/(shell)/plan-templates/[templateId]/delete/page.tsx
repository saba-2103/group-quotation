'use client';

import { useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { ChevronLeft, Trash2, AlertTriangle, ShieldOff } from 'lucide-react';
import { useTemplateStore } from '@/stores/templateStore';
import { useRole } from '@/hooks/useRole';
import { canAuthorTemplate } from '@/lib/permissions';
import { Button } from '@/components/ui/button';

export default function DeleteTemplatePage() {
  const router = useRouter();
  const params = useParams<{ templateId: string }>();
  const { templateId } = params;
  const { role } = useRole();
  const { templates, remove } = useTemplateStore();
  const [deleting, setDeleting] = useState(false);

  const template = templates.find((t) => t.id === templateId);

  if (!canAuthorTemplate(role)) {
    return (
      <div className="p-12 max-w-lg mx-auto text-center space-y-4">
        <ShieldOff className="size-10 text-muted-foreground/40 mx-auto" />
        <h1 className="text-lg font-bold">Access restricted</h1>
        <p className="text-sm text-muted-foreground">Only Admins can delete plan templates.</p>
        <Button variant="outline" onClick={() => router.push('/plan-templates')}>Back</Button>
      </div>
    );
  }

  if (!template) {
    return (
      <div className="p-12 text-center text-sm text-muted-foreground">
        Template not found.{' '}
        <button className="underline" onClick={() => router.push('/plan-templates')}>Back</button>
      </div>
    );
  }

  function handleDelete() {
    setDeleting(true);
    remove(templateId);
    router.push('/plan-templates');
  }

  return (
    <div className="min-h-screen bg-background flex items-start justify-center pt-16 px-4">
      <div className="w-full max-w-md">
        <button
          className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground mb-6"
          onClick={() => router.push('/plan-templates')}
        >
          <ChevronLeft className="size-3.5" /> Back to templates
        </button>
        <div className="rounded-2xl border border-destructive/30 bg-card shadow-sm overflow-hidden">
          <div className="bg-destructive px-6 py-4 flex items-center gap-3">
            <Trash2 className="size-5 text-white" />
            <h1 className="text-base font-bold text-white">Delete Template</h1>
          </div>
          <div className="px-6 py-5 space-y-4">
            <div className="rounded-lg bg-destructive/5 border border-destructive/20 px-4 py-3">
              <p className="text-sm text-destructive font-medium">Delete: {template.name}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{template.description}</p>
            </div>
            <div className="flex items-start gap-2 text-xs text-muted-foreground">
              <AlertTriangle className="size-3.5 text-amber-500 mt-0.5 shrink-0" />
              This action cannot be undone.
              {!template.isCustom && (
                <> This is a built-in template — removing it may affect plan creation wizards.</>
              )}
            </div>
            <div className="flex gap-3 pt-1">
              <Button
                variant="outline" className="flex-1"
                onClick={() => router.push('/plan-templates')}
                disabled={deleting}
              >
                Cancel
              </Button>
              <Button
                variant="destructive" className="flex-1"
                onClick={handleDelete}
                disabled={deleting}
              >
                {deleting ? 'Deleting…' : 'Delete template'}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
