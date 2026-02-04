import MainLayout from '@/components/layout/MainLayout';
import WelcomeCard from '@/components/dashboard/WelcomeCard';
import StatCard from '@/components/dashboard/StatCard';
import CircularProgress from '@/components/dashboard/CircularProgress';
import LinearProgress from '@/components/dashboard/LinearProgress';
import Heatmap from '@/components/dashboard/Heatmap';
import { BookOpen } from 'lucide-react';

export default function Dashboard() {
  return (
    <MainLayout>
      <div className="page-enter space-y-8">
        {/* Welcome Section */}
        <WelcomeCard />

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <StatCard title="Prayer Completion" delay={100}>
            <div className="flex justify-center">
              <CircularProgress value={4} max={5} />
            </div>
          </StatCard>

          <StatCard title="Daily Tasks" delay={150}>
            <div className="space-y-4">
              <LinearProgress value={7} max={10} />
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
                <p className="text-4xl font-bold text-foreground">12</p>
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
          <Heatmap weeks={20} />
        </div>
      </div>
    </MainLayout>
  );
}
