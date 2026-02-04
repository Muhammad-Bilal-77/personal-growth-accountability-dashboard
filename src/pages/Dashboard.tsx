import { useEffect, useState } from 'react';
import MainLayout from '@/components/layout/MainLayout';
import WelcomeCard from '@/components/dashboard/WelcomeCard';
import StatCard from '@/components/dashboard/StatCard';
import CircularProgress from '@/components/dashboard/CircularProgress';
import LinearProgress from '@/components/dashboard/LinearProgress';
import Heatmap from '@/components/dashboard/Heatmap';
import { BookOpen } from 'lucide-react';
import { api } from '@/lib/api';
import ApiStatusBanner from '@/components/common/ApiStatusBanner';

interface DashboardStats {
  prayers: { completed: number; total: number };
  tasks: { completed: number; total: number };
  lessonsAccessed: number;
}

export default function Dashboard() {
  const [stats, setStats] = useState<DashboardStats>({
    prayers: { completed: 0, total: 5 },
    tasks: { completed: 0, total: 0 },
    lessonsAccessed: 0,
  });
  const [heatmapData, setHeatmapData] = useState<Record<string, number>>({});
  const [error, setError] = useState<string | undefined>();

  const loadDashboard = async () => {
    try {
      const [statsResponse, heatmapResponse] = await Promise.all([
        api.get<{ data: DashboardStats }>("/api/dashboard/stats"),
        api.get<{ data: Record<string, number> }>("/api/analytics/heatmap?weeks=20"),
      ]);
      if (statsResponse.data) {
        setStats(statsResponse.data);
      }
      setHeatmapData(heatmapResponse.data || {});
      setError(undefined);
    } catch (error) {
      console.error(error);
      setError('Unable to load dashboard data.');
    }
  };

  useEffect(() => {
    loadDashboard();
  }, []);

  return (
    <MainLayout>
      <div className="page-enter space-y-8">
        {/* Welcome Section */}
        <WelcomeCard />

        <ApiStatusBanner message={error} />

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <StatCard title="Prayer Completion" delay={100}>
            <div className="flex justify-center">
              <CircularProgress value={stats.prayers.completed} max={stats.prayers.total} />
            </div>
          </StatCard>

          <StatCard title="Daily Tasks" delay={150}>
            <div className="space-y-4">
              <LinearProgress value={stats.tasks.completed} max={Math.max(stats.tasks.total, 1)} />
              <p className="text-sm text-muted-foreground text-center">
                Stay consistent to build momentum
              </p>
            </div>
          </StatCard>

          <StatCard title="Lessons Accessed" delay={200}>
            <div className="flex items-center justify-center gap-4">
              <div className="w-16 h-16 rounded-xl bg-muted flex items-center justify-center">
                <BookOpen className="w-8 h-8 text-foreground" />
              </div>
              <div>
                <p className="text-4xl font-bold text-foreground">{stats.lessonsAccessed}</p>
                <p className="text-sm text-muted-foreground">This week</p>
              </div>
            </div>
          </StatCard>
        </div>

        {/* Heatmap Section */}
        <div className="card-static p-6 opacity-0 animate-fade-in" style={{ animationDelay: '250ms' }}>
          <h3 className="text-sm font-medium text-muted-foreground mb-6 uppercase tracking-wider">
            Productivity Heatmap
          </h3>
          <Heatmap weeks={20} data={heatmapData} />
        </div>
      </div>
    </MainLayout>
  );
}
