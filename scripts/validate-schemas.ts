import { z } from 'zod';
import fs from 'fs';
import path from 'path';

// Base schema for shared properties
const WidgetConfigSchema = z.object({
    id: z.string(),
    type: z.string(),
    props: z.record(z.string(), z.any()).optional(),
    layout: z.object({
        colSpan: z.number().optional(),
        hidden: z.boolean().optional(),
    }).optional(),
    dataSource: z.object({
        api: z.object({
            endpoint: z.string(),
            method: z.enum(["GET", "POST", "PUT", "DELETE"]),
            params: z.record(z.string(), z.any()).optional(),
        }).optional(),
        refreshInterval: z.number().optional(),
        valueKey: z.string().optional(),
    }).optional(),
    children: z.array(z.any()).optional(), // Simplified to avoid recursion issues
});

const schemasDir = path.join(process.cwd(), 'schemas');

if (!fs.existsSync(schemasDir)) {
    console.log('No schemas directory found.');
    process.exit(0);
}

const files = fs.readdirSync(schemasDir).filter(f => f.endsWith('.json'));

let hasError = false;

files.forEach(file => {
    const filePath = path.join(schemasDir, file);
    try {
        const content = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
        WidgetConfigSchema.parse(content);
        console.log(`✅ ${file} is valid.`);
    } catch (error) {
        console.error(`❌ ${file} is invalid:`, error);
        hasError = true;
    }
});

if (hasError) process.exit(1);
