import { useEffect, useState } from 'react';
import { X } from 'lucide-react';

interface EventModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (event: { title: string; category: string; notes: string }) => void;
  onDelete?: () => void;
  date: Date;
  initialEvent?: { title: string; category: string; notes?: string } | null;
}

const categories = ['Personal', 'Academic', 'Spiritual', 'Health', 'Work'];

export default function EventModal({
  isOpen,
  onClose,
  onSave,
  onDelete,
  date,
  initialEvent,
}: EventModalProps) {
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState(categories[0]);
  const [notes, setNotes] = useState('');

  const isEditing = Boolean(initialEvent);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (title.trim()) {
      onSave({ title: title.trim(), category, notes: notes.trim() });
      setTitle('');
      setNotes('');
      setCategory(categories[0]);
      onClose();
    }
  };

  const handleDelete = () => {
    if (!onDelete) return;
    onDelete();
    onClose();
  };

  useEffect(() => {
    if (!isOpen) return;
    if (initialEvent) {
      setTitle(initialEvent.title);
      setCategory(initialEvent.category);
      setNotes(initialEvent.notes ?? '');
      return;
    }
    setTitle('');
    setCategory(categories[0]);
    setNotes('');
  }, [isOpen, initialEvent]);

  const formattedDate = date.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-foreground/20 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-background border border-border rounded-2xl shadow-xl max-w-md w-full p-6 animate-scale-in">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xl font-bold text-foreground">{isEditing ? 'Edit Event' : 'New Event'}</h2>
            <p className="text-sm text-muted-foreground">{formattedDate}</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-accent transition-colors"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-muted-foreground mb-2">
              Event Title
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Enter event title..."
              className="w-full input-minimal"
              autoFocus
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-muted-foreground mb-2">
              Category
            </label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full bg-transparent border border-border rounded-lg p-3 text-foreground focus:outline-none focus:ring-2 focus:ring-foreground"
            >
              {categories.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-muted-foreground mb-2">
              Notes
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Add notes..."
              rows={3}
              className="w-full bg-transparent border border-border rounded-lg p-3 text-foreground focus:outline-none focus:ring-2 focus:ring-foreground resize-none"
            />
          </div>

          <div className="flex flex-col gap-2">
            <button
              type="submit"
              disabled={!title.trim()}
              className="w-full btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isEditing ? 'Update Event' : 'Save Event'}
            </button>
            {onDelete && (
              <button
                type="button"
                className="w-full btn-secondary"
                onClick={handleDelete}
              >
                Delete Event
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}
