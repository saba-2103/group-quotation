import React from 'react';
import { WidgetConfig } from '@/types/widget';
import { 
    BarChart, Bar, 
    LineChart, Line, 
    PieChart, Pie, Cell,
    XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer 
} from 'recharts';

export const ChartWidget: React.FC<{ config: WidgetConfig }> = ({ config }) => {
    const { title, chartType, data } = config.props || {};

    // Fallback data if none provided by config
    const defaultChartData = data || [
        { name: 'Jan', value: 400 },
        { name: 'Feb', value: 300 },
        { name: 'Mar', value: 550 },
        { name: 'Apr', value: 450 },
        { name: 'May', value: 700 },
    ];

    const COLORS = ['#0ea5e9', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

    const renderChart = () => {
        switch (chartType) {
            case 'bar':
                return (
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={defaultChartData} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="currentColor" className="text-muted/30" />
                            <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: 'currentColor', fontSize: 12 }} className="text-muted-foreground" />
                            <YAxis axisLine={false} tickLine={false} tick={{ fill: 'currentColor', fontSize: 12 }} className="text-muted-foreground" />
                            <Tooltip 
                                contentStyle={{ backgroundColor: 'var(--background)', borderColor: 'var(--border)', borderRadius: '8px', color: 'var(--foreground)' }}
                                itemStyle={{ color: 'var(--foreground)' }}
                            />
                            <Bar dataKey="value" fill="#0ea5e9" radius={[4, 4, 0, 0]} />
                        </BarChart>
                    </ResponsiveContainer>
                );
            case 'line':
                return (
                    <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={defaultChartData} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="currentColor" className="text-muted/30" />
                            <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: 'currentColor', fontSize: 12 }} className="text-muted-foreground" />
                            <YAxis axisLine={false} tickLine={false} tick={{ fill: 'currentColor', fontSize: 12 }} className="text-muted-foreground" />
                            <Tooltip 
                                contentStyle={{ backgroundColor: 'var(--background)', borderColor: 'var(--border)', borderRadius: '8px', color: 'var(--foreground)' }}
                                itemStyle={{ color: 'var(--foreground)' }}
                            />
                            <Line type="monotone" dataKey="value" stroke="#10b981" strokeWidth={3} dot={{ r: 4, strokeWidth: 2 }} activeDot={{ r: 6 }} />
                        </LineChart>
                    </ResponsiveContainer>
                );
            case 'pie':
                return (
                    <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                            <Tooltip 
                                contentStyle={{ backgroundColor: 'var(--background)', borderColor: 'var(--border)', borderRadius: '8px', color: 'var(--foreground)' }}
                                itemStyle={{ color: 'var(--foreground)' }}
                            />
                            <Legend verticalAlign="bottom" height={36} iconType="circle" wrapperStyle={{ fontSize: '12px', color: 'currentColor' }} className="text-muted-foreground" />
                            <Pie
                                data={defaultChartData}
                                cx="50%"
                                cy="50%"
                                innerRadius={60}
                                outerRadius={80}
                                paddingAngle={5}
                                dataKey="value"
                                stroke="none"
                            >
                                {defaultChartData.map((entry: any, index: number) => (
                                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                ))}
                            </Pie>
                        </PieChart>
                    </ResponsiveContainer>
                );
            default:
                return <div className="text-muted-foreground flex h-full items-center justify-center">Unsupported chart type: {chartType}</div>;
        }
    };

    return (
        <div className="p-6 border rounded-xl bg-card text-card-foreground shadow-sm flex flex-col h-[400px]">
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
