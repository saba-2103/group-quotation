import { forms_registry } from '../../schemas/forms';

/**
 * Recursively resolves `$ref` properties in a JSON schema/config object.
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
            // Webpack needs a strongly typed prefix to limit the bundle size
            if (node.$ref.startsWith('schemas/tabs/')) {
                const filename = node.$ref.replace('schemas/tabs/', '');
                // Using dynamic import allows the JSON to be bundled in the Cloudflare Worker
                const imported = await import(`../../schemas/tabs/${filename}`);
                parsed = imported.default || imported;
            } else if (node.$ref.startsWith('schemas/tables/')) {
                const filename = node.$ref.replace('schemas/tables/', '');
                const imported = await import(`../../schemas/tables/${filename}`);
                parsed = imported.default || imported;
            } else if (node.$ref.startsWith('schemas/views/')) {
                const filename = node.$ref.replace('schemas/views/', '');
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
