import { create } from 'zustand';

type OverlayType = "sheet" | "modal" | "dialog";

interface OverlayOptions {
    size?: string;
}

interface OverlayState {
    openOverlays: Record<string, { type: OverlayType, data?: any, options?: OverlayOptions }>;
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
