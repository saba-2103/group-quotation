import { useQuery } from '@tanstack/react-query';
import { DataSourceConfig } from '@/types/widget';

export function useSmartQuery(dataSource?: DataSourceConfig) {
    const { api, valueKey, refreshInterval } = dataSource || {};

    return useQuery({
        queryKey: api ? [api.endpoint, api.method, api.params] : ['no-api'],
        queryFn: async () => {
            if (!api) return null;
            // In a real app, use a configured fetch client or axios
            const res = await fetch(api.endpoint, {
                method: api.method,
                body: api.method !== 'GET' ? JSON.stringify(api.params) : undefined,
                headers: {
                    'Content-Type': 'application/json'
                }
            });
            if (!res.ok) {
                throw new Error(`Failed to fetch: ${res.statusText}`);
            }
            return res.json();
        },
        refetchInterval: refreshInterval,
        enabled: !!api,
        // initialData: valueKey ? getContextData(valueKey) : undefined // TODO: Implement Context Data retrieval
    });
}
