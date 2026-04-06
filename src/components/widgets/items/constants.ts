export const PRIORITY_STYLES: Record<string, { container: string; value: string; shadow: string }> = {
  1: { container: "h-32", value: "text-3xl", shadow: "shadow-md" },
  2: { container: "h-28", value: "text-2xl", shadow: "shadow-sm" },
  3: { container: "h-24", value: "text-xl", shadow: "" },
  default: { container: "h-24", value: "text-xl", shadow: "" },
};

export const CHART_STYLE_CONFIG = {
  containerHeight: 'h-[400px]',
  chartMargin: { top: 20, right: 30, left: 0, bottom: 5 },
  grid: {
    strokeDasharray: '3 3',
  },
  xAxisProps: {
    axisLine: false,
    tickLine: false,
    tick: { fill: 'currentColor', fontSize: 12 },
    className: 'text-muted-foreground',
  },
  yAxisProps: {
    axisLine: false,
    tickLine: false,
    tick: { fill: 'currentColor', fontSize: 12 },
    className: 'text-muted-foreground',
  },
  tooltip: {
    contentStyle: {
      backgroundColor: 'var(--background)',
      borderColor: 'var(--border)',
      borderRadius: '8px',
      color: 'var(--foreground)',
    },
    itemStyle: {
      color: 'var(--foreground)',
    },
  },
  bar: {
    radius: [4, 4, 0, 0] as [number, number, number, number],
  },
  line: {
    strokeWidth: 3,
    dot: { r: 4, strokeWidth: 2 },
    activeDot: { r: 6 },
  },
  pie: {
    innerRadius: 60,
    outerRadius: 80,
    paddingAngle: 5,
    cx: '50%',
    cy: '50%',
  },
  legend: {
    height: 36,
    wrapperStyle: { fontSize: '12px', color: 'currentColor' },
  },
} as const;
