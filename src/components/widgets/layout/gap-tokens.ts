// Maps numeric gap values (in 0.25rem units, matching the Tailwind spacing
// scale) to static Tailwind gap-* classes. Static literals are required so
// the Tailwind JIT picks them up at build time — dynamic class construction
// (`gap-${n}`) gets tree-shaken.
//
// Range covers the values actually used in current schemas. Extend the map
// rather than reintroducing inline `style={{ gap }}` (which bypasses
// dark-mode and theme overrides and was the source of the 2026-05-11 audit
// finding).

const GAP_MAP: Record<number, string> = {
  0: 'gap-0',
  1: 'gap-1',
  2: 'gap-2',
  3: 'gap-3',
  4: 'gap-4',
  5: 'gap-5',
  6: 'gap-6',
  8: 'gap-8',
  10: 'gap-10',
  12: 'gap-12',
};

export function gapClass(gap: number | undefined): string | undefined {
  if (gap === undefined || gap === null) return undefined;
  const cls = GAP_MAP[gap];
  if (cls === undefined && process.env.NODE_ENV !== 'production') {
    // Silent fallback to `gap-4` would hide schema typos (e.g. gap: 7 rendering
    // as gap-4). Return undefined so the miss is at least visible at runtime,
    // and warn in dev so the author knows to extend GAP_MAP.
    // eslint-disable-next-line no-console
    console.warn(
      `[gap-tokens] Unmapped gap value: ${gap}. Add it to GAP_MAP in src/components/widgets/layout/gap-tokens.ts.`,
    );
  }
  return cls;
}
