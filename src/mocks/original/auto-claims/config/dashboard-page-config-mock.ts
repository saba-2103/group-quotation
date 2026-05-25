import type { DashboardPageConfig } from "@shared/types";

// ============================================
// Auto Claims Portal - Dashboard Page Config
// ============================================

export const dashboardPageConfig: DashboardPageConfig = {
  pageType: "dashboard",
  pageId: "dashboard",
  header: {
    title: "Dashboard",
    description: "Overview of claims and activities",
  },
  sections: [
    {
      id: "metrics",
      title: "Key Metrics",
      columns: 4,
      widgets: [
        {
          widgetType: "metric",
          id: "total-claims",
          label: "Total Claims",
          priority: 1,
          icon: "FileText",
          api: { endpoint: "/api/dashboard/metrics/total-claims", method: "GET" },
          valueField: "value",
          format: "number",
          showTrend: true,
          trendField: "trend",
          trendFormat: "percentage",
        },
        {
          widgetType: "metric",
          id: "pending-review",
          label: "Pending Review",
          priority: 2,
          icon: "Clock",
          api: { endpoint: "/api/dashboard/metrics/pending", method: "GET" },
          valueField: "value",
          format: "number",
        },
        {
          widgetType: "metric",
          id: "approved-claims",
          label: "Approved",
          priority: 2,
          icon: "CheckCircle",
          api: { endpoint: "/api/dashboard/metrics/approved", method: "GET" },
          valueField: "value",
          format: "number",
          showTrend: true,
          trendField: "trend",
          trendFormat: "percentage",
        },
        {
          widgetType: "metric",
          id: "total-amount",
          label: "Total Amount",
          priority: 2,
          icon: "DollarSign",
          api: { endpoint: "/api/dashboard/metrics/total-amount", method: "GET" },
          valueField: "value",
          format: "currency",
        },
        {
          widgetType: "metric",
          id: "rejected-claims",
          label: "Rejected",
          priority: 3,
          icon: "XCircle",
          api: { endpoint: "/api/dashboard/metrics/rejected", method: "GET" },
          valueField: "value",
          format: "number",
        },
        {
          widgetType: "metric",
          id: "avg-processing-time",
          label: "Avg. Processing Time",
          priority: 3,
          icon: "Timer",
          api: { endpoint: "/api/dashboard/metrics/avg-time", method: "GET" },
          valueField: "value",
          format: "number",
        },
      ],
    },
    {
      id: "charts",
      title: "Claims Overview",
      columns: 2,
      widgets: [
        {
          widgetType: "chart",
          id: "claims-by-lane",
          title: "Claims by Lane",
          chartType: "donut",
          api: { endpoint: "/api/dashboard/charts/by-lane", method: "GET" },
          colorField: "lane",
          colorMapping: [
            { value: "GREEN", label: "Green", color: "success" },
            { value: "AMBER", label: "Amber", color: "warning" },
            { value: "RED", label: "Red", color: "error" },
          ],
        },
        {
          widgetType: "chart",
          id: "claims-by-priority",
          title: "Claims by Priority",
          chartType: "bar",
          api: { endpoint: "/api/dashboard/charts/by-priority", method: "GET" },
          xAxisField: "priority",
          yAxisField: "count",
          colorMapping: [
            { value: "LOW", label: "Low", color: "default" },
            { value: "MEDIUM", label: "Medium", color: "info" },
            { value: "HIGH", label: "High", color: "warning" },
            { value: "CRITICAL", label: "Critical", color: "error" },
          ],
        },
        {
          widgetType: "chart",
          id: "claims-trend",
          title: "Claims Trend (Last 30 Days)",
          chartType: "area",
          api: { endpoint: "/api/dashboard/charts/trend", method: "GET" },
          xAxisField: "date",
          yAxisField: "count",
        },
      ],
    },
    {
      id: "quick-actions",
      title: "Quick Actions",
      columns: 4,
      widgets: [
        {
          widgetType: "quick-links",
          id: "card-links",
          layout: "grid",
          links: [
            {
              id: "new-claim-card",
              label: "New Claim",
              type: "card",
              icon: "Plus",
              description: "Create a new insurance claim",
              action: {
                id: "new-claim-action",
                label: "New Claim",
                intent: "create",
                actionProps: {
                  formId: "create-claim-form",
                },
              },
            },
            {
              id: "view-claims-card",
              label: "View All Claims",
              type: "card",
              icon: "FileText",
              description: "Browse and manage claims",
              action: {
                id: "view-claims-action",
                label: "View All Claims",
                intent: "view",
                actionProps: {
                  route: "/claims",
                },
              },
            },
            {
              id: "reports-card",
              label: "Reports",
              type: "card",
              icon: "BarChart3",
              description: "View analytics and reports",
              action: {
                id: "reports-action",
                label: "Reports",
                intent: "view",
                actionProps: {
                  route: "/reports",
                },
              },
            },
          ],
        },
        {
          widgetType: "quick-links",
          id: "inline-links",
          title: "More Actions",
          layout: "inline",
          links: [
            {
              id: "export-claims",
              label: "Export Claims",
              type: "link",
              icon: "Download",
              action: {
                id: "export-claims-action",
                label: "Export Claims",
                intent: "export",
                actionProps: {
                  api: { endpoint: "/api/claims/export", method: "GET" },
                  responseType: "blob",
                  successMessage: "Claims exported successfully",
                },
              },
            },
            {
              id: "settings-link",
              label: "Settings",
              type: "link",
              icon: "Settings",
              action: {
                id: "settings-action",
                label: "Settings",
                intent: "view",
                actionProps: {
                  route: "/settings",
                },
              },
            },
          ],
        },
      ],
    },
    {
      id: "recent-claims",
      title: "Recent Claims",
      columns: 2,
      widgets: [
        {
          widgetType: "table",
          // config will remain same as main table, add quick filters
          id: "recent-claims-table",
          title: "Latest Claims",
          span: 4,
          api: { endpoint: "/api/claims", method: "GET" },
          columns: [
            { id: "claimNumber", header: "Claim #", accessorKey: "claimNumber", type: "link" },
            { id: "customer", header: "Customer", accessorKey: "customer", type: "text" },
            {
              id: "lane",
              header: "Lane",
              accessorKey: "lane",
              type: "badge",
              valueMapping: [
                { value: "GREEN", label: "Green", color: "success" },
                { value: "AMBER", label: "Amber", color: "warning" },
                { value: "RED", label: "Red", color: "error" },
              ],
            },
            { id: "amount", header: "Amount", accessorKey: "amount", type: "currency", align: "right" },
          ],
          rowLimit: 5,
          showViewAll: true,
          viewAllRoute: "/claims",
        },
      ],
    },
  ],
  refreshInterval: 300, // 5 minutes
};
