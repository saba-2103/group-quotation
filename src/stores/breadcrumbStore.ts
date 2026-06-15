import { create } from 'zustand';

interface VirtualCrumb {
  label: string;
  href: string;
}

interface BreadcrumbState {
  /** Map of URL path segment → human-readable label override. */
  labels: Record<string, string>;
  setLabel: (segment: string, label: string) => void;
  clearLabels: () => void;
  /**
   * Virtual crumbs to inject after a given segment.
   * e.g. insertAfter['rfq2'] = { label: 'Quotes', href: '/rfq2/quotes' }
   * inserts a "Quotes" breadcrumb between the rfq2 crumb and the next one.
   */
  insertAfter: Record<string, VirtualCrumb>;
  setInsertAfter: (segment: string, crumb: VirtualCrumb) => void;
  clearInsertAfter: (segment: string) => void;
}

export const useBreadcrumbStore = create<BreadcrumbState>((set) => ({
  labels: {},
  setLabel: (segment, label) =>
    set((s) => ({ labels: { ...s.labels, [segment]: label } })),
  clearLabels: () => set({ labels: {} }),
  insertAfter: {},
  setInsertAfter: (segment, crumb) =>
    set((s) => ({ insertAfter: { ...s.insertAfter, [segment]: crumb } })),
  clearInsertAfter: (segment) =>
    set((s) => {
      const next = { ...s.insertAfter };
      delete next[segment];
      return { insertAfter: next };
    }),
}));
