import fs from 'fs/promises';
import path from 'path';

async function main() {
    const formsDir = path.join(process.cwd(), 'schemas', 'forms');
    const files = await fs.readdir(formsDir);
    const jsonFiles = files.filter(f => f.endsWith('.json'));

    let exportsStr = 'export const forms_registry: Record<string, any> = {\n';

    for (const file of jsonFiles) {
        const id = file.replace('.json', '');
        const filePath = path.join(formsDir, file);
        const content = await fs.readFile(filePath, 'utf8');
        // Parse and stringify to ensure compact inline JSON
        const parsed = JSON.parse(content);
        exportsStr += `    '${id}': ${JSON.stringify(parsed)},\n`;
    }

    exportsStr += '};\n';

    await fs.writeFile(path.join(formsDir, 'index.ts'), exportsStr);
    console.log('Generated schemas/forms/index.ts registry with completely inlined JSON payloads');
}

main().catch(console.error);
