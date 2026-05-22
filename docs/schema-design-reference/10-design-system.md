# 10 — Design system

This document covers how the visual layer is structured — tokens, Tailwind setup, theming, and where to change visual behaviour vs widget logic.

The framework is opinionated about *layout primitives* (widgets) and *not opinionated* about *visual atoms* (colours, radii, typography). Theming changes happen here; widget changes happen in [02-widget-catalog.md](02-widget-catalog.md).

---

## Where things live

| File | Purpose |
|------|---------|
| [`src/app/globals.css`](../../src/app/globals.css) | Design tokens (CSS custom properties), Tailwind `@theme` directives |
| `src/components/ui/*` | Primitive components (Button, Card, Badge, Tooltip, …) built on shadcn/ui |
| `src/components/ui/variants/*` | `class-variance-authority` variant definitions (button variants, badge colors) |
| `tailwind.config.*` | Tailwind config — usually empty / minimal because tokens come from `@theme` in CSS |
| `src/components/widgets/*` | The widgets — consume primitives + tokens, don't define new ones |

---

## The token layer

Design tokens are CSS custom properties declared in `globals.css`. Example structure (your repo's tokens may differ — read the file):

```css
@layer base {
  :root {
    --background: #ffffff;
    --foreground: #0a0a0a;
    --primary: #0070f3;
    --primary-foreground: #ffffff;
    --secondary: #f4f4f5;
    --muted: #f4f4f5;
    --muted-foreground: #71717a;
    --accent: #f4f4f5;
    --destructive: #ef4444;
    --success: #10b981;
    --warning: #eab308;
    --border: #e4e4e7;
    --input: #e4e4e7;
    --ring: #0070f3;
    --radius: 0.75rem;
    /* chart palette */
    --chart-1: ...;
    --chart-2: ...;
    /* sidebar tokens */
    --sidebar-background: ...;
    --sidebar-foreground: ...;
  }

  .dark {
    --background: #0a0a0a;
    --foreground: #ffffff;
    /* ... dark overrides ... */
  }
}
```

Tailwind utilities reference these via the `@theme` directive (Tailwind v4 syntax). So writing `bg-primary` in a component class compiles to `background: var(--primary)`.

### Customising tokens

To change the brand colour app-wide, edit `--primary` in `globals.css`. To change radii, edit `--radius`. Don't override tokens inline in widgets — every widget uses them indirectly via `bg-primary`, `rounded-lg`, etc.

For a structured token change (e.g., a full design-system refresh from a Figma reference), use the [`design-system` skill](../../.claude/skills/design-system/SKILL.md). It scopes the change to tokens + variants and avoids touching widget logic.

---

## Variant patterns

The primitive components use [`class-variance-authority`](https://cva.style/) (CVA) to compose Tailwind classes. Each primitive has a `variants/` file:

```ts
// src/components/ui/variants/button.ts (simplified)
export const buttonVariants = cva(
  "inline-flex items-center justify-center rounded-md text-sm font-medium ...",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-primary/90",
        destructive: "bg-destructive text-destructive-foreground hover:bg-destructive/90",
        outline: "border border-input bg-background hover:bg-accent",
        secondary: "bg-secondary text-secondary-foreground hover:bg-secondary/80",
        ghost: "hover:bg-accent hover:text-accent-foreground",
        link: "text-primary underline-offset-4 hover:underline"
      },
      size: { default: "h-10 px-4 py-2", sm: "h-9 px-3", lg: "h-11 px-8", icon: "h-10 w-10" }
    },
    defaultVariants: { variant: "default", size: "default" }
  }
);
```

When a schema uses `"variant": "destructive"` on an action, this is the table consulted to pick classes.

To add a new variant (e.g., a `"teal"` button), extend the variant object here — don't add ad-hoc Tailwind in widgets.

---

## Badge colours

Badges (in tables, key-value-grids, info-cards) take a `color` field in `valueMapping`. Colours map to CVA variants:

```json
"valueMapping": [
  { "value": "ACTIVE",    "label": "Active",    "color": "success" },
  { "value": "PENDING",   "label": "Pending",   "color": "warning" },
  { "value": "FAILED",    "label": "Failed",    "color": "error" },
  { "value": "INFO_ONLY", "label": "Info",      "color": "info" },
  { "value": "ARCHIVED",  "label": "Archived",  "color": "grey" }
]
```

The mapping `color → variant` is in [`src/components/widgets/data/DataTable/constants.ts`](../../src/components/widgets/data/DataTable/constants.ts):

```ts
export const BADGE_COLOR_TO_VARIANT: Record<string, string> = {
  success: "success",
  warning: "warning",
  error: "destructive",
  info: "info",
  grey: "secondary"
};
```

To add a new badge colour: extend the constant + add the corresponding badge variant in `src/components/ui/variants/badge.ts`.

---

## Icons

Icons are [Lucide](https://lucide.dev) — `import { Eye } from "lucide-react"` (or via the `LucideIcon` helper). Schemas reference icons by string name:

```json
{ "icon": "Eye" }
```

Misspelled names render nothing (no error). The helper looks up the icon by name; unknown names fall through silently.

To use a new icon: just reference it by name. To use a non-Lucide icon: extend the `LucideIcon` helper or use a custom component (and document the convention).

---

## Typography

Typography lives in `globals.css` via `@theme`. Headings, body text, and code blocks have token-driven sizes. Most widgets use Tailwind utility classes directly (`text-sm`, `text-base`, `font-semibold`) — they're consistent because the underlying token scale is the same.

For module-specific typography (e.g., a dashboard wanting bigger metric labels), use the widget's `className` escape hatch where available. Don't introduce new font scales.

---

## Spacing

Tailwind's default spacing scale (`p-1` = 4px, `p-2` = 8px, …). Widgets like `stack-layout` and `grid-layout` use this directly via their `gap` prop.

⚠️ The `gap` token in `stack-layout` and `grid-layout` is constrained to integers 1–8. Non-integer or larger values silently fail (no class generated). If you need 12 or 16, use `className` override.

---

## Animations

The framework uses Tailwind's animation utilities + `tailwindcss-animate`:

- `animate-in fade-in slide-in-from-bottom-2 duration-300` — common entrance animation on widget mount.
- `animate-pulse` — loading skeletons.

Use these sparingly — too much movement is fatiguing. Most widgets ship with one entrance animation; don't stack more.

---

## Dark mode

Dark mode flips a class on `<html>` (`<html class="dark">`). Tokens in the `.dark` block override the root tokens.

The current setup persists the user's preference via the standard `next-themes` pattern (look for `<ThemeProvider>` in the provider stack).

⚠️ Don't hardcode hex colours in widgets — they won't flip. Use tokens (`bg-card`, `text-foreground`, etc.).

---

## Adding a new visual primitive

You almost never need to. The primitives in `src/components/ui/*` cover the standard cases (Button, Card, Badge, Tooltip, Input, Label, Select, etc.). When you think you need a new one, ask:

1. **Is this a new widget, not a primitive?** Most needs are at the widget layer.
2. **Can I extend an existing primitive's variants?** Add a `teal` variant instead of a `TealCard`.
3. **Is this from a shadcn/ui component we haven't installed yet?** Run `npx shadcn-ui@latest add <component>` and check it into `src/components/ui/`.

If none of these fit, file a proposal — see [the proposal flow](../../proposals/).

---

## Customising for a Figma / brand reference

To match a specific visual reference (a Figma file, another site), the canonical approach:

1. **Extract tokens.** Colours → CSS custom properties in `globals.css`. Radii → `--radius`. Typography → `@theme` scale.
2. **Adjust variants.** Button hover states, badge colours — these go in `src/components/ui/variants/`.
3. **Don't touch widgets.** Widget structure (layout, behaviour) stays the same; only the atoms change.

The [`design-system` skill](../../.claude/skills/design-system/SKILL.md) automates parts of this — point it at a reference and it'll propose token diffs.

---

## Common mistakes

1. **Hardcoding hex colours in widget JSX.** Always use tokens (`bg-primary`) so dark mode flips and brand changes propagate.

2. **Inventing new variant names.** `variant: "tealOutline"` doesn't exist unless you add it. If the schema uses an unknown variant, CVA falls back to defaults silently — your "teal" button just looks default.

3. **Overriding tokens inline.** `<div style={{ background: "#ff0000" }}>` works but breaks theming. Use the token system.

4. **New icon name typos.** Lucide names are case-sensitive (`"FileText"`, not `"filetext"`). Confirm via [lucide.dev/icons](https://lucide.dev/icons).

5. **Spacing math.** Don't reach for `pt-[13px]`. The token scale is 4px-step; use what's there. If 13px is genuinely the right answer, the spec is probably wrong.

6. **Adding a custom Tailwind plugin for one feature.** It bloats the bundle and complicates the build. Default Tailwind + the existing variants almost always cover real needs.

---

**Next:** [11-cookbook.md](11-cookbook.md) — step-by-step recipes.
