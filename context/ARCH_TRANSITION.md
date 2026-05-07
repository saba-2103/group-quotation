# Architecture Transition Notes

Interim patterns that are acceptable for V1 but are expected to simplify once a future architecture lands. Each entry should capture: what the interim contract is, what risk it carries, and what should simplify when the future architecture arrives.

## State-driven UI via per-schema `stateActions` map

**Interim contract (V1):**
Each list/detail schema that drives lifecycle UI carries a `stateActions: Record<State, ActionId[]>` block. The `ActionBar` widget consumes this to enable/disable actions per current entity state. Action labels and tooltips are also encoded in the schema.

**Risk:**
- The state→actions rules are duplicated between this map and any backend authorization layer (when one exists).
- When a lifecycle gains a new state, every schema that surfaces that entity needs an update.
- Missing-factor / focus-section hints are not modeled — only enable/disable.

**Future architecture (target):**
The PDF spec describes a backend-emitted `frontendProjection` per response: `{ state, allowedActions[], focusSections[], missingFactors[] }`. When backend starts emitting projections, `ActionBar` should accept a projection prop that overrides the schema-side `stateActions` map. Schemas become thinner; backend becomes the single source of truth for state-driven UI.

**Convergence trigger:** backend adds `frontendProjection` to any of the `Get*ByIdQuery` responses.

---

## Mock-first data layer

**Interim contract (V1):**
Mock fixtures under `src/mocks/group-pas/` and catch-all Next API routes under `src/app/api/{quotation,issuance,policy-admin}/[[...path]]/route.ts` serve all reads and echo all writes. Real backend access is gated by a `GROUP_PAS_BACKEND_URL` env var.

**Risk:**
- Fixtures may drift from real backend response shapes.
- Workflow-driven async transitions (price calc, classify, activate) are simulated with timing tricks; behaviour against real backend will differ.

**Future architecture (target):**
Once backend is live, the catch-all routes become thin proxies (or are removed in favour of direct calls from `src/lib/api/*`). Fixtures stay only for tests.

**Convergence trigger:** backend dev/staging endpoint available for any module; flip env var per-module.
