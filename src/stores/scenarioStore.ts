import { create } from 'zustand';

export interface ScenarioSnapshot {
  id: string;
  name: string;
  note: string;
  rfqId: string;
  capturedAt: string;
}

interface ScenarioState {
  snapshots: ScenarioSnapshot[];
  add: (s: Omit<ScenarioSnapshot, 'id'>) => void;
  remove: (id: string) => void;
}

function localId() {
  return `snap-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
}

export const useScenarioStore = create<ScenarioState>((set) => ({
  snapshots: [],
  add: (s) => set((state) => ({ snapshots: [...state.snapshots, { ...s, id: localId() }] })),
  remove: (id) => set((state) => ({ snapshots: state.snapshots.filter((s) => s.id !== id) })),
}));
