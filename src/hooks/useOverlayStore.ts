import { create } from 'zustand';

type OverlayType = "sheet" | "modal" | "dialog";

interface OverlayState {
    openOverlays: Record<string, { type: OverlayType, data?: any }>;
    open: (id: string, type: OverlayType, data?: any) => void;
    close: (id: string) => void;
    closeAll: () => void;
}

export const useOverlayStore = create<OverlayState>((set) => ({
    openOverlays: {},
    open: (id, type, data) => set((state) => ({
        openOverlays: {
            ...state.openOverlays,
            [id]: { type, data }
        }
    })),
    close: (id) => set((state) => {
        const next = { ...state.openOverlays };
        delete next[id];
        return { openOverlays: next };
    }),
    closeAll: () => set({ openOverlays: {} })
}));
