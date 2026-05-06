# Widget Contract v1

## Purpose

This document defines the contract every widget must implement to participate in the archV1 runtime.

A widget in archV1 is not a free-form React component. It is a contract-bound renderer that reads from the runtime graph, declares its bindings and emitted events through a stable schema, and operates within a defined lifecycle. Widgets are the only place where imperative code is permitted in the runtime — everything else is declarative.

## Widget Definition

A widget is registered with the runtime through a definition object:

```ts
interface WidgetDefinition<Props, Events> {
  type: string;
  schema: WidgetSchemaContract;
  component: WidgetComponent<Props, Events>;
  supportsMountOmission: boolean;
  defaultProps?: Partial<Props>;
}
```

The `type` field is the string used in schema authoring (`"TabPanel"`, `"DataTable"`). The `schema` declares what props the widget accepts and what events it emits. The `component` is the React or framework-equivalent implementation. The `supportsMountOmission` flag determines whether `mountWhen` is permitted on instances of this widget — widgets that hold external resources or animations may need to opt out of structural omission.

## Schema Contract

Each widget declares its accepted props and emitted events as a contract that the schema validator can consume:

```ts
interface WidgetSchemaContract {
  props: Record<string, PropContract>;
  events: Record<string, EventContract>;
}

interface PropContract {
  bindable: boolean;
  type: "string" | "number" | "boolean" | "object" | "array";
  required?: boolean;
}

interface EventContract {
  payload: PayloadShape;
}
```

The lint rules use this contract to validate schema usage of the widget. A binding to a non-bindable prop, a missing required prop, or a reference to an undeclared event is a hard lint error.

This contract is also what enables the `event.*` scope to be type-checked at lint time — the event payload shape comes from the widget's `EventContract`.

## Reading From The Graph

Widgets receive their props from the runtime through a single hook (or framework equivalent):

```ts
const { policyName, isLoading } = useWidgetGraph();
```

The hook subscribes to the graph paths declared in the widget's bindings and re-renders only when those specific paths change. It returns evaluated values — already-resolved bindings, already-applied transforms — not raw graph state.

Widgets must not call this hook for arbitrary paths. Only paths declared in the schema bindings are accessible. This keeps the graph subscription contract auditable and prevents widgets from secretly depending on graph state that the schema does not declare.

## Emitting Events

Widgets emit events through a single `emit` callback supplied by the runtime:

```ts
emit("rowSelect", { row: selectedRow });
```

The runtime maps the event name to whatever action the schema declared for that event. The widget does not know which action will run — it only declares that the event happened and supplies the payload.

This indirection is intentional. The same widget can be reused across schemas with completely different action pipelines bound to its events.

## Mount Lifecycle

When a widget's `mountWhen` condition flips from false to true, the runtime mounts a fresh instance. When it flips from true to false, the runtime unmounts the instance and discards its local state.

Widgets that hold long-running subscriptions or external resources (WebSocket connections, animation frames, timers) must clean up on unmount. The runtime provides framework-native cleanup hooks (React's `useEffect` cleanup function, for example) but does not provide additional cleanup beyond that.

When a widget remounts after being unmounted, it does not retain state from its previous mount. State that must persist across mount cycles belongs in the runtime graph, not in widget-local state. This is a hard rule — widgets that try to preserve their own state across unmount-remount cycles will introduce subtle bugs that are very hard to debug.

## Form Widget Subcontract

Widgets that participate in forms have additional requirements beyond the base contract.

### Controlled binding

Form widgets must be controlled. The widget reads its current value from a graph path through its bindings, and it emits a `change` event with the new value when the user interacts with it. The runtime is responsible for writing the new value back to the graph through a declared action pipeline.

Uncontrolled form widgets are not permitted. The graph must be the source of truth for form state at all times. This guarantees that workflow gating, validation, and review projections always see the same value the user sees.

### Validation surface

Form widgets must accept a `validationState` prop that the runtime populates with field-level validation results from the most recent mutation attempt. The widget renders the error state — typically as helper text below the input — but does not own the validation rules. Rules come from the schema or from the backend response envelope.

The validation state shape is:

```ts
interface ValidationState {
  status: "valid" | "invalid" | "pending";
  message?: string;
  code?: string;
}
```

## Accessibility Requirements

Every widget must meet baseline accessibility requirements before it can be published.

### Focus management

When a widget unmounts due to `mountWhen` flipping false, focus must not be lost silently. The runtime moves focus to the nearest stable ancestor when the currently focused element disappears. Widgets that manage their own focus must respect this contract — they should not steal focus during render or unmount in ways that conflict with the runtime's focus recovery.

### Screen reader announcements

State changes that are user-visible but not focus-changing — validation errors appearing inline, async data finishing loading, workflow steps becoming available — must emit ARIA live region announcements. The runtime provides an `announce` utility for this:

```ts
announce("Validation failed. Please check the highlighted fields.", "assertive");
```

Widgets do not implement live regions themselves. They use the runtime's announce utility so that announcements are routed through a single live region per page.

### Keyboard interaction

Every interactive widget must be operable using keyboard alone. The runtime does not enforce this at lint time, but the widget audit checklist requires keyboard testing before a widget is published.

### ARIA attributes

Widgets are responsible for their own ARIA roles, labels, and states. The runtime supplies `aria-disabled` automatically for widgets bound to forbidden actions (per the access policy described in doc 05). All other ARIA attributes are widget-implementation concerns.

## Widget Testing

Each widget must ship with a defined test suite before it can be registered:

1. **Unit test** — renders the widget with controlled props and asserts the rendered output.
2. **Interaction test** — triggers each declared event and asserts the emitted payload matches the contract.
3. **Graph integration test** — mounts the widget inside a mock runtime, drives a graph state change, and asserts the widget responds correctly.
4. **Accessibility test** — runs an automated a11y check (axe-core or equivalent) on the rendered output and verifies zero violations.

Widgets without these tests cannot be registered. The platform team enforces this at the registration step.

## Widget Registration

Widgets are registered with the runtime at app boot through a registry:

```ts
runtime.registerWidget(TabPanelDefinition);
runtime.registerWidget(DataTableDefinition);
runtime.registerWidget(StepperFormDefinition);
```

The registry validates each widget definition against the contract before accepting it:

- the `type` is unique within the registry
- the `schema` contract is structurally valid
- the `component` accepts the props declared in the contract
- a test manifest exists for the widget

A widget with an invalid contract fails registration loudly at boot. The runtime does not start with an unregistered or invalid widget definition.

## Widget Versioning

Widget versions follow the same semantic versioning rules as schemas (see doc 11). A widget that adds a new optional prop is a minor bump. A widget that removes a prop or changes a prop type is a major bump and requires a coordinated upgrade with all schemas that use it.

## Final Position

Widgets are the only imperative escape hatch in archV1. Because of that, the contract must be tight enough that widget authors cannot accidentally reintroduce the patterns archV1 is trying to eliminate — widget-owned fetching, ad hoc state, opaque event handling, untyped event payloads.

A widget that violates the contract must fail loudly at registration time or at lint time. Silent runtime failures from malformed widget contracts are not acceptable.
