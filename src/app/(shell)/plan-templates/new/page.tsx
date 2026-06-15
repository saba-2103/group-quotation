'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronLeft, ShieldOff } from 'lucide-react';
import { useTemplateStore } from '@/stores/templateStore';
import { useRole } from '@/hooks/useRole';
import { canAuthorTemplate } from '@/lib/permissions';
import { type PlanTemplateData } from '@/lib/constants';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';

type FormState = Omit<PlanTemplateData, 'id' | 'isCustom' | 'defaultProductCode' | 'defaultSumAssuredBasis' | 'defaultCoverPattern' | 'defaultBenefits'>;

export default function NewTemplatePage() {
  const router = useRouter();
  const { role } = useRole();
  const { add } = useTemplateStore();

  const [form, setForm] = useState<FormState>({
    name: '',
    description: '',
    tags: [],
    censusAware: false,
  });
  const [tagInput, setTagInput] = useState('');
  const [saving, setSaving] = useState(false);

  if (!canAuthorTemplate(role)) {
    return (
      <div className="p-12 max-w-lg mx-auto text-center space-y-4">
        <ShieldOff className="size-10 text-muted-foreground/40 mx-auto" />
        <h1 className="text-lg font-bold">Access restricted</h1>
        <p className="text-sm text-muted-foreground">Only Admins can create plan templates.</p>
        <Button variant="outline" onClick={() => router.push('/plan-templates')}>Back</Button>
      </div>
    );
  }

  function addTag() {
    const tag = tagInput.trim();
    if (tag && !form.tags.includes(tag)) {
      setForm((s) => ({ ...s, tags: [...s.tags, tag] }));
    }
    setTagInput('');
  }

  function removeTag(tag: string) {
    setForm((s) => ({ ...s, tags: s.tags.filter((t) => t !== tag) }));
  }

  function handleSave() {
    if (!form.name.trim()) return;
    setSaving(true);
    add({ ...form, isCustom: true, defaultBenefits: [] });
    router.push('/plan-templates');
  }

  return (
    <div className="min-h-screen bg-background flex items-start justify-center pt-16 px-4">
      <div className="w-full max-w-lg">
        <button
          className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground mb-6"
          onClick={() => router.push('/plan-templates')}
        >
          <ChevronLeft className="size-3.5" /> Back to templates
        </button>
        <div className="rounded-2xl border border-border bg-card shadow-sm p-6 space-y-5">
          <h1 className="text-base font-bold">New Template</h1>

          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground">Name *</label>
            <Input
              value={form.name}
              placeholder="Template name"
              onChange={(e) => setForm((s) => ({ ...s, name: e.target.value }))}
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground">Description</label>
            <Textarea
              rows={3}
              value={form.description}
              placeholder="Brief description…"
              onChange={(e) => setForm((s) => ({ ...s, description: e.target.value }))}
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground">Tags</label>
            <div className="flex gap-2">
              <Input
                value={tagInput}
                placeholder="Add tag and press Enter"
                className="flex-1"
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addTag(); } }}
              />
              <Button size="sm" variant="outline" onClick={addTag}>Add</Button>
            </div>
            {form.tags.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-2">
                {form.tags.map((tag) => (
                  <span
                    key={tag}
                    className="text-[11px] bg-muted text-muted-foreground rounded-full px-2 py-0.5 flex items-center gap-1"
                  >
                    {tag}
                    <button onClick={() => removeTag(tag)} className="text-muted-foreground hover:text-foreground">×</button>
                  </span>
                ))}
              </div>
            )}
          </div>

          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={form.censusAware}
              onChange={(e) => setForm((s) => ({ ...s, censusAware: e.target.checked }))}
              className="size-4 rounded border-border accent-primary"
            />
            <span className="text-sm">Census-aware</span>
          </label>

          <div className="flex gap-3 pt-1">
            <Button variant="outline" className="flex-1" onClick={() => router.push('/plan-templates')}>
              Cancel
            </Button>
            <Button
              className="flex-1"
              disabled={!form.name.trim() || saving}
              onClick={handleSave}
            >
              {saving ? 'Saving…' : 'Create template'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
