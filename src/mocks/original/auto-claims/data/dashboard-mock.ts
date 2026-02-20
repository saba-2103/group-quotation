import type { MetricData } from "@shared/types";

export const dashboardMetricMock: Record<string, MetricData> = {
  "total-claims": { value: 1234, trend: 12.5 },
  "pending-review": { value: 89 },
  "approved-claims": { value: 856, trend: 8.2 },
  "total-amount": { value: 4567890 },
  "rejected-claims": { value: 45 },
  "avg-processing-time": { value: 3.5 },
};

export const dashboardChartMock: Record<string, Array<Record<string, unknown>>> = {
  "claims-by-lane": [
    { name: "GREEN", value: 450 },
    { name: "AMBER", value: 320 },
    { name: "RED", value: 180 },
  ],
  "claims-by-priority": [
    { priority: "LOW", count: 200 },
    { priority: "MEDIUM", count: 400 },
    { priority: "HIGH", count: 250 },
    { priority: "CRITICAL", count: 100 },
  ],
  "claims-trend": [
    { date: "Jan 1", count: 45 },
    { date: "Jan 5", count: 52 },
    { date: "Jan 10", count: 48 },
    { date: "Jan 15", count: 61 },
    { date: "Jan 20", count: 55 },
    { date: "Jan 25", count: 67 },
    { date: "Jan 30", count: 72 },
  ],
};

export const dashboardTableMock = [
  { id: "1", claimNumber: "CLM-2024-001234", customer: "John Smith", lane: "GREEN", amount: 45000 },
  { id: "2", claimNumber: "CLM-2024-001235", customer: "Sarah Johnson", lane: "AMBER", amount: 125000 },
  { id: "3", claimNumber: "CLM-2024-001236", customer: "Michael Brown", lane: "RED", amount: 250000 },
  { id: "4", claimNumber: "CLM-2024-001237", customer: "Emily Davis", lane: "GREEN", amount: 18500 },
  { id: "5", claimNumber: "CLM-2024-001238", customer: "Robert Wilson", lane: "AMBER", amount: 89000 },
];
