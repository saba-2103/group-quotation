"use client";

import { Suspense } from 'react';
import { WidgetRenderer } from '@/components/registry/WidgetRenderer';
import claimsSchema from '../../../schemas/claims-list.json';
import { WidgetConfig } from '@/types/widget';

export default function ClaimsListPage() {
    return (
        <div className="min-h-screen bg-background">
            <Suspense fallback={<div>Loading claims...</div>}>
                <WidgetRenderer config={claimsSchema as WidgetConfig} />
            </Suspense>
        </div>
    );
}
