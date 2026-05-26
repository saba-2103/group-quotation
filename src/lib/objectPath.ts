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
 * semantics so a write followed by a read round-trips. `null`/`undefined`
 * intermediates are replaced with a fresh plain object. Existing **scalar**
 * intermediates (number/string/boolean) are NOT overwritten — the write is
 * skipped and a warning logged, because silently bulldozing a real field
 * would corrupt other columns that read the same key. Forbidden segments
 * (`__proto__`, `constructor`, `prototype`) are skipped to keep this
 * prototype-pollution-safe.
 *
 * Returns `true` if the write succeeded, `false` if it was skipped (empty
 * path, forbidden segment, or scalar collision).
 */
export function setNested(
  target: Record<string, unknown>,
  path: string,
  value: unknown,
): boolean {
  if (!path) return false;
  const segments = path.split(".");
  let cursor: Record<string, unknown> = target;
  for (let i = 0; i < segments.length - 1; i++) {
    const key = segments[i];
    if (FORBIDDEN_KEYS.has(key)) return false;
    const next = cursor[key];
    if (next == null) {
      // Conventional "absent" — safe to create the sub-object.
      cursor[key] = {};
    } else if (typeof next !== "object") {
      // Scalar collision (e.g. row.amount === 42 and path is "amount.x").
      // Refuse to overwrite — bulldozing would corrupt any other column
      // reading the flat key. Log so the schema author sees it in dev.
      if (typeof console !== "undefined") {
        console.warn(
          `setNested: refusing to overwrite scalar at "${segments
            .slice(0, i + 1)
            .join(".")}" while writing path "${path}". ` +
            `The schema has a dotted accessorKey colliding with an existing ` +
            `flat field of the same prefix — rename the join target or the ` +
            `colliding field.`,
        );
      }
      return false;
    }
    cursor = cursor[key] as Record<string, unknown>;
  }
  const leaf = segments[segments.length - 1];
  if (FORBIDDEN_KEYS.has(leaf)) return false;
  cursor[leaf] = value;
  return true;
}
