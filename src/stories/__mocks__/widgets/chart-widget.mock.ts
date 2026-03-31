import { DataSourceConfig } from "@/types/widget";

const buildDataSource = (endpoint: string): DataSourceConfig => ({
  api: { endpoint, method: "GET" },
});

export const chartApiSeedData: Record<string, { name: string; value: number }[]> = {
  "/api/charts/premium": [
    { name: "Jan", value: 420 },
    { name: "Feb", value: 380 },
    { name: "Mar", value: 510 },
    { name: "Apr", value: 460 },
    { name: "May", value: 690 },
    { name: "Jun", value: 580 },
  ],
  "/api/charts/growth": [
    { name: "Jan", value: 1200 },
    { name: "Feb", value: 1800 },
    { name: "Mar", value: 1600 },
    { name: "Apr", value: 2400 },
    { name: "May", value: 2200 },
    { name: "Jun", value: 3100 },
  ],
  "/api/charts/claims-by-category": [
    { name: "Health", value: 400 },
    { name: "Motor", value: 300 },
    { name: "Life", value: 250 },
    { name: "Property", value: 200 },
    { name: "Travel", value: 150 },
  ],
  "/api/charts/revenue": [
    { name: "Jan", value: 42000 },
    { name: "Feb", value: 38000 },
    { name: "Mar", value: 55000 },
    { name: "Apr", value: 47000 },
    { name: "May", value: 71000 },
    { name: "Jun", value: 63000 },
  ],
  "/api/charts/traffic": [
    { name: "Mon", value: 3200 },
    { name: "Tue", value: 4100 },
    { name: "Wed", value: 3800 },
    { name: "Thu", value: 5200 },
    { name: "Fri", value: 4700 },
    { name: "Sat", value: 2900 },
    { name: "Sun", value: 2100 },
  ],
  "/api/charts/demographics": [
    { name: "18–25", value: 320 },
    { name: "26–35", value: 480 },
    { name: "36–50", value: 360 },
    { name: "51+", value: 210 },
  ],
};

export const chartWidgetMocks = {
  configs: {
    bar: {
      title: "Monthly Premium Overview",
      chartType: "bar" as const,
      dataKey: "value",
      color: "#0ea5e9",
    },
    line: {
      title: "User Growth Trend",
      chartType: "line" as const,
      dataKey: "value",
      color: "#10b981",
    },
    pie: {
      title: "Claims by Category",
      chartType: "pie" as const,
      dataKey: "value",
      colors: ["#0ea5e9", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6"],
    },
    revenue: {
      title: "Revenue (Bar)",
      chartType: "bar" as const,
      dataKey: "value",
      color: "#0ea5e9",
    },
    traffic: {
      title: "Traffic (Line)",
      chartType: "line" as const,
      dataKey: "value",
      color: "#10b981",
    },
    demographics: {
      title: "User Demographics (Pie)",
      chartType: "pie" as const,
      dataKey: "value",
      colors: ["#0ea5e9", "#10b981", "#f59e0b", "#8b5cf6"],
    },
  },
  dataSources: {
    bar: buildDataSource("/api/charts/premium"),
    line: buildDataSource("/api/charts/growth"),
    pie: buildDataSource("/api/charts/claims-by-category"),
    revenue: buildDataSource("/api/charts/revenue"),
    traffic: buildDataSource("/api/charts/traffic"),
    demographics: buildDataSource("/api/charts/demographics"),
  },
};
