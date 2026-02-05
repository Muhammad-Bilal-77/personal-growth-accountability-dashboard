import { useState, useMemo } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Event {
  id: string;
  title: string;
  date: string;
  category: string;
  notes?: string;
}

interface CalendarGridProps {
  events?: Event[];
  onSelectDate: (date: Date) => void;
  selectedDate?: Date;
}

export default function CalendarGrid({ events = [], onSelectDate, selectedDate }: CalendarGridProps) {
  const [currentMonth, setCurrentMonth] = useState(new Date());

  const formatLocalDate = (value: Date) => {
    const year = value.getFullYear();
    const month = String(value.getMonth() + 1).padStart(2, '0');
    const day = String(value.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const daysInMonth = useMemo(() => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startPadding = firstDay.getDay();
    const daysCount = lastDay.getDate();
    
    const days: (Date | null)[] = [];
    
    // Add padding for days before the first of the month
    for (let i = 0; i < startPadding; i++) {
      days.push(null);
    }
    
    // Add all days of the month
    for (let i = 1; i <= daysCount; i++) {
      days.push(new Date(year, month, i));
    }
    
    return days;
  }, [currentMonth]);

  const monthName = currentMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  const prevMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1));
  };

  const nextMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1));
  };

  const isToday = (date: Date) => {
    const today = new Date();
    return date.toDateString() === today.toDateString();
  };

  const isSelected = (date: Date) => {
    return selectedDate?.toDateString() === date.toDateString();
  };

  const hasEvents = (date: Date) => {
    const dateStr = formatLocalDate(date);
    return events.some(event => event.date === dateStr);
  };

  const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  return (
    <div className="card-static p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <button
          onClick={prevMonth}
          className="p-2 rounded-lg hover:bg-accent transition-colors"
          aria-label="Previous month"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
        <h2 className="text-xl font-bold text-foreground">{monthName}</h2>
        <button
          onClick={nextMonth}
          className="p-2 rounded-lg hover:bg-accent transition-colors"
          aria-label="Next month"
        >
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>

      {/* Week days header */}
      <div className="grid grid-cols-7 gap-2 mb-2">
        {weekDays.map(day => (
          <div key={day} className="text-center text-sm font-medium text-muted-foreground py-2">
            {day}
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="grid grid-cols-7 gap-2">
        {daysInMonth.map((date, index) => (
          <div key={index} className="aspect-square">
            {date && (
              <button
                onClick={() => onSelectDate(date)}
                className={cn(
                  'w-full h-full rounded-lg flex flex-col items-center justify-center relative transition-all duration-200',
                  'hover:bg-accent',
                  isToday(date) && 'ring-2 ring-foreground',
                  isSelected(date) && 'bg-foreground text-background hover:bg-foreground'
                )}
              >
                <span className="text-sm font-medium">{date.getDate()}</span>
                {hasEvents(date) && (
                  <div className={cn(
                    'w-1.5 h-1.5 rounded-full mt-1',
                    isSelected(date) ? 'bg-background' : 'bg-foreground'
                  )} />
                )}
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
