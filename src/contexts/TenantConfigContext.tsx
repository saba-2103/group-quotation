"use client";

import React, { createContext, useContext } from "react";

export type DateFormat = "DD/MM/YYYY" | "MM/DD/YYYY";

interface TenantConfig {
    dateFormat: DateFormat;
}

const TenantConfigContext = createContext<TenantConfig>({
    dateFormat: "DD/MM/YYYY",
});

export function TenantConfigProvider({
    children,
    dateFormat = "DD/MM/YYYY",
}: {
    children: React.ReactNode;
    dateFormat?: DateFormat;
}) {
    return (
        <TenantConfigContext.Provider value={{ dateFormat }}>
            {children}
        </TenantConfigContext.Provider>
    );
}

export function useTenantConfig(): TenantConfig {
    return useContext(TenantConfigContext);
}
