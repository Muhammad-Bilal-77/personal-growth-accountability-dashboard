import { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import MainLayout from '@/components/layout/MainLayout';
import Header from '@/components/layout/Header';
import Heatmap from '@/components/dashboard/Heatmap';
import TrendCard from '@/components/analytics/TrendCard';
import TrendChart from '@/components/analytics/TrendChart';

const months = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

export default function ProgressAnalytics() {
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  return (
    <MainLayout>
      <div className="page-enter">
        <Header title="Progress Analytics" />

        {/* Heatmap Section */}
        <div className="card-static p-6 mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
            <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
              Activity Heatmap
            </h3>
            
            {/* Month Selector */}
            <div className="relative">
              <button
                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                className="flex items-center gap-2 px-4 py-2 bg-accent rounded-lg text-sm font-medium text-foreground hover:bg-muted transition-colors"
              >
                {months[selectedMonth]}
                <ChevronDown className="w-4 h-4" />
              </button>
              
              {isDropdownOpen && (
                <div className="absolute right-0 mt-2 w-40 bg-background border border-border rounded-lg shadow-lg z-10">
                  {months.map((month, index) => (
                    <button
                      key={month}
                      onClick={() => {
                        setSelectedMonth(index);
                        setIsDropdownOpen(false);
                      }}
                      className="w-full px-4 py-2 text-left text-sm hover:bg-accent transition-colors first:rounded-t-lg last:rounded-b-lg"
                    >
                      {month}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
          
          <Heatmap weeks={26} />
        </div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <TrendCard
            title="Weekly Prayer Rate"
            value="94%"
            trend="up"
            trendValue="+3%"
            delay={100}
          />
          <TrendCard
            title="Task Completion"
            value="87%"
            trend="up"
            trendValue="+8%"
            delay={150}
          />
          <TrendCard
            title="Consistency Score"
            value="92"
            trend="neutral"
            trendValue="Stable"
            delay={200}
          />
        </div>

        {/* Trend Graph */}
        <TrendChart height={250} />
      </div>
    </MainLayout>
  );
}
