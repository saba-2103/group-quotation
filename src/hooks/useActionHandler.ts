"use client";

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { ActionConfig } from '@/types/widget';
import { useRouter } from 'next/navigation';
import { useOverlayStore } from '@/hooks/useOverlayStore';

export const useActionHandler = () => {
    const router = useRouter();
    const queryClient = useQueryClient();
    const { open } = useOverlayStore();

    const { mutateAsync } = useMutation({
        mutationFn: async (action: ActionConfig) => {
            if (action.type !== 'api-mutation' || !action.api) return;
            const res = await fetch(action.api.endpoint, {
                method: action.api.method,
                body: JSON.stringify(action.api.body),
                headers: {
                    'Content-Type': 'application/json'
                }
            });
            if (!res.ok) {
                throw new Error(`Action failed: ${res.statusText}`);
            }
            return res.json();
        }
    });

    return async (action: ActionConfig) => {
        switch (action.type) {
            case 'navigate':
                if (action.target) router.push(action.target);
                break;
            case 'api-mutation':
                if (action.api) {
                    if (action.confirm) {
                        // For API Mutations with confirmations, we will pop a confirmation dialog first
                        // which then executes this mutation upon approval.
                        open(`confirm-${action.id}`, "dialog", action);
                        return;
                    }
                    await mutateAsync(action);
                    if (action.successMessage) {
                        console.log("Success Toast:", action.successMessage); // Placeholder for toast
                    }
                    if (action.refreshKey) {
                        queryClient.invalidateQueries({ queryKey: [action.refreshKey] });
                    }
                }
                break;
            case 'open-modal':
                if (action.target) open(action.target, "modal");
                break;
            case 'open-sheet':
                if (action.target) open(action.target, "sheet");
                break;
            case 'trigger-event':
                console.log('Trigger Event:', action.target);
                break;
        }
    };
};
