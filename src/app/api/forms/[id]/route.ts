import { NextResponse } from 'next/server';
import { forms_registry } from '../../../../../schemas/forms';

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
    try {
        const { id } = await context.params;

        // Lookup form from static registry so it's guaranteed bundled in edge runtime
        const schema = forms_registry[id];

        if (schema) {
            return NextResponse.json(schema);
        } else {
            // Fallback to dummy member form if the specific form ID isn't registered
            const fallbackSchema = forms_registry['dummy-member-form'];
            return NextResponse.json(fallbackSchema);
        }
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
