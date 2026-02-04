import { useMemo } from 'react';

interface TrendChartProps {
  data?: number[];
  height?: number;
}

export default function TrendChart({ data, height = 200 }: TrendChartProps) {
  const chartData = useMemo(() => {
    if (data) return data;
    // Generate mock data
    return Array.from({ length: 30 }, () => Math.floor(Math.random() * 80) + 20);
  }, [data]);

  const max = Math.max(...chartData);
  const min = Math.min(...chartData);
  const range = max - min || 1;

  const points = chartData.map((value, index) => {
    const x = (index / (chartData.length - 1)) * 100;
    const y = ((max - value) / range) * 100;
    return `${x},${y}`;
  }).join(' ');

  const areaPoints = `0,100 ${points} 100,100`;

  return (
    <div className="card-static p-6 opacity-0 animate-fade-in" style={{ animationDelay: '200ms' }}>
      <h3 className="text-sm font-medium text-muted-foreground mb-6 uppercase tracking-wider">
        Activity Trend
      </h3>
      <div className="relative" style={{ height }}>
        {/* Grid lines */}
        <div className="absolute inset-0 flex flex-col justify-between">
          {[0, 1, 2, 3, 4].map((i) => (
            <div key={i} className="border-b border-border/50" />
          ))}
        </div>
        
        {/* Chart */}
        <svg
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
          className="absolute inset-0 w-full h-full"
        >
          {/* Area fill */}
          <polygon
            points={areaPoints}
            fill="hsl(var(--foreground))"
            fillOpacity="0.05"
          />
          {/* Line */}
          <polyline
            points={points}
            fill="none"
            stroke="hsl(var(--foreground))"
            strokeWidth="0.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>
      
      <div className="flex justify-between mt-4 text-xs text-muted-foreground">
        <span>30 days ago</span>
        <span>Today</span>
      </div>
    </div>
  );
}
