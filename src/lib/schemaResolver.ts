import { forms_registry } from '../../schemas/forms';

// $ref filename may be a single .json file or a subdirectory-prefixed path
// (e.g. `accounting/periods.json`). Reject parent-traversal segments,
// backslashes, leading slashes, and anything that's not the expected
// JSON-config naming convention. Defends against future cases where user
// input could flow into `$ref`.
const SAFE_REF_TAIL = /^(?:[A-Za-z0-9_\-]+\/)*[A-Za-z0-9_\-]+\.json$/;
function assertSafeFilename(filename: string, ref: string): void {
    if (!SAFE_REF_TAIL.test(filename) || filename.includes('..')) {
        throw new Error(`Unsafe $ref filename: ${ref}`);
    }
}

/**
 * Recursively resolves `$ref` properties in a JSON schema/config object.
 *
 * Supported prefixes:
 *   - `schemas/tabs/<file>.json`   — per-module tab schemas
 *   - `schemas/tables/<file>.json` — shared table-column configs (used by some
 *                                    feature branches; safe to ship even if
 *                                    the directory is empty on main)
 *   - `schemas/views/<file>.json`  — shared view fragments
 *   - `schemas/forms/<id>(.json)?` — looked up in the bundled `forms_registry`
 *
 * @param node The current object node
 * @param baseDir The base directory to resolve relative paths from
 * @returns The resolved object
 */
export async function resolveSchemaRefs(node: any, baseDir: string = ''): Promise<any> {
    if (!node || typeof node !== 'object') {
        return node;
    }

    if (Array.isArray(node)) {
        return Promise.all(node.map(item => resolveSchemaRefs(item, baseDir)));
    }

    const resolvedNode: any = {};

    // If it's a ref object, resolve and replace
    if (node.$ref && typeof node.$ref === 'string') {
        try {
            let parsed;
            // Webpack needs a strongly typed prefix to limit the bundle size.
            // Schemas are author-controlled today, but if author-input ever
            // flows into `$ref`, the suffix is validated to avoid path-traversal.
            if (node.$ref.startsWith('schemas/tabs/')) {
                const filename = node.$ref.replace('schemas/tabs/', '');
                assertSafeFilename(filename, node.$ref);
                // Using dynamic import allows the JSON to be bundled in the Cloudflare Worker
                const imported = await import(`../../schemas/tabs/${filename}`);
                parsed = imported.default || imported;
            } else if (node.$ref.startsWith('schemas/tables/')) {
                const filename = node.$ref.replace('schemas/tables/', '');
                assertSafeFilename(filename, node.$ref);
                const imported = await import(`../../schemas/tables/${filename}`);
                parsed = imported.default || imported;
            } else if (node.$ref.startsWith('schemas/views/')) {
                const filename = node.$ref.replace('schemas/views/', '');
                assertSafeFilename(filename, node.$ref);
                const imported = await import(`../../schemas/views/${filename}`);
                parsed = imported.default || imported;
            } else if (node.$ref.startsWith('schemas/forms/')) {
                const formId = node.$ref.replace('schemas/forms/', '').replace('.json', '');
                const registryEntry = forms_registry[formId];
                if (registryEntry) {
                    parsed = registryEntry.type === 'form-container' && registryEntry.props
                        ? registryEntry.props
                        : registryEntry;
                } else {
                    throw new Error(`Form ${formId} not found in registry`);
                }
            } else {
                throw new Error(`Unsupported $ref path: ${node.$ref}`);
            }

            // Recursively resolve inside the parsed reference in case of nested refs
            const resolvedRef = await resolveSchemaRefs(parsed, baseDir);

            // Merge any other properties that might exist alongside $ref
            const { $ref, ...rest } = node;
            const resolvedRest = await resolveSchemaRefs(rest, baseDir);

            return {
                ...resolvedRef,
                ...resolvedRest
            };
        } catch (error: any) {
            console.error(`Failed to resolve $ref: ${node.$ref} from ${baseDir}`, error);
            // Fallback to returning the original node if it fails, but attach the error for debugging Next.js
            return {
                ...node,
                __error: error.message || String(error)
            };
        }
    }

    // Traverse all keys
    for (const [key, value] of Object.entries(node)) {
        resolvedNode[key] = await resolveSchemaRefs(value, baseDir);
    }

    return resolvedNode;
}
