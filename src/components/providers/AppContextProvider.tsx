"use client";

import React, { createContext, useContext, ReactNode } from "react";
import { useQuery, keepPreviousData } from "@tanstack/react-query";
import type { AppConfig } from "@shared/types";
import { Loader2 } from "lucide-react";
import { useRole } from "@/hooks/useRole";

interface AppContextType {
    config: AppConfig | null;
    appId: string;
    isLoading: boolean;
    error: Error | null;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export function AppContextProvider({
    children,
    defaultAppId = "group-insurance",
}: {
    children: ReactNode;
    defaultAppId?: string;
}) {
    const [appId] = React.useState(defaultAppId);
    // Role is part of the queryKey so the menu re-fetches (and React Query
    // caches per-role) when the user picks a different role in RoleSwitcher.
    // Matches the post-auth posture where the backend would filter the menu
    // off the JWT before sending it down. See PROP-0009.
    const { role } = useRole();

    const { data: config, isLoading, error } = useQuery({
        queryKey: ["appConfig", appId, role],
        queryFn: async () => {
            const res = await fetch(`/api/config/app?appId=${appId}&role=${role}`);
            if (!res.ok) {
                throw new Error("Failed to fetch application configuration");
            }
            return res.json() as Promise<AppConfig>;
        },
        staleTime: Infinity, // Configuration rarely changes during a session
        placeholderData: keepPreviousData, // keep previous role's config visible while new one loads
    });

    // Only block rendering on the very first load (no data at all yet).
    // On role-switch re-fetches, keepPreviousData keeps the old config visible
    // so the sidebar (and its role-switcher button) stays mounted.
    if (isLoading && !config) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-background">
                <div className="flex flex-col items-center gap-2 text-muted-foreground">
                    <Loader2 className="h-8 w-8 animate-spin" />
                    <p>Loading application...</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-background">
                <div className="text-destructive flex flex-col items-center gap-2">
                    <p className="font-semibold text-lg">Error loading configuration</p>
                    <p>{error.message}</p>
                </div>
            </div>
        );
    }

    return (
        <AppContext.Provider
            value={{
                config: config || null,
                appId,
                isLoading,
                error: error as Error | null,
            }}
        >
            {children}
        </AppContext.Provider>
    );
}

export function useAppContext() {
    const context = useContext(AppContext);
    if (context === undefined) {
        throw new Error("useAppContext must be used within an AppContextProvider");
    }
    return context;
}
