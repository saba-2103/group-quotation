import { create } from 'zustand';
import type { OverlaySize } from '@/types/widget';

type OverlayType = "sheet" | "modal" | "dialog";

export interface OverlayOptions {
    /** Optional width override; consumed by `OverlayProvider`. */
    size?: OverlaySize;
}

interface OverlayEntry {
    type: OverlayType;
    data?: any;
    options?: OverlayOptions;
}

interface OverlayState {
    openOverlays: Record<string, OverlayEntry>;
    open: (id: string, type: OverlayType, data?: any, options?: OverlayOptions) => void;
    close: (id: string) => void;
    closeAll: () => void;
}

export const useOverlayStore = create<OverlayState>((set) => ({
    openOverlays: {},
    open: (id, type, data, options) => set((state) => ({
        openOverlays: {
            ...state.openOverlays,
            [id]: { type, data, options }
        }
    })),
    close: (id) => set((state) => {
        if (!(id in state.openOverlays)) return state;
        const next = { ...state.openOverlays };
        delete next[id];
        return { openOverlays: next };
    }),
    closeAll: () => set({ openOverlays: {} })
}));
