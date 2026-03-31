import { DataSourceConfig } from '@/types/widget';

const buildDataSource = (endpoint: string): DataSourceConfig => ({
    api: { endpoint, method: 'GET' },
});

export const metricCardMocks = {
    configs: {
        revenue: {
            label: "Total Revenue",
            icon: "DollarSign",
            showTrend: true,
            priority: 1,
            trendUnit: "%",
        },
        policies: {
            label: "Active Policies",
            icon: "FileText",
            showTrend: true,
            priority: 2,
            trendUnit: "%",
        },
        claims: {
            label: "Pending Claims",
            icon: "AlertCircle",
            showTrend: true,
            priority: 2,
            trendUnit: "%",
        },
        conversion: {
            label: "Conversion Rate",
            icon: "TrendingUp",
            showTrend: false,
            priority: 3,
        },
        loading: {
            label: "Loading Metric",
            icon: "Loader",
            showTrend: false,
            priority: 2,
        },
    },
    dataSources: {
        revenue: buildDataSource('/api/quotations/metrics/total'),
        policies: buildDataSource('/api/quotations/metrics/approved'),
        claims: buildDataSource('/api/quotations/metrics/pending'),
        conversion: buildDataSource('/api/quotations/metrics/rejected'),
        loading: buildDataSource('/api/quotations/metrics/total'),
    },
    seedData: {
        '/api/quotations/metrics/total': { value: 248, trend: 15 },
        '/api/quotations/metrics/approved': { value: 142, trend: 22 },
        '/api/quotations/metrics/pending': { value: 67, trend: -3 },
        '/api/quotations/metrics/rejected': { value: 39, trend: -8 },
    },
};
