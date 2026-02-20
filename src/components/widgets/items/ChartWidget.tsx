import React from 'react';
import { WidgetConfig } from '@/types/widget';

export const ChartWidget: React.FC<{ config: WidgetConfig }> = ({ config }) => (
    <div className="p-4 border rounded h-64 flex items-center justify-center bg-muted/20">
        Chart: {config.props?.title} ({config.props?.chartType})
    </div>
);
