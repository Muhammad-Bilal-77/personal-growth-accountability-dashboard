import { useEffect, useState } from 'react';
import MainLayout from '@/components/layout/MainLayout';
import Header from '@/components/layout/Header';
import PrayerCard from '@/components/prayer/PrayerCard';
import CircularProgress from '@/components/dashboard/CircularProgress';
import { api } from '@/lib/api';
import ApiStatusBanner from '@/components/common/ApiStatusBanner';
import { toast } from '@/components/ui/sonner';

interface Prayer {
  id: string;
  name: string;
  time: string;
  completed: boolean;
}

interface PrayerHistoryDay {
  date: string;
  prayers: Prayer[];
}

interface PrayerTimings {
  timings: Record<string, string>;
  timezone?: string;
}

export default function PrayerTracker() {
  const [prayers, setPrayers] = useState<Prayer[]>([]);
  const [prayerDate, setPrayerDate] = useState<string | undefined>();
  const [history, setHistory] = useState<PrayerHistoryDay[]>([]);
  const [timings, setTimings] = useState<PrayerTimings | undefined>();
  const [error, setError] = useState<string | undefined>();

  const loadPrayers = async () => {
    try {
      const response = await api.get<{ data: Prayer[]; date?: string }>("/api/prayers/today");
      setPrayers(response.data || []);
      setPrayerDate(response.date);
      setError(undefined);
    } catch (error) {
      console.error(error);
      setError('Unable to load prayers from the backend.');
    }
  };

  const loadHistory = async () => {
    try {
      const response = await api.get<{ data: PrayerHistoryDay[] }>("/api/prayers/history?days=7");
      setHistory(response.data || []);
      setError(undefined);
    } catch (error) {
      console.error(error);
      setError('Unable to load prayer history.');
    }
  };

  const loadLocationAndTimings = async () => {
    try {
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject);
      });
      const lat = position.coords.latitude;
      const lng = position.coords.longitude;
      const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;

      await api.post("/api/settings/location", { lat, lng, timezone });
      const response = await api.get<{ data: PrayerTimings }>(`/api/prayers/timings?lat=${lat}&lng=${lng}&timezone=${timezone}`);
      setTimings(response.data);
    } catch (err) {
      console.error(err);
      setError('Unable to fetch prayer timings.');
    }
  };

  const handleSendTimingsEmail = async () => {
    try {
      await api.post("/api/prayers/timings/email");
      toast("Prayer timings emailed");
    } catch (err) {
      console.error(err);
      setError("Unable to send prayer timings email.");
    }
  };

  useEffect(() => {
    loadPrayers();
    loadHistory();
    loadLocationAndTimings();
  }, []);

  const handleToggle = async (id: string) => {
    const current = prayers.find((prayer) => prayer.id === id);
    if (!current) return;
    try {
      await api.post("/api/prayers/" + id + "/complete", {
        completed: !current.completed,
        date: prayerDate,
      });
      setPrayers((prev) =>
        prev.map((prayer) =>
          prayer.id === id ? { ...prayer, completed: !prayer.completed } : prayer
        )
      );
      loadHistory();
      setError(undefined);
    } catch (error) {
      console.error(error);
      setError('Unable to update prayer status.');
    }
  };

  const completedCount = prayers.filter(p => p.completed).length;

  return (
    <MainLayout>
      <div className="page-enter">
        <Header title="Prayer Tracker" />

        <ApiStatusBanner message={error} />

        {timings && (
          <div className="card-static p-6 mb-6">
            <h3 className="text-sm font-medium text-muted-foreground mb-4 uppercase tracking-wider">
              Today's Prayer Times
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              {['Fajr', 'Dhuhr', 'Asr', 'Maghrib', 'Isha'].map((name) => (
                <div key={name} className="p-3 border border-border rounded-lg">
                  <p className="text-xs text-muted-foreground">{name}</p>
                  <p className="text-lg font-semibold text-foreground">
                    {timings.timings?.[name] || '--:--'}
                  </p>
                </div>
              ))}
            </div>
            <div className="mt-4">
              <button className="btn-secondary" onClick={handleSendTimingsEmail}>
                Email Prayer Timings
              </button>
            </div>
          </div>
        )}

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

          {prayers.length === 0 && !error && (
            <div className="text-center py-12 text-muted-foreground">
              <p className="text-lg mb-2">No prayers found</p>
              <p className="text-sm">Seed data or check the backend connection.</p>
            </div>
          )}

          {/* Reset Notice */}
          <p className="text-center text-sm text-muted-foreground mt-8">
            Resets daily at 12 AM
          </p>

          {/* History */}
          <div className="mt-10 card-static p-6">
            <h3 className="text-sm font-medium text-muted-foreground mb-4 uppercase tracking-wider">
              Prayer History (Last 7 Days)
            </h3>
            <div className="space-y-4">
              {history.map((day) => {
                const completedCount = day.prayers.filter((p) => p.completed).length;
                return (
                  <div key={day.date} className="border border-border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-3">
                      <p className="font-medium text-foreground">
                        {new Date(day.date).toLocaleDateString('en-US', {
                          weekday: 'short',
                          month: 'short',
                          day: 'numeric',
                        })}
                      </p>
                      <span className="text-sm text-muted-foreground">
                        {completedCount}/{day.prayers.length} completed
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {day.prayers.map((prayer) => (
                        <span
                          key={prayer.id}
                          className={
                            prayer.completed
                              ? 'px-3 py-1 rounded-full bg-foreground text-background text-xs'
                              : 'px-3 py-1 rounded-full bg-accent text-foreground text-xs border border-border'
                          }
                        >
                          {prayer.name}
                        </span>
                      ))}
                    </div>
                  </div>
                );
              })}

              {history.length === 0 && !error && (
                <div className="text-center py-8 text-muted-foreground">
                  <p>No history yet</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </MainLayout>
  );
}
