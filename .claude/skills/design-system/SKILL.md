---
name: design-system
description: Update keystone-ui's design system — tokens (colors, radii, spacing, typography in `src/app/globals.css`), component variants (`src/components/ui/variants/`), and primitive defaults — based on a reference the user supplies. Use when the user says "use this design system", "match <site/figma>", "incorporate this style", "update tokens to…", "make it look like…", or shares a screenshot/URL/spec to follow. Conservative: small token tweaks apply directly; structural changes route through `/propose`.
---

# Design system

Translate a design reference into concrete edits in keystone-ui's tokens and component variants. Lean on what already exists (Tailwind + `class-variance-authority` + CSS variables in `globals.css`) instead of introducing parallel systems.

## Inputs
- `$ARGUMENTS` — the reference. Any of:
  - A URL (Figma, a website to mimic, a published design system docs page).
  - A screenshot or image path (use Read on the file).
  - A name ("shadcn stone palette", "Linear-style density", "Material 3 elevation").
  - A pasted spec / token JSON.
  - A natural-language directive ("denser tables", "warmer neutrals", "softer radii").
- Optional flags:
  - `--scope=tokens|variants|both` — limit what gets touched. Default `both`.
  - `--dry-run` — produce the proposed diff and a summary, write nothing.

## Where the design system lives (verify before editing)
- Handoff entry point: `context/HANDOFF.md`
- Core memory: `context/CORE_MEMORY.md`
- Tokens / theme variables: `src/app/globals.css` (CSS custom properties used by Tailwind).
- Tailwind config: `tailwind.config.*` if present at root.
- Component variants (CVA): `src/components/ui/variants/*.ts` (e.g. `tabs-variants.ts`).
- Primitives: `src/components/ui/*.tsx` — read these to see how variants are consumed.
- Composed widgets: `src/components/widgets/**/*.tsx` — read to spot density/spacing assumptions baked in.
- Storybook stories: any `*.stories.*` under `src/`.

Always read `context/HANDOFF.md` if it exists before acting, then run `ls` / `grep`. Never edit a file you haven't read.

## Pipeline

### 1. INTERPRET the reference
Extract a structured spec from whatever the user gave you. Aim for a small JSON-shaped mental model:

```
{
  colors: { background, foreground, primary, muted, accent, destructive, border, ring, … },
  radii:  { sm, md, lg },
  spacing: { density: compact|comfortable|spacious },
  typography: { font-family, scale, weights },
  motion: { transitions, easings },
  variants: { "button.primary": …, "table.row": … }
}
```

If the reference is ambiguous (e.g. "make it look like Linear"), pick the load-bearing decisions (neutrals, accent, radius, density) and explicitly list the assumptions you made. Don't silently invent values.

### 2. DIFF against current state
For each token / variant in the spec:
- Find the current value in `globals.css` or the relevant variants file.
- Decide: **change**, **add**, **leave alone** (already matches or close enough).
- Flag any reference token that doesn't have a clean home in keystone-ui (e.g. they want elevation tokens but we have none) — this is a structural gap, route via `/propose`.

### 3. CLASSIFY the change
- **Direct apply** (small, reversible, isolated):
  - Tweak existing CSS variable values in `globals.css`.
  - Adjust an existing CVA variant's classes.
  - Swap one Tailwind utility for another in a primitive.
- **Route via `/propose`** (system-shaping):
  - Adding new token *categories* (e.g. introducing elevation, motion scale).
  - Renaming tokens or breaking the existing naming convention.
  - Replacing the color model (HSL → OKLCH, etc.).
  - Anything that touches >5 components or changes a public component prop.

When in doubt, propose. Cheap to file, expensive to undo a sweeping silent edit.

### 4. APPLY (direct path)
- Make the smallest edits that realize the change. Preserve the file's existing structure and ordering.
- Don't reflow unrelated code. No drive-by reformatting.
- Update tokens in `globals.css` first, then component variants, then primitives if absolutely needed.
- Don't add new dependencies. If the reference implies one (e.g. a specific font), surface it for the user.

### 5. VERIFY
- `npm run lint` — fix anything you broke.
- If Storybook is configured: start `npm run storybook` and visually confirm a few representative components (button, card, table, form). If you can't run it, say so explicitly.
- Visit at least one widget that composes the changed primitives (e.g. a form widget) to catch knock-on effects.
- For repeated surfaces in a grid or step flow, verify visual consistency rather than only isolated correctness:
  - cards in the same row should not end up with accidental height mismatches unless the design explicitly calls for hierarchy
  - progress indicators should keep even visual spacing even when labels vary in length
  - data-heavy widgets should have an intentional mobile treatment, not just desktop overflow squeezed onto a phone screen
- Don't claim success on lint alone for visual changes.

### 6. REPORT
Output:
- Summary of the reference and the assumptions you made.
- Files touched with one-line rationale each.
- Any structural gaps filed as `/propose` tickets (with PROP-NNNN ids).
- What you verified vs. what's still manual (e.g. "didn't visually check the dialog component — please spot-check").
- Call out if the requested result actually needs a new layout/composition primitive rather than more styling tweaks on an existing domain widget.

## Operational constraints
- **Honor repo memory.** If `context/CORE_MEMORY.md` records a standing execution preference or design constraint, follow it unless the user overrides it in this run.
- **No parallel systems.** Don't introduce a new tokens file or theming layer alongside `globals.css`. Change what's there.
- **Token names are contracts.** Renaming `--primary` to `--brand` is a breaking change — propose, don't apply.
- **Dark mode parity.** When changing a color, change both the light and dark token values in `globals.css`. Never leave one mode behind.
- **Don't hardcode in components.** If a primitive has hex/px values that should be tokens, that's a `/propose` candidate, not silent in-place fixes.
- **Reference fidelity ≠ pixel match.** The job is to translate intent into the existing system, not to replicate every pixel. Note the deviations explicitly.
- **Keep the diff readable.** Group related token changes; avoid scattering edits across many files when one file is enough.
- **Repeated UI should feel systemized.** If the same component appears in a row, list, or flow, avoid accidental size, spacing, or alignment drift caused by content length or priority flags unless that variation is deliberate.
- **Mobile is not optional.** Tables, action centers, and dense data widgets need an intentional small-screen layout or interaction model; horizontal overflow alone is usually not enough.
