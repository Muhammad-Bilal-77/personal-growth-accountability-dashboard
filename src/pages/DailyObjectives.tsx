import { useState } from 'react';
import MainLayout from '@/components/layout/MainLayout';
import Header from '@/components/layout/Header';
import TaskInput from '@/components/objectives/TaskInput';
import TaskItem from '@/components/objectives/TaskItem';
import LinearProgress from '@/components/dashboard/LinearProgress';

interface Task {
  id: string;
  text: string;
  completed: boolean;
}

const initialTasks: Task[] = [
  { id: '1', text: 'Complete morning reflection', completed: true },
  { id: '2', text: 'Review study notes for 30 minutes', completed: true },
  { id: '3', text: 'Read 20 pages of current book', completed: true },
  { id: '4', text: 'Exercise for at least 20 minutes', completed: false },
  { id: '5', text: 'Practice gratitude journaling', completed: false },
  { id: '6', text: 'Review weekly goals progress', completed: false },
  { id: '7', text: 'Prepare materials for tomorrow', completed: true },
];

export default function DailyObjectives() {
  const [tasks, setTasks] = useState<Task[]>(initialTasks);

  const handleAdd = (text: string) => {
    const newTask: Task = {
      id: Date.now().toString(),
      text,
      completed: false,
    };
    setTasks([...tasks, newTask]);
  };

  const handleToggle = (id: string) => {
    setTasks(tasks.map(task =>
      task.id === id ? { ...task, completed: !task.completed } : task
    ));
  };

  const handleDelete = (id: string) => {
    setTasks(tasks.filter(task => task.id !== id));
  };

  const completedCount = tasks.filter(t => t.completed).length;
  const totalCount = tasks.length;

  return (
    <MainLayout>
      <div className="page-enter">
        <Header title="Daily Objectives" />

        <div className="max-w-2xl mx-auto space-y-6">
          {/* Add Task Section */}
          <TaskInput onAdd={handleAdd} />

          {/* Progress Section */}
          <div className="card-static p-6">
            <div className="mb-4">
              <p className="text-lg font-medium text-foreground">
                {completedCount} of {totalCount} Tasks Completed
              </p>
            </div>
            <LinearProgress value={completedCount} max={totalCount} showLabel={false} />
          </div>

          {/* Task List */}
          <div className="space-y-3">
            {tasks.map((task, index) => (
              <TaskItem
                key={task.id}
                task={task}
                onToggle={handleToggle}
                onDelete={handleDelete}
                delay={index * 30}
              />
            ))}
          </div>

          {tasks.length === 0 && (
            <div className="text-center py-12 text-muted-foreground">
              <p className="text-lg mb-2">No objectives yet</p>
              <p className="text-sm">Add your first objective above to get started</p>
            </div>
          )}
        </div>
      </div>
    </MainLayout>
  );
}
