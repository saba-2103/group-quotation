"use client";

import { useEffect, useState } from "react";

/**
 * Returns the platform modifier key label.
 * - macOS  → "⌘"
 * - Windows/Linux → "Ctrl"
 *
 * Defaults to "Ctrl" during SSR (no window object).
 */
export function useModKey(): string {
    const [mod, setMod] = useState("Ctrl");

    useEffect(() => {
        if (typeof navigator !== "undefined" && /Mac|iPhone|iPad|iPod/.test(navigator.platform)) {
            setMod("⌘");
        }
    }, []);

    return mod;
}
