import { useMemo, useState } from 'react';
import { cn } from '@/lib/utils';

interface HeatmapProps {
  data?: Record<string, number>;
  weeks?: number;
}

export default function Heatmap({ data, weeks = 20 }: HeatmapProps) {
  const [hoveredDate, setHoveredDate] = useState<string | null>(null);

  const cells = useMemo(() => {
    const result: { date: string; value: number; dayOfWeek: number }[] = [];
    const today = new Date();
    
    // Generate cells for the specified number of weeks
    for (let i = weeks * 7 - 1; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      const value = data?.[dateStr] ?? Math.floor(Math.random() * 5); // Mock data
      const dayOfWeek = date.getDay();
      result.push({ date: dateStr, value, dayOfWeek });
    }
    
    return result;
  }, [data, weeks]);

  const getIntensityClass = (value: number) => {
    if (value === 0) return 'bg-muted';
    if (value === 1) return 'bg-muted-foreground/20';
    if (value === 2) return 'bg-muted-foreground/40';
    if (value === 3) return 'bg-muted-foreground/60';
    return 'bg-foreground';
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    });
  };

  // Group cells by week
  const weekGroups: typeof cells[] = [];
  for (let i = 0; i < cells.length; i += 7) {
    weekGroups.push(cells.slice(i, i + 7));
  }

  return (
    <div className="overflow-x-auto">
      <div className="flex gap-1 min-w-fit">
        {weekGroups.map((week, weekIndex) => (
          <div key={weekIndex} className="flex flex-col gap-1">
            {week.map((cell) => (
              <div
                key={cell.date}
                className={cn(
                  'w-3 h-3 heatmap-cell relative group',
                  getIntensityClass(cell.value)
                )}
                onMouseEnter={() => setHoveredDate(cell.date)}
                onMouseLeave={() => setHoveredDate(null)}
              >
                {hoveredDate === cell.date && (
                  <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-foreground text-background text-xs rounded whitespace-nowrap z-10">
                    {formatDate(cell.date)}: {cell.value} activities
                  </div>
                )}
              </div>
            ))}
          </div>
        ))}
      </div>
      <div className="flex items-center gap-2 mt-4 text-xs text-muted-foreground">
        <span>Less</span>
        <div className="flex gap-1">
          {[0, 1, 2, 3, 4].map((level) => (
            <div
              key={level}
              className={cn('w-3 h-3 rounded-sm', getIntensityClass(level))}
            />
          ))}
        </div>
        <span>More</span>
      </div>
    </div>
  );
}
