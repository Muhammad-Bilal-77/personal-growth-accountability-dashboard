import { useState } from 'react';
import MainLayout from '@/components/layout/MainLayout';
import Header from '@/components/layout/Header';
import PrayerCard from '@/components/prayer/PrayerCard';
import CircularProgress from '@/components/dashboard/CircularProgress';

interface Prayer {
  id: string;
  name: string;
  time: string;
  completed: boolean;
}

const initialPrayers: Prayer[] = [
  { id: 'fajr', name: 'Fajr', time: 'Before Sunrise', completed: true },
  { id: 'dhuhr', name: 'Dhuhr', time: 'Early Afternoon', completed: true },
  { id: 'asr', name: 'Asr', time: 'Late Afternoon', completed: true },
  { id: 'maghrib', name: 'Maghrib', time: 'After Sunset', completed: true },
  { id: 'isha', name: 'Isha', time: 'Night', completed: false },
];

export default function PrayerTracker() {
  const [prayers, setPrayers] = useState<Prayer[]>(initialPrayers);

  const handleToggle = (id: string) => {
    setPrayers(prayers.map(prayer => 
      prayer.id === id ? { ...prayer, completed: !prayer.completed } : prayer
    ));
  };

  const completedCount = prayers.filter(p => p.completed).length;

  return (
    <MainLayout>
      <div className="page-enter">
        <Header title="Prayer Tracker" />

        <div className="max-w-2xl mx-auto">
          {/* Progress Overview */}
          <div className="card-elevated p-8 mb-8 flex flex-col items-center">
            <CircularProgress value={completedCount} max={5} size={160} strokeWidth={12} />
            <p className="mt-4 text-muted-foreground text-center">
              {completedCount === 5 
                ? 'All prayers completed! Well done.' 
                : `${5 - completedCount} prayer${5 - completedCount > 1 ? 's' : ''} remaining today`
              }
            </p>
          </div>

          {/* Prayer Cards */}
          <div className="space-y-4">
            {prayers.map((prayer, index) => (
              <PrayerCard
                key={prayer.id}
                prayer={prayer}
                onToggle={handleToggle}
                delay={index * 50}
              />
            ))}
          </div>

          {/* Reset Notice */}
          <p className="text-center text-sm text-muted-foreground mt-8">
            Resets daily at midnight
          </p>
        </div>
      </div>
    </MainLayout>
  );
}
