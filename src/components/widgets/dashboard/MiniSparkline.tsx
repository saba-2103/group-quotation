'use client';

import React from 'react';
import { LineChart, Line, ResponsiveContainer } from 'recharts';

export interface MiniSparklineProps {
  data: number[];
  color?: string;
}

export function MiniSparkline({ data, color = 'var(--primary)' }: MiniSparklineProps) {
  const chartData = data.map((v, i) => ({ i, v }));

  return (
    <div style={{ width: 60, height: 28 }} aria-hidden="true">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={chartData} margin={{ top: 2, right: 2, bottom: 2, left: 2 }}>
          <Line
            type="monotone"
            dataKey="v"
            stroke={color}
            strokeWidth={1.5}
            dot={false}
            isAnimationActive={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
