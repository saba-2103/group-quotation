"use client";

// Side-effect import: registers the Group PAS state/reason maps into the
// framework state-map registry at client boot, before any StateBadge /
// ReasonBanner / column cell renderer asks for them.
import '@/lib/state-maps/group-pas';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React, { useState } from 'react';
import { OverlayProvider } from './providers/OverlayProvider';
import { TenantConfigProvider } from '@/contexts/TenantConfigContext';

export function Providers({ children }: { children: React.ReactNode }) {
    const [queryClient] = useState(() => new QueryClient({
        defaultOptions: {
            queries: {
                staleTime: 60 * 1000,
            },
        },
    }));

    return (
        <TenantConfigProvider>
            <QueryClientProvider client={queryClient}>
                {children}
                <OverlayProvider />
            </QueryClientProvider>
        </TenantConfigProvider>
    );
}
