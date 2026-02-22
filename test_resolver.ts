import { resolveSchemaRefs } from './src/lib/schemaResolver';

async function run() {
    const node = {
        "$ref": "schemas/forms/key-data-form.json"
    };

    try {
        const resolved = await resolveSchemaRefs(node);
        console.log("SUCCESS:", JSON.stringify(resolved, null, 2));
    } catch (err) {
        console.error("ERROR:", err);
    }
}

run();
