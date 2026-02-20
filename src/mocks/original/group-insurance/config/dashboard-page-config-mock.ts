import type { DashboardPageConfig } from "@shared/types";

// ============================================
// Group Insurance Portal - Dashboard Page Config
// ============================================

export const groupInsuranceDashboardPageConfig: DashboardPageConfig = {
  pageType: "dashboard",
  pageId: "dashboard",
  header: {
    title: "Dashboard",
    description: "Group Insurance Overview",
  },
  sections: [
    {
      id: "metrics",
      title: "Key Metrics",
      columns: 4,
      widgets: [
        {
          widgetType: "metric",
          id: "pending-quotations",
          label: "Pending Quotations",
          priority: 1,
          icon: "FileText",
          api: { endpoint: "/api/dashboard/metrics/pending-quotations", method: "GET" },
          valueField: "value",
          format: "number",
          showTrend: true,
          trendField: "trend",
          trendFormat: "percentage"
        },
        {
          widgetType: "metric",
          id: "new-business",
          label: "New Business",
          priority: 1,
          icon: "PlusCircle",
          api: { endpoint: "/api/dashboard/metrics/new-business", method: "GET" },
          valueField: "value",
          format: "number",
          showTrend: true,
          trendField: "trend",
          trendFormat: "percentage"
        },
        {
          widgetType: "metric",
          id: "pending-alterations",
          label: "Pending Alterations",
          priority: 1,
          icon: "Edit",
          api: { endpoint: "/api/dashboard/metrics/pending-alterations", method: "GET" },
          valueField: "value",
          format: "number",
          showTrend: true,
          trendField: "trend",
          trendFormat: "percentage"
        },
        {
          widgetType: "metric",
          id: "renewals-due",
          label: "Renewals Due",
          priority: 1,
          icon: "RefreshCw",
          api: { endpoint: "/api/dashboard/metrics/renewals-due", method: "GET" },
          valueField: "value",
          format: "number",
          showTrend: true,
          trendField: "trend",
          trendFormat: "percentage"
        }
      ]
    },
    {
      id: "business-processes",
      title: "Business Processes",
      columns: 3,
      widgets: [
        {
          widgetType: "quick-links",
          id: "business-process-cards",
          layout: "grid",
          links: [
            {
              id: "group-quotation-card",
              label: "Group Quotation",
              type: "card",
              icon: "FileText",
              description: "Manage group insurance quotations",
              action: {
                id: "group-quotation-action",
                label: "View Quotations",
                intent: "view",
                actionProps: {
                  route: "/quotations?status=pending"
                }
              }
            },
            {
              id: "group-new-business-card",
              label: "Group New Business",
              type: "card",
              icon: "PlusCircle",
              description: "Process new policy applications",
              action: {
                id: "new-business-action",
                label: "View New Business",
                intent: "view",
                actionProps: {
                  route: "/quotations?status=new-business"
                }
              }
            },
            {
              id: "group-major-alteration-card",
              label: "Group Major Alteration",
              type: "card",
              icon: "Edit",
              description: "Handle major policy changes",
              action: {
                id: "major-alteration-action",
                label: "View Major Alterations",
                intent: "view",
                actionProps: {
                  route: "/alterations?type=major"
                }
              }
            },
            {
              id: "group-minor-alteration-card",
              label: "Group Minor Alteration",
              type: "card",
              icon: "Edit",
              description: "Process minor modifications",
              action: {
                id: "minor-alteration-action",
                label: "View Minor Alterations",
                intent: "view",
                actionProps: {
                  route: "/alterations?type=minor"
                }
              }
            },
            {
              id: "group-renewals-card",
              label: "Group Renewals",
              type: "card",
              icon: "RefreshCw",
              description: "Manage policy renewals",
              action: {
                id: "renewals-action",
                label: "View Renewals",
                intent: "view",
                actionProps: {
                  route: "/renewals"
                }
              }
            },
            {
              id: "short-term-extension-card",
              label: "Short-term Extension",
              type: "card",
              icon: "Clock",
              description: "Process short-term extensions",
              action: {
                id: "short-term-extension-action",
                label: "View Extensions",
                intent: "view",
                actionProps: {
                  route: "/extensions"
                }
              }
            }
          ]
        }
      ]
    },
    {
      id: "ai-insights",
      title: "AI-Powered Insights & Predictions",
      columns: 2,
      widgets: [
        {
          widgetType: "chart",
          id: "premium-revenue-forecast",
          title: "Premium Revenue Forecast",
          chartType: "area",
          api: { endpoint: "/api/dashboard/ai/revenue-forecast", method: "GET" },
          xAxisField: "month",
          yAxisField: "amount",
        },
        {
          widgetType: "chart",
          id: "portfolio-risk-analysis",
          title: "Portfolio Risk Analysis",
          chartType: "donut",
          api: { endpoint: "/api/dashboard/ai/risk-analysis", method: "GET" },
          colorField: "riskLevel",
          colorMapping: [
            { value: "Low Risk", label: "Low Risk: 45%", color: "success" },
            { value: "Medium Risk", label: "Medium Risk: 35%", color: "warning" },
            { value: "High Risk", label: "High Risk: 20%", color: "error" }
          ]
        },
        {
          widgetType: "chart",
          id: "conversion-funnel-analysis",
          title: "Conversion Funnel Analysis",
          chartType: "bar",
          api: { endpoint: "/api/dashboard/ai/conversion-funnel", method: "GET" },
          xAxisField: "stage",
          yAxisField: "count",
          colorMapping: [
            { value: "Quoted", label: "Quoted", color: "info" },
            { value: "Negotiation", label: "Negotiation", color: "info" },
            { value: "Approved", label: "Approved", color: "info" },
            { value: "Converted", label: "Converted", color: "success" }
          ]
        },
        {
          widgetType: "chart",
          id: "claims-prediction-model",
          title: "Claims Prediction Model",
          chartType: "line",
          api: { endpoint: "/api/dashboard/ai/claims-prediction", method: "GET" },
          xAxisField: "month",
          yAxisField: "claims",
        }
      ]
    },
    {
      id: "quick-actions",
      title: "Quick Actions",
      columns: 3,
      widgets: [
        {
          widgetType: "quick-links",
          id: "quick-action-buttons",
          layout: "grid",
          links: [
            {
              id: "new-quotation-action",
              label: "New Quotation",
              type: "link",
              icon: "Plus",
              action: {
                id: "create-quotation",
                label: "New Quotation",
                intent: "create",
                actionProps: {
                  formId: "create-quotation-form"
                }
              }
            },
            {
              id: "process-renewals-action",
              label: "Process Renewals",
              type: "link",
              icon: "RefreshCw",
              action: {
                id: "process-renewals",
                label: "Process Renewals",
                intent: "view",
                actionProps: {
                  route: "/renewals/process"
                }
              }
            },
            {
              id: "new-business-action",
              label: "New Business",
              type: "link",
              icon: "FileText",
              action: {
                id: "new-business",
                label: "New Business",
                intent: "create",
                actionProps: {
                  formId: "new-business-form"
                }
              }
            }
          ]
        }
      ]
    }
  ],
  refreshInterval: 300 // 5 minutes
};