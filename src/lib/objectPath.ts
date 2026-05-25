// Shared dotted-path traversal used by useDataTable, KeyValueGrid, CardGrid,
// PollingBanner, and anywhere else schemas reach into a nested response.
//
// Prototype-pollution-safe: rejects `__proto__` / `constructor` / `prototype`
// segments and uses `hasOwnProperty` so inherited members can't be reached.

const FORBIDDEN_KEYS = new Set(["__proto__", "constructor", "prototype"]);

/**
 * Walk a dotted accessor path (e.g. "estimatedPremium.byPlanJson",
 * "claimants.0.name") into a value. Returns `undefined` if any segment is
 * missing or unsafe; returns the source unchanged if `path` is empty.
 */
export function getNested(source: unknown, path?: string): unknown {
  if (source == null || !path) return source;
  return path.split(".").reduce<unknown>((acc, key) => {
    if (FORBIDDEN_KEYS.has(key)) return undefined;
    if (acc == null || typeof acc !== "object") return undefined;
    return Object.prototype.hasOwnProperty.call(acc, key)
      ? (acc as Record<string, unknown>)[key]
      : undefined;
  }, source);
}

/**
 * Write `value` into `target` along a dotted path, mirroring `getNested`
 * semantics so a write followed by a read round-trips. Intermediate plain
 * objects are created as needed; existing non-object intermediates are
 * overwritten. Forbidden segments (`__proto__`, `constructor`, `prototype`)
 * are skipped to keep this prototype-pollution-safe.
 */
export function setNested(
  target: Record<string, unknown>,
  path: string,
  value: unknown,
): void {
  if (!path) return;
  const segments = path.split(".");
  let cursor: Record<string, unknown> = target;
  for (let i = 0; i < segments.length - 1; i++) {
    const key = segments[i];
    if (FORBIDDEN_KEYS.has(key)) return;
    const next = cursor[key];
    if (next == null || typeof next !== "object") {
      cursor[key] = {};
    }
    cursor = cursor[key] as Record<string, unknown>;
  }
  const leaf = segments[segments.length - 1];
  if (FORBIDDEN_KEYS.has(leaf)) return;
  cursor[leaf] = value;
}
