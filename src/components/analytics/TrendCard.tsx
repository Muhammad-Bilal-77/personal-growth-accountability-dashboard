import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { cn } from '@/lib/utils';

interface TrendCardProps {
  title: string;
  value: string | number;
  trend: 'up' | 'down' | 'neutral';
  trendValue?: string;
  delay?: number;
}

export default function TrendCard({ title, value, trend, trendValue, delay = 0 }: TrendCardProps) {
  const TrendIcon = trend === 'up' ? TrendingUp : trend === 'down' ? TrendingDown : Minus;

  return (
    <div
      className="card-elevated p-6 opacity-0 animate-fade-in"
      style={{ animationDelay: `${delay}ms` }}
    >
      <h3 className="text-sm font-medium text-muted-foreground mb-3 uppercase tracking-wider">
        {title}
      </h3>
      <div className="flex items-end justify-between">
        <span className="text-4xl font-bold text-foreground">{value}</span>
        <div
          className={cn(
            'flex items-center gap-1 text-sm',
            trend === 'up' && 'text-foreground',
            trend === 'down' && 'text-muted-foreground',
            trend === 'neutral' && 'text-muted-foreground'
          )}
        >
          <TrendIcon className="w-4 h-4" />
          {trendValue && <span>{trendValue}</span>}
        </div>
      </div>
    </div>
  );
}
