'use client';

import { useRouter, useParams } from 'next/navigation';
import { ShieldOff } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { TemplateForm } from '@/components/plan-templates/TemplateForm';
import { useRole } from '@/hooks/useRole';
import { canAuthorTemplate } from '@/lib/permissions';
import { getCustomTemplates } from '@/lib/templateRegistry';

export default function EditTemplatePage() {
  const router = useRouter();
  const params = useParams<{ templateId: string }>();
  const { templateId } = params;
  const { role, salesLevel } = useRole();

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
          Built-in templates cannot be edited.
        </p>
        <Button variant="outline" onClick={() => router.push('/plan-templates')}>
          Back to templates
        </Button>
      </div>
    );
  }

  return <TemplateForm mode="edit" initialTemplate={template} />;
}
