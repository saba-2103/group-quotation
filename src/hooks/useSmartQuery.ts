import { useQuery } from '@tanstack/react-query';
import { DataSourceConfig } from '@/types/widget';
import { useWidgetState } from './useWidgetState';
import { evaluateCondition } from '@/lib/conditions';

export function useSmartQuery(dataSource?: DataSourceConfig) {
    const { api, valueKey, refreshInterval, stopWhen, stateDependencies } = dataSource || {};
    const { values } = useWidgetState();

    // Extract relevant state for dependencies
    const dependentState = stateDependencies?.reduce((acc, key) => {
        acc[key] = values[key];
        return acc;
    }, {} as Record<string, any>) || {};

    return useQuery({
        queryKey: api ? [api.endpoint, api.method, api.params, dependentState] : ['no-api'],
        queryFn: async () => {
            if (!api) return null;

            // Build URL with state parameters if it's a GET request
            let url = api.endpoint;
            const allParams = { ...api.params, ...dependentState };

            if (api.method === 'GET' && Object.keys(allParams).length > 0) {
                const searchParams = new URLSearchParams();
                Object.entries(allParams).forEach(([key, val]) => {
                    if (val !== undefined && val !== null && val !== '') {
                        if (typeof val === 'object') {
                            // If it's an object (like filters), spread it
                            Object.entries(val).forEach(([innerKey, innerVal]) => {
                                if (innerVal !== undefined && innerVal !== null && innerVal !== '') {
                                    searchParams.append(innerKey, String(innerVal));
                                }
                            });
                        } else {
                            searchParams.append(key, String(val));
                        }
                    }
                });
                const queryString = searchParams.toString();
                if (queryString) {
                    url += (url.includes('?') ? '&' : '?') + queryString;
                }
            }

      const res = await fetch(url, {
                method: api.method,
                body: api.method !== 'GET' ? JSON.stringify(allParams) : undefined,
                headers: {
                    'Content-Type': 'application/json'
                }
            });
            if (!res.ok) {
                throw new Error(`Failed to fetch: ${res.statusText}`);
            }
      const jsonData = await res.json();

      // If valueKey is specified, extract that nested property
      if (valueKey && jsonData && typeof jsonData === "object") {
        return (jsonData as Record<string, any>)[valueKey] ?? jsonData;
      }

      return jsonData;
    },
        // Function form so we can stop polling once `stopWhen` is satisfied
        // by the latest response (e.g. wait for an async backend computation
        // such as RequestQuotePrice to populate `premium`). Falls back to the
        // plain interval when no stopWhen is given. Returns false to stop.
        refetchInterval: !refreshInterval ? false : (query) => {
            if (!stopWhen) return refreshInterval;
            const data = query.state.data;
            if (data && evaluateCondition(stopWhen, data)) return false;
            return refreshInterval;
        },
        enabled: !!api,
    });
}