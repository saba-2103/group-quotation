'use client';

import { useRouter } from 'next/navigation';
import { Plus, Pencil, Trash2, Info } from 'lucide-react';
import { getMergedTemplates } from '@/lib/constants';
import { useRole } from '@/hooks/useRole';
import { canAuthorTemplate } from '@/lib/permissions';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { SumAssuredBasis } from '@/lib/types';

// Human-readable SA basis labels
const SA_BASIS_LABEL: Record<string, string> = {
  [SumAssuredBasis.FLAT]:            'Flat SI',
  [SumAssuredBasis.SALARY_MULTIPLE]: 'Salary multiple',
  [SumAssuredBasis.GRADE_SLAB]:      'Grade slab',
};

export default function PlanTemplatesPage() {
  const router = useRouter();
  const { role, salesLevel } = useRole();
  const canAuthor = canAuthorTemplate(role, salesLevel);
  const templates = getMergedTemplates();
  const customCount = templates.filter((t) => t.isCustom).length;

  return (
    <div className="flex flex-col gap-5 p-6 max-w-[1020px] mx-auto">

      {/* P-CRUMB */}
      <p className="text-xs text-muted-foreground">Plan Templates</p>

      {/* P-HEADER */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight">Plan Template Catalogue</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Supervisor-authored blueprints reps pick on any RFQ
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            {templates.length} template{templates.length !== 1 ? 's' : ''}
            {customCount > 0 && ` (${customCount} custom)`}
          </p>
        </div>
        {canAuthor && (
          <Button size="sm" onClick={() => router.push('/plan-templates/new')}>
            <Plus className="size-4 mr-1.5" /> New template
          </Button>
        )}
      </div>

      {/* P-BANNER — view-only notice */}
      {!canAuthor && (
        <div className="flex items-start gap-2.5 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3">
          <Info className="size-4 text-amber-600 shrink-0 mt-0.5" />
          <p className="text-sm text-amber-800">
            <strong>Template authoring is a Sales Supervisor (L4) capability.</strong>{' '}
            You can browse and use templates from any RFQ.
          </p>
        </div>
      )}

      {/* P-LIST — template catalogue */}
      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <div className="overflow-x-auto">
          {templates.length === 0 ? (
            <p className="px-6 py-8 text-sm text-muted-foreground text-center">No templates found.</p>
          ) : (
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="border-b border-border/60 bg-muted/30">
                  {['Name', 'SA Basis', 'Description', 'Tags', 'Origin', 'Census-aware', 'Actions'].map((h) => (
                    <th key={h} className="text-left px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground whitespace-nowrap">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {templates.map((tmpl) => {
                  // PlanTemplateData has defaultSumAssuredBasis; PlanTemplate does not
                  const saBasis = 'defaultSumAssuredBasis' in tmpl
                    ? SA_BASIS_LABEL[tmpl.defaultSumAssuredBasis as string] ?? tmpl.defaultSumAssuredBasis ?? '—'
                    : '—';
                  const desc = tmpl.description.length > 80
                    ? tmpl.description.slice(0, 79) + '…'
                    : tmpl.description;
                  return (
                    <tr key={tmpl.id} className="border-b border-border/20 last:border-0 hover:bg-muted/20 transition-colors">

                      {/* Name */}
                      <td className="px-4 py-3 font-semibold text-foreground whitespace-nowrap max-w-[180px]">
                        {tmpl.name}
                      </td>

                      {/* SA basis */}
                      <td className="px-4 py-3 text-sm text-muted-foreground whitespace-nowrap">
                        {saBasis}
                      </td>

                      {/* Description */}
                      <td className="px-4 py-3 text-sm text-muted-foreground max-w-[260px]">
                        {desc}
                      </td>

                      {/* Tags */}
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-1">
                          {tmpl.tags.map((tag) => (
                            <span key={tag} className="text-[10px] bg-muted text-muted-foreground rounded-full px-2 py-0.5 whitespace-nowrap">
                              {tag}
                            </span>
                          ))}
                        </div>
                      </td>

                      {/* Origin */}
                      <td className="px-4 py-3">
                        {tmpl.isCustom ? (
                          <span className="text-[11px] font-semibold bg-indigo-50 border border-indigo-200 text-indigo-700 rounded-full px-2.5 py-0.5">
                            Custom
                          </span>
                        ) : (
                          <span className="text-[11px] font-medium border border-border text-muted-foreground rounded-full px-2.5 py-0.5">
                            Built-in
                          </span>
                        )}
                      </td>

                      {/* Census-aware */}
                      <td className="px-4 py-3">
                        {tmpl.censusAware ? (
                          <span className="text-[10px] bg-green-50 border border-green-200 text-green-700 rounded-full px-2 py-0.5">
                            Uses census
                          </span>
                        ) : (
                          <span className="text-muted-foreground text-xs">—</span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1">
                          {/* "Use on a plan" — informational tooltip */}
                          <span
                            title="Pick this template from the 'Start from a template' panel on any RFQ's Plans page."
                            className="cursor-help flex items-center gap-1 text-xs text-muted-foreground border border-dashed border-border rounded px-2 py-1"
                          >
                            <Info className="size-3" /> Use on a plan
                          </span>

                          {/* Author-only actions — custom templates only */}
                          {canAuthor && tmpl.isCustom && (
                            <>
                              <Button
                                size="sm" variant="ghost"
                                className="h-7 px-2 text-[11px]"
                                onClick={() => router.push(`/plan-templates/${tmpl.id}/edit`)}
                              >
                                <Pencil className="size-3 mr-1" /> Edit
                              </Button>
                              <Button
                                size="sm" variant="ghost"
                                className="h-7 px-2 text-[11px] text-destructive hover:text-destructive"
                                onClick={() => router.push(`/plan-templates/${tmpl.id}/delete`)}
                              >
                                <Trash2 className="size-3 mr-1" /> Delete
                              </Button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
