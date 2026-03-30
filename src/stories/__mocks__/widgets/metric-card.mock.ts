export const metricCardMocks = {
  configs: {
    revenue: {
      label: "Total Revenue",
      icon: "DollarSign",
      format: "currency" as const,
      showTrend: true,
      priority: 1,
      data: { value: 125000, trend: 12 },
    },

    policies: {
      label: "Active Policies",
      icon: "FileText",
      format: "number" as const,
      showTrend: true,
      priority: 2,
      data: { value: 450, trend: 8 },
    },

    claims: {
      label: "Pending Claims",
      icon: "AlertCircle",
      format: "number" as const,
      showTrend: true,
      priority: 2,
      data: { value: 23, trend: -5 },
    },

    conversion: {
      label: "Conversion Rate",
      icon: "TrendingUp",
      format: "percentage" as const,
      showTrend: false,
      priority: 3,
      data: { value: 68 },
    },

    loading: {
      label: "Loading Metric",
      icon: "Loader",
      format: "number" as const,
      showTrend: false,
      priority: 2,
      isLoading: true,
    },
  },
};
