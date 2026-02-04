import { useState } from 'react';
import { Plus } from 'lucide-react';

interface TaskInputProps {
  onAdd: (text: string, dueAt?: string | null) => void;
}

export default function TaskInput({ onAdd }: TaskInputProps) {
  const [text, setText] = useState('');
  const [time, setTime] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (text.trim()) {
      const dueAt = time ? new Date(`${new Date().toISOString().split('T')[0]}T${time}:00`).toISOString() : null;
      onAdd(text.trim(), dueAt);
      setText('');
      setTime('');
    }
  };

  return (
    <form onSubmit={handleSubmit} className="card-static p-6">
      <h3 className="text-sm font-medium text-muted-foreground mb-4 uppercase tracking-wider">
        Add New Objective
      </h3>
      <div className="flex gap-3">
        <input
          type="text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Enter your objective..."
          className="input-minimal flex-1 text-foreground placeholder:text-muted-foreground"
        />
        <input
          type="time"
          value={time}
          onChange={(e) => setTime(e.target.value)}
          className="input-minimal w-32 text-foreground"
          aria-label="Reminder time"
        />
        <button
          type="submit"
          disabled={!text.trim()}
          className="btn-primary flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Plus className="w-5 h-5" />
          <span className="hidden sm:inline">Add Task</span>
        </button>
      </div>
    </form>
  );
}
