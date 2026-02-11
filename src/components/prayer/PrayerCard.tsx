import { useState, memo } from 'react';
import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Prayer {
  id: string;
  name: string;
  time: string;
  completed: boolean;
}

interface PrayerCardProps {
  prayer: Prayer;
  onToggle: (id: string) => void;
  delay?: number;
}

function PrayerCard({ prayer, onToggle, delay = 0 }: PrayerCardProps) {
  const [isAnimating, setIsAnimating] = useState(false);

  const handleToggle = () => {
    setIsAnimating(true);
    onToggle(prayer.id);
    setTimeout(() => setIsAnimating(false), 300);
  };

  return (
    <div
      className={cn(
        'card-elevated p-5 flex items-center justify-between opacity-0 animate-fade-in transition-all duration-300',
        prayer.completed && 'bg-foreground/5'
      )}
      style={{ animationDelay: `${delay}ms` }}
    >
      <div className="flex items-center gap-4">
        <div
          className={cn(
            'w-12 h-12 rounded-xl flex items-center justify-center transition-all duration-300',
            prayer.completed ? 'bg-foreground' : 'bg-muted'
          )}
        >
          {prayer.completed && (
            <Check className={cn('w-6 h-6 text-background', isAnimating && 'animate-check-mark')} />
          )}
        </div>
        <div>
          <h3 className={cn(
            'font-semibold text-lg transition-colors duration-300',
            prayer.completed ? 'text-muted-foreground' : 'text-foreground'
          )}>
            {prayer.name}
          </h3>
          <p className="text-sm text-muted-foreground">{prayer.time}</p>
        </div>
      </div>
      
      <button
        onClick={handleToggle}
        className={cn(
          'toggle-switch',
          prayer.completed && 'active'
        )}
        aria-label={`Mark ${prayer.name} as ${prayer.completed ? 'incomplete' : 'complete'}`}
      />
    </div>
  );
}

// Memoize component to prevent unnecessary re-renders
export default memo(PrayerCard, (prevProps, nextProps) => {
  return (
    prevProps.prayer.id === nextProps.prayer.id &&
    prevProps.prayer.completed === nextProps.prayer.completed &&
    prevProps.delay === nextProps.delay
  );
});
