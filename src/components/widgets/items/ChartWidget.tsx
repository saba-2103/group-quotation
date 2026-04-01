import React from 'react';
import { WidgetConfig } from '@/types/widget';
import { useSmartQuery } from '@/hooks/useSmartQuery';
import {
    BarChart, Bar,
    LineChart, Line,
    PieChart, Pie, Cell,
    XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';
import { CHART_STYLE_CONFIG } from './constants';
import { LoadingState } from '@/components/ui/loading-state';
import { ErrorState } from '@/components/ui/error-state';

export const ChartWidget: React.FC<{ config: WidgetConfig }> = ({ config }) => {
    const { title, chartType, dataKey, color, colors } = config.props || {};

    const { data: queryData, isLoading } = useSmartQuery(config.dataSource);

    if (isLoading) {
        return (
            <div className={`p-6 border rounded-xl bg-card text-card-foreground shadow-sm flex flex-col ${CHART_STYLE_CONFIG.containerHeight}`}>
                <LoadingState message="Loading chart..." />
            </div>
        );
    }

    const chartData = queryData as { name: string; value: number }[] | undefined;

    if (!chartData || !Array.isArray(chartData) || chartData.length === 0) {
        return (
            <div className={`p-6 border rounded-xl bg-card text-card-foreground shadow-sm flex flex-col ${CHART_STYLE_CONFIG.containerHeight}`}>
                <ErrorState message="Unable to render the chart" />
            </div>
        );
    }

    const renderChart = () => {
        switch (chartType) {
            case 'bar':
                return (
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={chartData} margin={CHART_STYLE_CONFIG.chartMargin}>
                            <CartesianGrid strokeDasharray={CHART_STYLE_CONFIG.grid.strokeDasharray} vertical={false} stroke="currentColor" className="text-muted/30" />
                            <XAxis dataKey="name" {...CHART_STYLE_CONFIG.xAxisProps} />
                            <YAxis {...CHART_STYLE_CONFIG.yAxisProps} />
                            <Tooltip contentStyle={CHART_STYLE_CONFIG.tooltip.contentStyle} itemStyle={CHART_STYLE_CONFIG.tooltip.itemStyle} />
                            <Bar dataKey={dataKey} fill={color} radius={CHART_STYLE_CONFIG.bar.radius} />
                        </BarChart>
                    </ResponsiveContainer>
                );
            case 'line':
                return (
                    <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={chartData} margin={CHART_STYLE_CONFIG.chartMargin}>
                            <CartesianGrid strokeDasharray={CHART_STYLE_CONFIG.grid.strokeDasharray} vertical={false} stroke="currentColor" className="text-muted/30" />
                            <XAxis dataKey="name" {...CHART_STYLE_CONFIG.xAxisProps} />
                            <YAxis {...CHART_STYLE_CONFIG.yAxisProps} />
                            <Tooltip contentStyle={CHART_STYLE_CONFIG.tooltip.contentStyle} itemStyle={CHART_STYLE_CONFIG.tooltip.itemStyle} />
                            <Line type="monotone" dataKey={dataKey} stroke={color} strokeWidth={CHART_STYLE_CONFIG.line.strokeWidth} dot={CHART_STYLE_CONFIG.line.dot} activeDot={CHART_STYLE_CONFIG.line.activeDot} />
                        </LineChart>
                    </ResponsiveContainer>
                );
            case 'pie':
                return (
                    <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                            <Tooltip contentStyle={CHART_STYLE_CONFIG.tooltip.contentStyle} itemStyle={CHART_STYLE_CONFIG.tooltip.itemStyle} />
                            <Legend verticalAlign="bottom" height={CHART_STYLE_CONFIG.legend.height} iconType="circle" wrapperStyle={CHART_STYLE_CONFIG.legend.wrapperStyle} className="text-muted-foreground" />
                            <Pie
                                data={chartData}
                                cx={CHART_STYLE_CONFIG.pie.cx}
                                cy={CHART_STYLE_CONFIG.pie.cy}
                                innerRadius={CHART_STYLE_CONFIG.pie.innerRadius}
                                outerRadius={CHART_STYLE_CONFIG.pie.outerRadius}
                                paddingAngle={CHART_STYLE_CONFIG.pie.paddingAngle}
                                dataKey={dataKey}
                                stroke="none"
                            >
                                {chartData.map((_entry, index) => (
                                    <Cell key={`cell-${index}`} fill={colors?.[index % colors.length]} />
                                ))}
                            </Pie>
                        </PieChart>
                    </ResponsiveContainer>
                );
            default:
                return <ErrorState message={`Unsupported chart type: ${chartType}`} />;
        }
    };

    return (
        <div className={`p-6 border rounded-xl bg-card text-card-foreground shadow-sm flex flex-col ${CHART_STYLE_CONFIG.containerHeight}`}>
            {title && (
                <div className="mb-6">
                    <h3 className="font-semibold leading-none tracking-tight">{title}</h3>
                </div>
            )}
            <div className="flex-1 w-full relative">
                {renderChart()}
            </div>
        </div>
    );
};
