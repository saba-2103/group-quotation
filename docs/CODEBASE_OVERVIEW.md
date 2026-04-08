# Keystone UI — Codebase Overview

**Version**: 0.1.0
**Framework**: Next.js 16 + React 19
**Deployment**: Cloudflare Workers via OpenNextJS

---

## What Is This?

Keystone UI is a **schema-driven portal framework** — a runtime that converts JSON configuration into fully functional pages, tables, forms, and dashboards. The core idea is that business logic and UI layout are expressed as data (JSON schemas) rather than code. You can build an entire multi-page insurance or claims management portal by writing JSON and API endpoints, with no custom React code required.

---

## Directory Structure

```
/
├── src/
│   ├── app/                    # Next.js App Router pages + API routes
│   │   ├── layout.tsx          # Root layout: sidebar, providers, context
│   │   ├── page.tsx            # Home/landing page
│   │   ├── test-dashboard/     # Dashboard demo page
│   │   ├── quotations/         # Quotation list + detail pages
│   │   ├── claims/             # Claims list page
│   │   ├── accounting/
│   │   ├── payout/
│   │   └── api/                # Next.js route handlers
│   │       ├── config/app/     # Returns AppConfig by appId
│   │       ├── forms/[id]/     # Serves form JSON schemas
│   │       └── dashboard/      # KPI metric endpoints
│   │
│   ├── components/
│   │   ├── AppSidebar.tsx      # Dynamic nav sidebar from AppConfig
│   │   ├── providers.tsx       # React Query + Overlay providers root
│   │   ├── providers/
│   │   │   ├── AppContextProvider.tsx   # App config context + loader
│   │   │   └── OverlayProvider.tsx      # Modal/sheet/dialog manager
│   │   ├── ui/                 # 17 Shadcn/Radix UI primitives
│   │   ├── widgets/            # Schema-driven business components
│   │   └── registry/           # Widget type → component map + renderer
│   │
│   ├── hooks/                  # Custom React hooks
│   ├── lib/                    # Utility functions
│   ├── types/                  # TypeScript interfaces (widget config, actions)
│   ├── shared/                 # Cross-cutting types (AppConfig, Navigation)
│   ├── mocks/original/         # Mock app configs + seed data for dev
│   ├── tests/                  # Unit + schema tests
│   └── stories/                # Storybook component stories
│
├── schemas/                    # JSON page/form/tab configs (70+ files)
│   ├── dashboard.json
│   ├── quotations.json
│   ├── forms/                  # 47+ form schemas
│   └── tabs/                   # 24+ tab schemas
│
├── scripts/
│   └── generate_form_index.mjs  # Pre-build: auto-generates form registry
│
└── docs/                       # Project documentation
```

---

## Core Architecture: Schema-Driven Rendering

The entire rendering pipeline flows from JSON → Widget → DOM.

### 1. AppConfig (startup)

On mount, `AppContextProvider` fetches `/api/config/app?appId=group-insurance`. This returns an `AppConfig` object that drives the sidebar navigation, app title, and logo. Two configs are pre-built: `groupInsuranceAppConfig` and `autoClaimsAppConfig`.

### 2. Page Schema

Each page (e.g. `/quotations`) imports a JSON schema from `/schemas/` and passes it to `<WidgetRenderer config={schema}>`. The schema is a tree of `WidgetConfig` nodes.

```typescript
interface WidgetConfig {
  id: string;
  type: WidgetType;          // 'data-table', 'stack-layout', 'metric-card', ...
  props?: Record<string, any>;
  layout?: { colSpan?: number; hidden?: boolean };
  dataSource?: DataSourceConfig;
  children?: WidgetConfig[];
}
```

### 3. WidgetRenderer

`WidgetRenderer` is the recursive engine at the center of the framework:

1. Looks up `config.type` in `WidgetRegistry` to get the React component
2. If `config.dataSource` is present, calls `useSmartQuery` to fetch data
3. Injects the fetched data, loading state, and action handler into the component's props
4. Renders children recursively

### 4. WidgetRegistry

A plain object map from type string to component:

```typescript
const WidgetRegistry = {
  'stack-layout': StackLayout,
  'grid-layout': GridLayout,
  'section-group': SectionGroup,
  'data-table': DataTable,
  'metric-card': MetricCard,
  'form-container': FormContainer,
  // ...
};
```

---

## Widget Catalog

### Layout Widgets

| Type | Component | Purpose |
|------|-----------|---------|
| `stack-layout` | `StackLayout` | Flex container (direction, gap, align, justify) |
| `grid-layout` | `GridLayout` | CSS grid with configurable columns |
| `section-group` | `SectionGroup` | Titled section with multi-column child grid |
| `page-header` | `PageHeader` | Page title + description + header action buttons |

### Data Widgets

| Type | Component | Purpose |
|------|-----------|---------|
| `data-table` | `DataTable` | Full-featured table with selection, pagination, row actions, bulk actions, export |
| `key-value-grid` | `KeyValueGrid` | Label-value summary grid (detail view) |
| `metric-card` | `MetricCard` | KPI card with value, trend, label, and format |
| `chart-widget` | `ChartWidget` | Placeholder chart component |

### Control Widgets

| Type | Component | Purpose |
|------|-----------|---------|
| `filter-bar` | `FilterBar` | Search input + multi-select filter chips |
| `action-button` | `ActionButton` | Button/icon/menu-item display modes |
| `quick-links` | `QuickLinksWidget` | Grid of link cards or buttons |

### Container Widgets

| Type | Component | Purpose |
|------|-----------|---------|
| `tabs-container` | `TabsContainer` | Tabbed panel — overflow tabs collapse into dropdown |

### Form Widgets

| Type | Component | Purpose |
|------|-----------|---------|
| `form-container` | `FormContainer` | Dynamic form builder with Zod validation + field visibility conditions |
| `overlaid-form` | `OverlaidForm` | `FormContainer` rendered inside a modal or sheet |
| `confirmation-dialog` | `ConfirmationDialog` | Confirmation step before a destructive API action |

---

## Action System

All user interactions are funnelled through `useActionHandler()`. Components never call APIs or navigate directly — they fire typed action configs.

```typescript
type ActionConfig =
  | { type: 'navigate'; target: string }
  | { type: 'api-mutation'; api: ApiConfig; successMessage?: string; confirm?: ConfirmConfig }
  | { type: 'open-modal'; target: string }
  | { type: 'open-sheet'; target: string }
  | { type: 'api-download'; api: ApiConfig; filename?: string }
  | { type: 'update-widget-state'; props: { key: string; value: any; mode: 'set'|'patch'|'toggle' } }
```

`useActionHandler` handles:
- Navigation via Next.js router
- `fetch()` calls with optional confirmation dialog
- Opening/closing overlays (modal, sheet)
- Updating Zustand widget state
- Invalidating React Query caches after mutations

---

## State Management

### Server State — React Query

`useSmartQuery` wraps `useQuery` from `@tanstack/react-query`. It:
- Watches widget state keys listed in `dataSource.stateDependencies`
- Automatically builds query parameters from current state values
- Supports GET (URL params) and POST (request body) methods
- Caches results with a 60-second stale time

### Client State — Zustand

Two stores:

**`useWidgetState`** — Global key-value store for inter-widget communication (filter values, selected IDs, etc.)

```typescript
const { getValue, setValue, patchValue } = useWidgetState();
setValue('quotationsFilter', { status: 'pending' });
```

**`useOverlayStore`** — Tracks open modals and sheets

```typescript
const { open, close } = useOverlayStore();
open('create-quotation-modal', { formId: 'create-quotation' });
```

### App Config State — React Context

`AppContextProvider` holds the current `AppConfig` and exposes it via `useAppContext()`. It fetches config once at startup and re-fetches when `appId` changes.

### Form State — React Hook Form + Zod

`FormContainer` uses `react-hook-form` for field state and `@hookform/resolvers/zod` to wire Zod schemas as validators. Field visibility is evaluated per-render using `evaluateCondition()` from `src/lib/conditions.ts`.

---

## Data Flow (End to End)

```
[JSON Schema]
      ↓
WidgetRenderer (recursively renders tree)
      ↓
useSmartQuery (fetches from /api/* based on dataSource config)
      ↓
Widget Component receives { data, isLoading, error }
      ↓
User interaction (button click, filter change, form submit)
      ↓
useActionHandler dispatches ActionConfig
      ↓
┌─ navigate → Next.js router.push()
├─ api-mutation → fetch() → invalidateQueries()
├─ open-modal/sheet → useOverlayStore.open()
└─ update-widget-state → useWidgetState.setValue()
      ↓
useSmartQuery re-runs (state dep changed or cache invalidated)
      ↓
Widget re-renders with fresh data
```

---

## UI Component Library

17 primitive components in `src/components/ui/`, built on Radix UI headless primitives + styled with Tailwind + CVA variants.

| Component | Radix Primitive | Notes |
|-----------|----------------|-------|
| `Button` | — | Variants: default/destructive/outline/secondary/ghost/link. Sizes: xs/sm/default/lg/icon |
| `Input` | — | Standard text input |
| `Textarea` | — | Multi-line input |
| `Select` | `@radix-ui/react-select` | Accessible dropdown |
| `Dialog` | `@radix-ui/react-dialog` | Centered modal |
| `Sheet` | `@radix-ui/react-dialog` | Side drawer |
| `Tabs` | `@radix-ui/react-tabs` | Tab switcher |
| `DropdownMenu` | `@radix-ui/react-dropdown-menu` | Context/action menu |
| `Table` | — | Semantic `<table>` wrapper |
| `Badge` | — | Inline status chip |
| `Card` | — | Container with border + shadow |
| `Label` | `@radix-ui/react-label` | Accessible form label |
| `Form` / `FormField` / `FormItem` / `FormControl` / `FormMessage` | — | react-hook-form wrappers |
| `Tooltip` | `@radix-ui/react-tooltip` | Hover tooltip |
| `Separator` | `@radix-ui/react-separator` | Divider line |
| `Skeleton` | — | Loading placeholder |
| `Sidebar` | — | Collapsible sidebar layout shell |

All use `cn()` from `src/lib/utils.ts` (tailwind-merge + clsx) for class composition.

---

## Form Schema System

Forms are defined as JSON in `/schemas/forms/`. The pre-build script `scripts/generate_form_index.mjs` scans this directory and generates a registry that maps form IDs to their schema files. The `/api/forms/[id]` route serves them at runtime.

A form schema looks like:

```json
{
  "id": "create-quotation",
  "title": "Create Quotation",
  "fields": [
    { "name": "memberId", "label": "Member ID", "type": "text", "required": true },
    { "name": "planType", "label": "Plan Type", "type": "select", "options": [...] },
    {
      "name": "notes",
      "label": "Notes",
      "type": "textarea",
      "condition": { "field": "planType", "operator": "neq", "value": "basic" }
    }
  ],
  "submitAction": {
    "type": "api-mutation",
    "api": { "endpoint": "/api/quotations", "method": "POST" }
  }
}
```

Supported field types: `text`, `email`, `number`, `select`, `textarea`, `date`, `checkbox`.

Supported condition operators: `eq`, `neq`, `gt`, `lt`, `gte`, `lte`, `in`, `notIn`.

---

## Multi-Tenant Support

The same codebase serves multiple product configs. Switching is done via the `appId` query param:

- `?appId=group-insurance` → Group insurance portal (default)
- `?appId=auto-claims` → Auto claims portal

Each config defines its own navigation, sidebar type (`NESTED` | `UNGROUPED`), logo, and title. Configs live in `src/mocks/original/`.

---

## Testing

```
src/tests/
├── unit/
│   ├── form/FormContainer.unit.test.tsx     # Form rendering, validation, submit
│   └── table/
│       ├── DataTable.unit.test.tsx           # Selection, pagination, row actions
│       └── FilterBar.unit.test.tsx           # Filter state + UI
└── schemas/
    ├── CreateQuotationForm.test.tsx          # Schema-driven form integration
    └── QuotationListTable.test.tsx           # Schema-driven table integration
```

**Jest** (unit + schema tests): `ts-jest`, jsdom, Next.js router mocked, Radix UI polyfills.
**Vitest** (visual tests): Storybook integration, Playwright-backed browser testing.
**Storybook** (component explorer): `@storybook/nextjs-vite` on port 6006, with a11y + Vitest addons.

Run tests:

```bash
yarn test            # All Jest tests
yarn test:unit       # Unit tests only
yarn test:schemas    # Schema integration tests
yarn storybook       # Component explorer
```

---

## Build & Deployment

```bash
yarn dev             # Next.js dev server (auto-generates form index first)
yarn build           # Production build
yarn deploy          # Build + deploy to Cloudflare Workers
yarn preview         # Local Cloudflare runtime preview
```

The pre-build step (`scripts/generate_form_index.mjs`) always runs before `dev` and `build` to keep the form registry in sync with `/schemas/forms/`.

Cloudflare Workers deployment is handled by `@opennextjs/cloudflare`. Config files: `wrangler.jsonc` and `open-next.config.ts`.

---

## Key Dependencies

| Package | Version | Role |
|---------|---------|------|
| `next` | 16.1.5 | React framework + App Router + API routes |
| `react` | 19.1.5 | UI library |
| `@tanstack/react-query` | 5.90.x | Server state, caching, refetching |
| `zustand` | 5.0.x | Lightweight client state |
| `react-hook-form` | 7.71.x | Form state management |
| `zod` | 4.3.x | Schema validation |
| `tailwindcss` | 4 | Utility CSS |
| `@radix-ui/*` | 1.4.x | Headless accessible UI primitives |
| `class-variance-authority` | 0.7.x | Component variant styling |
| `lucide-react` | 0.575.x | Icon set |
| `@opennextjs/cloudflare` | 1.15.x | Cloudflare deployment adapter |

---

## Adding a New Page

1. Create a JSON schema in `/schemas/my-page.json` with a tree of `WidgetConfig` nodes.
2. Add a Next.js page at `/src/app/my-page/page.tsx` that imports the schema and renders `<WidgetRenderer config={schema} />`.
3. Add a menu item in the relevant app config in `src/mocks/original/`.
4. Create any needed API routes under `src/app/api/`.

No new component code is needed unless the page requires a widget type not yet in the registry.

---

## Adding a New Widget

1. Create the component in `src/components/widgets/<category>/MyWidget.tsx`.
2. Define the expected props — data comes in via the `data` prop injected by `WidgetRenderer`.
3. Register it in `src/components/registry/WidgetRegistry.tsx` with a type string.
4. Use the type string in any page schema.
