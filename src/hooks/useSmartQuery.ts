import { useQuery } from '@tanstack/react-query';
import { useSearchParams } from 'next/navigation';
import { DataSourceConfig } from '@/types/widget';

export function useSmartQuery(dataSource?: DataSourceConfig) {
    const { api, valueKey, refreshInterval } = dataSource || {};
    const searchParams = useSearchParams();
    const searchParamsString = searchParams.toString();

    const url = api
        ? api.method === 'GET' && searchParamsString
            ? `${api.endpoint}?${searchParamsString}`
            : api.endpoint
        : null;

    return useQuery({
        queryKey: api ? [api.endpoint, api.method, api.params, searchParamsString] : ['no-api'],
        queryFn: async () => {
            if (!api || !url) return null;
            const res = await fetch(url, {
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
