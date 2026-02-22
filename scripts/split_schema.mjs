import fs from 'fs/promises';
import path from 'path';

async function main() {
    const baseDir = process.cwd();
    const schemaPath = path.join(baseDir, 'schemas', 'quotations-detail.json');
    const tabsDir = path.join(baseDir, 'schemas', 'tabs');

    await fs.mkdir(tabsDir, { recursive: true });

    const content = await fs.readFile(schemaPath, 'utf-8');
    const schema = JSON.parse(content);

    let extractedCount = 0;

    // Traverse and find "quotation-tabs"
    function extractTabs(node) {
        if (!node || typeof node !== 'object') return;

        if (Array.isArray(node)) {
            for (let i = 0; i < node.length; i++) {
                extractTabs(node[i]);
            }
            return;
        }

        if (node.id === 'quotation-tabs-not-used' || node.type === 'tabs-container') {
            // We can extract its children into partials
            if (node.children && Array.isArray(node.children)) {
                for (let i = 0; i < node.children.length; i++) {
                    const tab = node.children[i];
                    if (tab && tab.id) {
                        const tabPath = path.join(tabsDir, `${tab.id}.json`);
                        // console.log(`Extracting tab ${tab.id} to ${tabPath}`);
                        fs.writeFile(tabPath, JSON.stringify(tab, null, 4)).then(() => { }).catch(console.error);
                        node.children[i] = {
                            $ref: `schemas/tabs/${tab.id}.json`
                        };
                        extractedCount++;
                    }
                }
            }
        }

        for (const key of Object.keys(node)) {
            if (key !== 'children') {
                extractTabs(node[key]);
            } else if (node.type !== 'tabs-container') {
                extractTabs(node[key]);
            }
        }
    }

    extractTabs(schema);

    console.log(`Extracted ${extractedCount} tabs into discrete JSON partials.`);

    await fs.writeFile(schemaPath, JSON.stringify(schema, null, 4));
    console.log('Updated schemas/quotations-detail.json with $ref pointers.');
}

main().catch(console.error);
