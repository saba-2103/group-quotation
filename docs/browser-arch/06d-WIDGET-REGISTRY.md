# Layer 6d — Widget Registry

**Keystone UI Architecture | Browser-Based, No BFF**

Parent: [06 — Client Runtime](./06-CLIENT-RUNTIME.md)

This document covers the widget registry contract: how widgets are registered, how `WidgetRenderer` resolves them, how components declare their prop contracts, and how breaking changes to those contracts are versioned.

The registry makes no distinction between widget types. Any React component that satisfies a prop contract can be registered and used from a schema. What a component renders internally is out of scope for this document.

---

## Table of Contents

1. [Registry API](#registry-api)
2. [Declaring a Prop Contract](#declaring-a-prop-contract)
3. [Registering Widgets at Startup](#registering-widgets-at-startup)
4. [How WidgetRenderer Uses the Registry](#how-widgetrenderer-uses-the-registry)
5. [Contract Versioning](#contract-versioning)
6. [Contract Testing](#contract-testing)

---

## Registry API

`WidgetRegistry` is a module-level singleton. It maps widget type strings (as they appear in schema JSON) to React components with a version.

```typescript
// src/runtime/WidgetRegistry.ts

import React from 'react';

type WidgetComponent = React.ComponentType<any>;

interface RegistryEntry {
  component: WidgetComponent;
  contractVersion: number;
}

type RegistryMap = Map<string, Map<number, RegistryEntry>>;

class WidgetRegistryClass {
  private registry: RegistryMap = new Map();

  /**
   * Register a widget component.
   *
   * @param type            Widget type string — must match the `type` field in schema JSON.
   * @param component       The React component.
   * @param contractVersion The prop contract version this component satisfies.
   *                        Defaults to 1. Increment only on breaking prop changes.
   *
   * @example
   * WidgetRegistry.register('DataTable', DataTableWidget, 1);
   * WidgetRegistry.register('DataTable', DataTableWidgetV2, 2); // both coexist during migration
   */
  register(type: string, component: WidgetComponent, contractVersion: number = 1): void {
    if (!this.registry.has(type)) {
      this.registry.set(type, new Map());
    }
    const versions = this.registry.get(type)!;
    if (versions.has(contractVersion)) {
      console.warn(
        `[WidgetRegistry] Overwriting "${type}" v${contractVersion}. ` +
        'Expected only during HMR in development.'
      );
    }
    versions.set(contractVersion, { component, contractVersion });
  }

  /**
   * Resolve a widget component by type and version.
   *
   * @param type            Widget type string from schema.
   * @param contractVersion Schema contract version (defaults to 1).
   * @returns The React component, or null if not registered.
   */
  resolve(type: string, contractVersion: number = 1): WidgetComponent | null {
    const versions = this.registry.get(type);
    if (!versions) {
      console.error(
        `[WidgetRegistry] Type "${type}" is not registered. ` +
        'Check src/widgets/index.ts.'
      );
      return null;
    }
    const entry = versions.get(contractVersion);
    if (!entry) {
      console.error(
        `[WidgetRegistry] Type "${type}" v${contractVersion} not found. ` +
        `Registered versions: [${Array.from(versions.keys()).join(', ')}]`
      );
      return null;
    }
    return entry.component;
  }

  /**
   * List all registered types and their available versions.
   * Used for debugging and documentation tooling.
   */
  list(): Array<{ type: string; versions: number[] }> {
    return Array.from(this.registry.entries()).map(([type, versions]) => ({
      type,
      versions: Array.from(versions.keys()).sort(),
    }));
  }
}

export const WidgetRegistry = new WidgetRegistryClass();
```

---

## Declaring a Prop Contract

Every registered widget receives two props from `WidgetRenderer`:

```typescript
// src/widgets/shared/BaseWidgetProps.ts

export interface BaseWidgetProps {
  /** The widget instance id from the schema. Stable across renders. */
  widgetId: string;
  /** Widget-specific configuration from the resolved schema. */
  config: unknown; // narrowed by each widget's own interface
}
```

Each widget narrows `config` to its own typed interface. The interface is the contract. When the schema changes in a way that modifies what `config` contains, `contractVersion` must be incremented.

**Example — a summary card:**

```typescript
// src/widgets/SummaryCard/SummaryCard.types.ts

export interface SummaryCardConfig {
  title: string;
  dataSource: DataSourceConfig;
  fields: Array<{
    key: string;
    label: string;          // pre-resolved by Config System — no raw domain codes
    variant?: SemanticVariant;
  }>;
}

export interface SummaryCardProps extends BaseWidgetProps {
  config: SummaryCardConfig;
}
```

```typescript
// src/widgets/SummaryCard/SummaryCard.tsx

export function SummaryCardWidget({ widgetId, config }: SummaryCardProps) {
  const { data } = useSmartQuery(config.dataSource);
  // renders using resolved config.fields — never interprets domain codes directly
  return <Card title={config.title} fields={config.fields} data={data} />;
}
```

The component receives `config.fields[n].label` as a plain string, already resolved by the Config System before the schema reached the browser. The component is context-free.

---

## Registering Widgets at Startup

All widgets are registered at application startup in a single entry file. This keeps the registry auditable and controls bundle splitting.

```typescript
// src/widgets/index.ts

import { WidgetRegistry } from '../runtime/WidgetRegistry';
import { DataTableWidget }     from './DataTable/DataTable';
import { SummaryCardWidget }   from './SummaryCard/SummaryCard';
import { KPITileWidget }       from './KPITile/KPITile';
// ... all other widget imports

WidgetRegistry.register('DataTable',    DataTableWidget,    1);
WidgetRegistry.register('SummaryCard',  SummaryCardWidget,  1);
WidgetRegistry.register('KPITile',      KPITileWidget,      1);
// ... all other registrations
```

This file is the authoritative list of what the application can render. Any `type` string in a schema that does not appear here will log an error and render nothing (not crash).

---

## How WidgetRenderer Uses the Registry

```typescript
// src/runtime/WidgetRenderer.tsx (simplified)

export function WidgetRenderer({ widget }: { widget: WidgetSchema }) {
  // 1. Evaluate condition — skip render if condition fails
  const shouldRender = useWidgetCondition(widget.condition);
  if (!shouldRender) return null;

  // 2. Resolve component from registry
  const Component = WidgetRegistry.resolve(
    widget.type,
    widget.contractVersion ?? 1
  );
  if (!Component) {
    return <WidgetErrorBoundary type={widget.type} />;
  }

  // 3. Render — component owns its own data fetching
  return <Component widgetId={widget.id} config={widget.config} />;
}
```

Key invariants:
- `WidgetRenderer` evaluates conditions. Components do not.
- `WidgetRenderer` resolves the component. Components do not reference the registry.
- If a type is unregistered, `WidgetRenderer` renders a contained error boundary — not a page crash.

---

## Contract Versioning

The schema's `contractVersion` field tells the registry which version of a component to mount. This allows breaking prop changes without requiring all schemas to migrate simultaneously.

**When to increment `contractVersion`:**
- A required prop is added to `config`
- An existing prop is renamed or its type changes
- A prop is removed that some schemas may still provide

**When NOT to increment:**
- An optional prop is added (backwards-compatible addition)
- Internal component behaviour changes with no prop change
- A bug is fixed

**Migration window pattern:**

```typescript
// Both versions registered simultaneously during migration
WidgetRegistry.register('DataTable', DataTableWidgetV1, 1); // old schemas
WidgetRegistry.register('DataTable', DataTableWidgetV2, 2); // new schemas

// Once all schemas have been updated to contractVersion: 2:
// 1. Remove v1 registration
// 2. Remove DataTableWidgetV1 component
// 3. Schemas without contractVersion default to 1 — update them first
```

---

## Contract Testing

Every widget must have a contract test that verifies it renders correctly given a valid, conforming config.

**File location:** `src/widgets/{WidgetName}/{WidgetName}.contract.test.tsx`

**Pattern:**

```typescript
// src/widgets/SummaryCard/SummaryCard.contract.test.tsx

import { render, screen } from '@testing-library/react';
import { SummaryCardWidget } from './SummaryCard';
import { SummaryCardConfigSchema } from './SummaryCard.types';

const validConfig: SummaryCardConfig = {
  title: 'Policy Summary',
  dataSource: { endpoint: '/v1/policies/P-001', method: 'GET' },
  fields: [
    { key: 'status', label: 'Status', variant: 'success' },
    { key: 'premium', label: 'Annual Premium' },
  ],
};

describe('SummaryCard contract', () => {
  it('renders with a conforming config', () => {
    render(<SummaryCardWidget widgetId="test-widget" config={validConfig} />);
    expect(screen.getByText('Policy Summary')).toBeInTheDocument();
  });

  it('config shape matches the declared Zod schema', () => {
    // The Zod schema is the machine-readable version of the contract.
    // If this test fails, the TypeScript interface and Zod schema have diverged.
    expect(() => SummaryCardConfigSchema.parse(validConfig)).not.toThrow();
  });
});
```

The Zod schema for each widget's config (`{WidgetName}ConfigSchema`) is also used by `createApiClient` when the config is fetched as part of the resolved schema, making the contract enforceable at runtime, not just at test time.

---

*Last updated: 2026-04-08 | Architecture*
