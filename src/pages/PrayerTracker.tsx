import { useEffect, useState, useMemo, useCallback } from 'react';
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

const TIMINGS_CACHE_KEY = 'prayer_timings_cache';
const TIMINGS_CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours

export default function PrayerTracker() {
  const [prayers, setPrayers] = useState<Prayer[]>([]);
  const [prayerDate, setPrayerDate] = useState<string | undefined>();
  const [history, setHistory] = useState<PrayerHistoryDay[]>([]);
  const [timings, setTimings] = useState<PrayerTimings | undefined>();
  const [error, setError] = useState<string | undefined>();
  const [isLoadingPrayers, setIsLoadingPrayers] = useState(true);
  const [isLoadingHistory, setIsLoadingHistory] = useState(true);
  const [isLoadingTimings, setIsLoadingTimings] = useState(true);

  // Load cached timings from localStorage
  const loadCachedTimings = useCallback(() => {
    try {
      const cached = localStorage.getItem(TIMINGS_CACHE_KEY);
      if (cached) {
        const parsed = JSON.parse(cached);
        const age = Date.now() - parsed.timestamp;
        if (age < TIMINGS_CACHE_DURATION) {
          setTimings(parsed.data);
          setIsLoadingTimings(false);
          return true;
        }
      }
    } catch (err) {
      console.error('Failed to load cached timings:', err);
    }
    return false;
  }, []);

  // Save timings to localStorage
  const cacheTimings = useCallback((data: PrayerTimings) => {
    try {
      localStorage.setItem(TIMINGS_CACHE_KEY, JSON.stringify({
        data,
        timestamp: Date.now()
      }));
    } catch (err) {
      console.error('Failed to cache timings:', err);
    }
  }, []);

  const loadPrayers = useCallback(async () => {
    try {
      setIsLoadingPrayers(true);
      const response = await api.get<{ data: Prayer[]; date?: string }>("/api/prayers/today");
      setPrayers(response.data || []);
      setPrayerDate(response.date);
    } catch (error) {
      console.error(error);
      setError('Unable to load prayers from the backend.');
    } finally {
      setIsLoadingPrayers(false);
    }
  }, []);

  const loadHistory = useCallback(async () => {
    try {
      setIsLoadingHistory(true);
      const response = await api.get<{ data: PrayerHistoryDay[] }>("/api/prayers/history?days=7");
      setHistory(response.data || []);
    } catch (error) {
      console.error(error);
      // Don't show error for history, it's not critical
    } finally {
      setIsLoadingHistory(false);
    }
  }, []);

  const loadLocationAndTimings = useCallback(async () => {
    // First check cache
    if (loadCachedTimings()) {
      return; // Use cached data
    }

    try {
      setIsLoadingTimings(true);
      // Use timeout to prevent geolocation from blocking too long
      const position = await Promise.race([
        new Promise<GeolocationPosition>((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(resolve, reject, {
            timeout: 5000,
            maximumAge: 600000, // Use 10-minute old position
            enableHighAccuracy: false // Faster, less accurate
          });
        }),
        new Promise<never>((_, reject) => 
          setTimeout(() => reject(new Error('Geolocation timeout')), 5000)
        )
      ]);
      
      const lat = position.coords.latitude;
      const lng = position.coords.longitude;
      const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;

      // Don't wait for location save to complete
      api.post("/api/settings/location", { lat, lng, timezone }).catch(console.error);
      
      const response = await api.get<{ data: PrayerTimings }>(
        `/api/prayers/timings?lat=${lat}&lng=${lng}&timezone=${timezone}`
      );
      setTimings(response.data);
      cacheTimings(response.data);
    } catch (err) {
      console.error(err);
      // Silently fail for timings, not critical for main functionality
    } finally {
      setIsLoadingTimings(false);
    }
  }, [loadCachedTimings, cacheTimings]);

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
    // Load all data in parallel for faster loading
    Promise.all([
      loadPrayers(),
      loadHistory(),
      loadLocationAndTimings()
    ]);
  }, [loadPrayers, loadHistory, loadLocationAndTimings]);

  const handleToggle = useCallback(async (id: string) => {
    const current = prayers.find((prayer) => prayer.id === id);
    if (!current) return;
    
    // Optimistically update UI
    setPrayers((prev) =>
      prev.map((prayer) =>
        prayer.id === id ? { ...prayer, completed: !prayer.completed } : prayer
      )
    );
    
    try {
      await api.post("/api/prayers/" + id + "/complete", {
        completed: !current.completed,
        date: prayerDate,
      });
      // Reload history in background without blocking
      loadHistory();
    } catch (error) {
      console.error(error);
      // Revert optimistic update on error
      setPrayers((prev) =>
        prev.map((prayer) =>
          prayer.id === id ? { ...prayer, completed: current.completed } : prayer
        )
      );
      setError('Unable to update prayer status.');
    }
  }, [prayers, prayerDate, loadHistory]);

  const completedCount = useMemo(() => prayers.filter(p => p.completed).length, [prayers]);

  return (
    <MainLayout>
      <div className="page-enter">
        <Header title="Prayer Tracker" />

        <ApiStatusBanner message={error} />

        {isLoadingTimings && (
          <div className="card-static p-6 mb-6 animate-pulse">
            <div className="h-4 w-40 bg-muted rounded mb-4"></div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="p-3 border border-border rounded-lg">
                  <div className="h-3 w-12 bg-muted rounded mb-2"></div>
                  <div className="h-6 w-16 bg-muted rounded"></div>
                </div>
              ))}
            </div>
          </div>
        )}

        {!isLoadingTimings && timings && (
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
          {/* Loading Skeleton for Progress */}
          {isLoadingPrayers ? (
            <div className="card-elevated p-8 mb-8 flex flex-col items-center animate-pulse">
              <div className="w-40 h-40 rounded-full bg-muted"></div>
              <div className="h-4 w-48 bg-muted rounded mt-4"></div>
            </div>
          ) : (
            <div className="card-elevated p-8 mb-8 flex flex-col items-center">
              <CircularProgress value={completedCount} max={5} size={160} strokeWidth={12} />
              <p className="mt-4 text-muted-foreground text-center">
                {completedCount === 5 
                  ? 'All prayers completed! Well done.' 
                  : `${5 - completedCount} prayer${5 - completedCount > 1 ? 's' : ''} remaining today`
                }
              </p>
            </div>
          )}

          {/* Prayer Cards */}
          <div className="space-y-4">
            {isLoadingPrayers ? (
              // Loading skeleton for prayer cards
              [1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="card-elevated p-5 flex items-center justify-between animate-pulse">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-muted"></div>
                    <div>
                      <div className="h-5 w-20 bg-muted rounded mb-2"></div>
                      <div className="h-4 w-16 bg-muted rounded"></div>
                    </div>
                  </div>
                  <div className="w-12 h-6 bg-muted rounded-full"></div>
                </div>
              ))
            ) : (
              prayers.map((prayer, index) => (
                <PrayerCard
                  key={prayer.id}
                  prayer={prayer}
                  onToggle={handleToggle}
                  delay={index * 50}
                />
              ))
            )}
          </div>

          {!isLoadingPrayers && prayers.length === 0 && !error && (
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
              {isLoadingHistory ? (
                // Loading skeleton for history
                [1, 2, 3].map((i) => (
                  <div key={i} className="border border-border rounded-lg p-4 animate-pulse">
                    <div className="flex items-center justify-between mb-3">
                      <div className="h-4 w-24 bg-muted rounded"></div>
                      <div className="h-4 w-20 bg-muted rounded"></div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {[1, 2, 3, 4, 5].map((j) => (
                        <div key={j} className="h-6 w-16 bg-muted rounded-full"></div>
                      ))}
                    </div>
                  </div>
                ))
              ) : (
                history.map((day) => {
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
              })
              )}

              {!isLoadingHistory && history.length === 0 && (
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
