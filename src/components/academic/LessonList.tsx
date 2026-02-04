import { Calendar, FileText } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Lesson {
  id: string;
  title: string;
  dateAdded: string;
}

interface LessonListProps {
  lessons: Lesson[];
  onSelect: (id: string) => void;
  selectedId?: string;
}

export default function LessonList({ lessons, onSelect, selectedId }: LessonListProps) {
  return (
    <div className="space-y-3">
      {lessons.map((lesson, index) => (
        <button
          key={lesson.id}
          onClick={() => onSelect(lesson.id)}
          className={cn(
            'w-full card-elevated p-4 text-left transition-all duration-200 opacity-0 animate-fade-in',
            selectedId === lesson.id && 'ring-2 ring-foreground'
          )}
          style={{ animationDelay: `${index * 50}ms` }}
        >
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center flex-shrink-0">
              <FileText className="w-5 h-5 text-muted-foreground" />
            </div>
            <div className="flex-1 min-w-0">
              <h4 className="font-medium text-foreground truncate">{lesson.title}</h4>
              <div className="flex items-center gap-1 mt-1 text-sm text-muted-foreground">
                <Calendar className="w-3 h-3" />
                <span>{lesson.dateAdded}</span>
              </div>
            </div>
          </div>
        </button>
      ))}
    </div>
  );
}
