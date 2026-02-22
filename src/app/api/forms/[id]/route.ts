import { NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
    try {
        const { id } = await context.params;
        const schemaPath = path.join(process.cwd(), 'schemas', 'forms', `${id}.json`);

        try {
            const fileContents = await fs.readFile(schemaPath, 'utf8');
            const schema = JSON.parse(fileContents);
            return NextResponse.json(schema);
        } catch (e: any) {
            // If the specific form doesn't exist, we fall back to dummy-member-form as stub
            if (e.code === 'ENOENT') {
                const fallbackPath = path.join(process.cwd(), 'schemas', 'forms', 'dummy-member-form.json');
                const fallbackContents = await fs.readFile(fallbackPath, 'utf8');
                return NextResponse.json(JSON.parse(fallbackContents));
            }
            throw e;
        }
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
