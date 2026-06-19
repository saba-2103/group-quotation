import { create } from 'zustand';

type PlanTemplateVersion = 1 | 2 | 3;

interface PlanTemplateVersionState {
  version: PlanTemplateVersion;
  setVersion: (v: PlanTemplateVersion) => void;
}

/** Stores which summary-panel version is selected on /rfq2/plan-templates/new. */
export const usePlanTemplateVersion = create<PlanTemplateVersionState>((set) => ({
  version: 3, // always open on the latest version
  setVersion: (version) => set({ version }),
}));
