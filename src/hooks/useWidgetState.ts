import { create } from 'zustand';

interface WidgetState {
    values: Record<string, any>;
    setValue: (key: string, value: any) => void;
    patchValue: (key: string, value: any) => void;
    getValue: (key: string, defaultValue?: any) => any;
    resetKey: (key: string) => void;
    resetAll: () => void;
}

export const useWidgetState = create<WidgetState>((set, get) => ({
    values: {},

    setValue: (key, value) => set((state) => ({
        values: {
            ...state.values,
            [key]: value
        }
    })),

    patchValue: (key, value) => set((state) => {
        const currentValue = state.values[key] || {};
        const newValue = (typeof currentValue === 'object' && typeof value === 'object' && value !== null && currentValue !== null)
            ? { ...currentValue, ...value }
            : value;

        return {
            values: {
                ...state.values,
                [key]: newValue
            }
        };
    }),

    getValue: (key, defaultValue) => {
        const value = get().values[key];
        return value !== undefined ? value : defaultValue;
    },

    resetKey: (key) => set((state) => {
        const next = { ...state.values };
        delete next[key];
        return { values: next };
    }),

    resetAll: () => set({ values: {} })
}));
