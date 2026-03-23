// ── Action option box labels ───────────────────────────────────────────────────

export const ACTION_LABELS: Record<string, string> = {
    add:     'Add',
    edit:    'Edit',
    delete:  'Delete',
    enquire: 'Enquire',
    review:  'Review',
};

// ── PageHeader-owned system buttons ───────────────────────────────────────────
// Only buttons NOT already handled by other widgets belong here.
// Excluded (handled elsewhere):
//   save     → FormContainer action button
//   prev     → TabsContainer footer
//   next     → TabsContainer footer
//   complete → TabsContainer footer
//   delete   → TabsContainer footer (per-tab)

export const BUTTON_ORDER = ['submit', 'close'] as const;

export type PageHeaderButtonKey = (typeof BUTTON_ORDER)[number];

export const BUTTON_CONFIG: Record<PageHeaderButtonKey, {
    label: string;
    variant: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost';
    event: string;
}> = {
    submit: { label: 'Submit', variant: 'secondary', event: 'submit' },
    close:  { label: 'Close',  variant: 'ghost',     event: 'close'  },
};
