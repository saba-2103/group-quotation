'use client';

import { useRouter } from 'next/navigation';
import { ShieldOff } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { TemplateForm } from '@/components/plan-templates/TemplateForm';
import { useRole } from '@/hooks/useRole';
import { canAuthorTemplate } from '@/lib/permissions';

export default function NewTemplatePage() {
  const router = useRouter();
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

  return <TemplateForm mode="new" />;
}
