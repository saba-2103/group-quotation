export const chartWidgetMocks = {
  configs: {
    bar: {
      title: "Monthly Premium Overview",
      chartType: "bar" as const,
    },

    line: {
      title: "User Growth Trend",
      chartType: "line" as const,
    },

    pie: {
      title: "Claims by Category",
      chartType: "pie" as const,
    },

    revenue: {
      title: "Revenue (Bar)",
      chartType: "bar" as const,
    },

    traffic: {
      title: "Traffic (Line)",
      chartType: "line" as const,
    },

    demographics: {
      title: "User Demographics (Pie)",
      chartType: "pie" as const,
    },
  },
};
