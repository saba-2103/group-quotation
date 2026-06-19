/**
 * Client-side plan template registry.
 * Persists custom templates in localStorage under REGISTRY_KEY.
 * Built-in templates live in lib/constants.ts and are never written here.
 */
import type { PlanTemplate } from '@/lib/types';
import {
  EvidencePack,
  FclPattern,
  LivesCovered,
  UwMethod,
} from '@/lib/types';

const REGISTRY_KEY = 'gtl.plan-templates.v1';

/** GTL standard defaults stamped on every saved template. */
export const GTL_STANDARD_DEFAULTS = {
  minEntryAge: 18,
  maxEntryAge: 65,
  cessationAge: 70,
  allowedEmploymentTypes: ['FULL_TIME'],
  livesCovered: LivesCovered.MEMBER_ONLY,
  minGroupSize: 25,
  uwMethod: UwMethod.STP,
} as const;

// ─── Registry helpers ─────────────────────────────────────────────────────────

/** Read custom templates from localStorage. */
export function getCustomTemplates(): PlanTemplate[] {
  if (typeof window === 'undefined') return [];
  try {
    return JSON.parse(localStorage.getItem(REGISTRY_KEY) ?? '[]') as PlanTemplate[];
  } catch {
    return [];
  }
}

/**
 * Upsert a template by id (idempotent).
 * If a template with the same id already exists it is silently replaced.
 */
export function upsertTemplate(template: PlanTemplate): void {
  const existing = getCustomTemplates();
  const idx = existing.findIndex((t) => t.id === template.id);
  if (idx >= 0) {
    existing[idx] = template;
  } else {
    existing.push(template);
  }
  localStorage.setItem(REGISTRY_KEY, JSON.stringify(existing));
}

/**
 * Remove a custom template by id.
 * Built-ins are never in the registry and cannot be deleted this way.
 */
export function removeTemplate(id: string): void {
  const existing = getCustomTemplates().filter((t) => t.id !== id);
  localStorage.setItem(REGISTRY_KEY, JSON.stringify(existing));
}

/** Slug a template name to a stable id. */
export function slugify(name: string): string {
  return (
    'custom-' +
    name
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '')
  );
}

/** EvidencePack human labels for the form select. */
export const EVIDENCE_PACK_LABELS: Record<EvidencePack, string> = {
  [EvidencePack.WITHIN_FCL_MINIMAL]: 'Within-FCL minimal evidence (default)',
  [EvidencePack.EOI_STANDARD]:       'Evidence of Insurability — standard',
  [EvidencePack.EOI_FULL]:           'Evidence of Insurability — full',
  [EvidencePack.EOI_JUMBO]:          'Evidence of Insurability — jumbo (large SI)',
};
