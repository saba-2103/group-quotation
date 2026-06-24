import { create } from 'zustand';

type PlanWizardVersion = 1 | 2;

interface PlanWizardVersionState {
  version: PlanWizardVersion;
  setVersion: (v: PlanWizardVersion) => void;
}

/** Stores which layout version is active on plan wizard pages (/rfqs/.../plans/new). */
export const usePlanWizardVersion = create<PlanWizardVersionState>((set) => ({
  version: 2,
  setVersion: (version) => set({ version }),
}));
