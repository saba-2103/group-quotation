import { create } from 'zustand';
import type { HandoffTask } from '@/lib/types';
import { HandoffKind } from '@/lib/types';
import { getHandoffs, upsertHandoff, deleteHandoff } from '@/lib/api/quotation-client';

interface HandoffState {
  tasks: HandoffTask[];
  hydrated: boolean;
  /** RFQ IDs for which a PAS dispatch call failed — shown as alerts in OpsDashboard. */
  dispatchFailedRfqIds: string[];

  hydrate: () => Promise<void>;
  upsertTask: (task: HandoffTask) => void;
  removeTask: (taskId: string) => void;
  getTasksForRfq: (rfqId: string) => HandoffTask[];
  getTaskForPlan: (planId: string, kind: HandoffKind) => HandoffTask | undefined;
  markDispatchFailed: (rfqId: string) => void;
  clearDispatchFailed: (rfqId: string) => void;
}

export const useHandoffStore = create<HandoffState>((set, get) => ({
  tasks: [],
  hydrated: false,
  dispatchFailedRfqIds: [],

  hydrate: async () => {
    if (get().hydrated) return;
    try {
      const tasks = await getHandoffs();
      set({ tasks, hydrated: true });
    } catch {
      // Silently degrade — store stays empty; hydrated stays false so retry is possible
    }
  },

  upsertTask: (task) => {
    set((state) => {
      const idx = state.tasks.findIndex((t) => t.taskId === task.taskId);
      const tasks =
        idx >= 0
          ? state.tasks.map((t) => (t.taskId === task.taskId ? task : t))
          : [...state.tasks, task];
      return { tasks };
    });
    // Fire-and-forget sync to backend
    void upsertHandoff(task).catch(() => {});
  },

  removeTask: (taskId) => {
    set((state) => ({ tasks: state.tasks.filter((t) => t.taskId !== taskId) }));
    void deleteHandoff(taskId).catch(() => {});
  },

  getTasksForRfq: (rfqId) => get().tasks.filter((t) => t.rfqId === rfqId),

  getTaskForPlan: (planId, kind) =>
    get().tasks.find((t) => t.planId === planId && t.kind === kind),

  markDispatchFailed: (rfqId) =>
    set((state) => ({
      dispatchFailedRfqIds: state.dispatchFailedRfqIds.includes(rfqId)
        ? state.dispatchFailedRfqIds
        : [...state.dispatchFailedRfqIds, rfqId],
    })),

  clearDispatchFailed: (rfqId) =>
    set((state) => ({
      dispatchFailedRfqIds: state.dispatchFailedRfqIds.filter((id) => id !== rfqId),
    })),
}));
