'use client';

import { useRouter } from 'next/navigation';
import { Plus, Pencil, Trash2, Eye } from 'lucide-react';
import { useTemplateStore } from '@/stores/templateStore';
import { useRole } from '@/hooks/useRole';
import { canAuthorTemplate } from '@/lib/permissions';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

export default function PlanTemplatesPage() {
  const router = useRouter();
  const { role } = useRole();
  const { templates } = useTemplateStore();
  const isAdmin = canAuthorTemplate(role);

  return (
    <div className="flex flex-col gap-6 p-6 max-w-[960px] mx-auto">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight">Plan Templates</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {templates.length} template{templates.length !== 1 ? 's' : ''}
            {!isAdmin && ' — read-only (Admin required to edit)'}
          </p>
        </div>
        {isAdmin && (
          <Button size="sm" onClick={() => router.push('/plan-templates/new')}>
            <Plus className="size-4 mr-1.5" /> New template
          </Button>
        )}
      </div>

      {/* Template list */}
      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-border/40">
                {['Name', 'Tags', 'Description', 'Type', 'Census-aware', 'Actions'].map((h) => (
                  <th key={h} className="text-left px-4 py-2.5 font-medium text-muted-foreground">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {templates.map((tmpl) => (
                <tr key={tmpl.id} className="border-b border-border/20 last:border-0 hover:bg-muted/20">
                  <td className="px-4 py-3 font-medium whitespace-nowrap">{tmpl.name}</td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1">
                      {tmpl.tags.map((tag) => (
                        <span key={tag} className="text-[10px] bg-muted text-muted-foreground rounded-full px-1.5 py-0.5">
                          {tag}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground max-w-[220px]">{tmpl.description}</td>
                  <td className="px-4 py-3">
                    <span className={cn(
                      'text-[10px] font-medium px-1.5 py-0.5 rounded-full border',
                      tmpl.isCustom
                        ? 'bg-indigo-50 border-indigo-200 text-indigo-700'
                        : 'bg-muted border-border text-muted-foreground'
                    )}>
                      {tmpl.isCustom ? 'Custom' : 'Built-in'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {tmpl.censusAware ? (
                      <span className="text-[10px] bg-green-50 border border-green-200 text-green-700 rounded-full px-1.5 py-0.5">Yes</span>
                    ) : (
                      <span className="text-[10px] text-muted-foreground">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1">
                      <Button
                        size="sm" variant="ghost"
                        className="h-7 px-2 text-[10px]"
                        onClick={() => router.push(`/plan-templates/${tmpl.id}`)}
                      >
                        <Eye className="size-3 mr-1" /> View
                      </Button>
                      {isAdmin && (
                        <>
                          <Button
                            size="sm" variant="ghost"
                            className="h-7 px-2 text-[10px]"
                            onClick={() => router.push(`/plan-templates/${tmpl.id}/edit`)}
                          >
                            <Pencil className="size-3 mr-1" /> Edit
                          </Button>
                          <Button
                            size="sm" variant="ghost"
                            className="h-7 px-2 text-[10px] text-destructive hover:text-destructive"
                            onClick={() => router.push(`/plan-templates/${tmpl.id}/delete`)}
                          >
                            <Trash2 className="size-3 mr-1" /> Delete
                          </Button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
