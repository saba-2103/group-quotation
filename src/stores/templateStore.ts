import { create } from 'zustand';
import { BUILTIN_PLAN_TEMPLATES, type PlanTemplateData } from '@/lib/constants';

// In-memory template store — no backend persistence.
// Seeded from lib/constants PLAN_TEMPLATES at first access.

interface TemplateState {
  templates: PlanTemplateData[];
  add: (t: Omit<PlanTemplateData, 'id'>) => void;
  update: (id: string, patch: Partial<Omit<PlanTemplateData, 'id'>>) => void;
  remove: (id: string) => void;
}

function templateId(): string {
  return `tmpl-custom-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
}

export const useTemplateStore = create<TemplateState>((set) => ({
  templates: BUILTIN_PLAN_TEMPLATES,

  add: (t) =>
    set((s) => ({
      templates: [...s.templates, { ...t, id: templateId(), isCustom: true }],
    })),

  update: (id, patch) =>
    set((s) => ({
      templates: s.templates.map((t) => (t.id === id ? { ...t, ...patch } : t)),
    })),

  remove: (id) =>
    set((s) => ({ templates: s.templates.filter((t) => t.id !== id) })),
}));
