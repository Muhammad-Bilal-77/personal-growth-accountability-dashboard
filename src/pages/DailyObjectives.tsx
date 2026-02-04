import { useEffect, useState } from 'react';
import MainLayout from '@/components/layout/MainLayout';
import Header from '@/components/layout/Header';
import TaskInput from '@/components/objectives/TaskInput';
import TaskItem from '@/components/objectives/TaskItem';
import LinearProgress from '@/components/dashboard/LinearProgress';
import { api } from '@/lib/api';
import ApiStatusBanner from '@/components/common/ApiStatusBanner';

interface Task {
  id: string;
  text: string;
  completed: boolean;
  due_at?: string | null;
}

const getToday = () => new Date().toISOString().split('T')[0];

export default function DailyObjectives() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [error, setError] = useState<string | undefined>();

  const loadTasks = async () => {
    try {
      const response = await api.get<{ data: Task[] }>(`/api/tasks?date=${getToday()}`);
      setTasks(response.data || []);
      setError(undefined);
    } catch (error) {
      console.error(error);
      setError('Unable to load tasks from the backend.');
    }
  };

  useEffect(() => {
    loadTasks();
  }, []);

  const handleAdd = async (text: string, dueAt?: string | null) => {
    try {
      const response = await api.post<{ data: Task }>("/api/tasks", {
        text,
        task_date: getToday(),
        due_at: dueAt || null,
      });
      if (response.data) {
        setTasks((prev) => [...prev, response.data]);
      }
      setError(undefined);
    } catch (error) {
      console.error(error);
      setError('Unable to create a task.');
    }
  };

  const handleToggle = async (id: string) => {
    const current = tasks.find((task) => task.id === id);
    if (!current) return;
    try {
      const response = await api.patch<{ data: Task }>(`/api/tasks/${id}`, {
        completed: !current.completed,
      });
      if (response.data) {
        setTasks((prev) => prev.map((task) => (task.id === id ? response.data : task)));
      }
      setError(undefined);
    } catch (error) {
      console.error(error);
      setError('Unable to update the task status.');
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await api.delete<{ success: boolean }>(`/api/tasks/${id}`);
      setTasks((prev) => prev.filter((task) => task.id !== id));
      setError(undefined);
    } catch (error) {
      console.error(error);
      setError('Unable to delete the task.');
    }
  };

  const completedCount = tasks.filter(t => t.completed).length;
  const totalCount = tasks.length;

  return (
    <MainLayout>
      <div className="page-enter">
        <Header title="Daily Objectives" />

        <ApiStatusBanner message={error} />

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
