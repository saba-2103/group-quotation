"use client";

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { ActionConfig } from '@/types/widget';
import { useRouter } from 'next/navigation';

export const useActionHandler = () => {
    const router = useRouter();
    const queryClient = useQueryClient();

    const { mutateAsync } = useMutation({
        mutationFn: async (action: ActionConfig) => {
            if (!action.api) return;
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
                    await mutateAsync(action);
                    if (action.refreshKey) {
                        queryClient.invalidateQueries({ queryKey: [action.refreshKey] });
                    }
                }
                break;
            case 'open-modal':
                // TODO: Implement Modal Store usage
                console.log('Open Modal:', action.target, action.props);
                break;
            case 'trigger-event':
                console.log('Trigger Event:', action.target);
                break;
        }
    };
};
