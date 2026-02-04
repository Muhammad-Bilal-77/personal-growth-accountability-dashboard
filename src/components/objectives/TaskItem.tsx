import { useState } from 'react';
import { Check, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Task {
  id: string;
  text: string;
  completed: boolean;
}

interface TaskItemProps {
  task: Task;
  onToggle: (id: string) => void;
  onDelete: (id: string) => void;
  delay?: number;
}

export default function TaskItem({ task, onToggle, onDelete, delay = 0 }: TaskItemProps) {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <div
      className={cn(
        'flex items-center gap-3 p-4 rounded-xl border border-border bg-card transition-all duration-300 opacity-0 animate-fade-in group',
        task.completed && 'bg-muted/50'
      )}
      style={{ animationDelay: `${delay}ms` }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <button
        onClick={() => onToggle(task.id)}
        className={cn(
          'w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all duration-200 flex-shrink-0',
          task.completed
            ? 'bg-foreground border-foreground'
            : 'border-border hover:border-foreground'
        )}
        aria-label={`Mark "${task.text}" as ${task.completed ? 'incomplete' : 'complete'}`}
      >
        {task.completed && <Check className="w-4 h-4 text-background" />}
      </button>
      
      <span
        className={cn(
          'flex-1 transition-all duration-300',
          task.completed && 'line-through text-muted-foreground opacity-60'
        )}
      >
        {task.text}
      </span>
      
      <button
        onClick={() => onDelete(task.id)}
        className={cn(
          'p-2 rounded-lg transition-all duration-200',
          isHovered ? 'opacity-100 text-muted-foreground hover:text-foreground hover:bg-muted' : 'opacity-0'
        )}
        aria-label={`Delete "${task.text}"`}
      >
        <Trash2 className="w-4 h-4" />
      </button>
    </div>
  );
}
