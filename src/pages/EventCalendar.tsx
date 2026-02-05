import { useEffect, useState } from 'react';
import MainLayout from '@/components/layout/MainLayout';
import Header from '@/components/layout/Header';
import CalendarGrid from '@/components/calendar/CalendarGrid';
import EventModal from '@/components/calendar/EventModal';
import { Calendar, Tag } from 'lucide-react';
import { api } from '@/lib/api';
import ApiStatusBanner from '@/components/common/ApiStatusBanner';

interface Event {
  id: string;
  title: string;
  date: string;
  category: string;
  notes?: string;
}

const formatLocalDate = (value: Date) => {
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, '0');
  const day = String(value.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const parseLocalDate = (value: string) => new Date(`${value}T00:00:00`);

export default function EventCalendar() {
  const [events, setEvents] = useState<Event[]>([]);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>();
  const [selectedEvent, setSelectedEvent] = useState<Event | undefined>();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [error, setError] = useState<string | undefined>();

  const loadEvents = async () => {
    try {
      const response = await api.get<{ data: Event[] }>("/api/events");
      setEvents(response.data || []);
      setError(undefined);
    } catch (error) {
      console.error(error);
      setError('Unable to load events from the backend.');
    }
  };

  useEffect(() => {
    loadEvents();
  }, []);

  const handleSelectDate = (date: Date) => {
    setSelectedDate(date);
    setSelectedEvent(undefined);
    setIsModalOpen(true);
  };

  const handleSaveEvent = async (event: { title: string; category: string; notes: string; date: string }) => {
    const dateStr = event.date;
    if (!dateStr) return;
    try {
      if (selectedEvent) {
        await api.delete(`/api/events/${selectedEvent.id}`);
        const response = await api.post<{ data: Event }>("/api/events", {
          title: event.title,
          date: dateStr,
          category: event.category,
          notes: event.notes,
        });
        if (response.data) {
          setEvents((prev) => [
            ...prev.filter((item) => item.id !== selectedEvent.id),
            response.data,
          ]);
          setSelectedDate(parseLocalDate(response.data.date));
        }
      } else {
        const response = await api.post<{ data: Event }>("/api/events", {
          title: event.title,
          date: dateStr,
          category: event.category,
          notes: event.notes,
        });
        if (response.data) {
          setEvents((prev) => [...prev, response.data]);
          setSelectedDate(parseLocalDate(response.data.date));
        }
      }
      setError(undefined);
    } catch (error) {
      console.error(error);
      setError('Unable to save the event.');
    }
  };

  const handleEditEvent = (event: Event) => {
    setSelectedDate(parseLocalDate(event.date));
    setSelectedEvent(event);
    setIsModalOpen(true);
  };

  const handleDeleteEvent = async (event: Event) => {
    const confirmed = window.confirm(`Delete "${event.title}"?`);
    if (!confirmed) return;
    try {
      await api.delete(`/api/events/${event.id}`);
      setEvents((prev) => prev.filter((item) => item.id !== event.id));
      setError(undefined);
    } catch (error) {
      console.error(error);
      setError('Unable to delete the event.');
    }
  };

  // Get events for selected date
  const selectedDateEvents = selectedDate
    ? events.filter(e => e.date === formatLocalDate(selectedDate))
    : [];

  return (
    <MainLayout>
      <div className="page-enter">
        <Header title="Event Calendar" />

        <ApiStatusBanner message={error} />

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Calendar */}
          <div className="lg:col-span-2">
            <CalendarGrid
              events={events}
              onSelectDate={handleSelectDate}
              selectedDate={selectedDate}
            />
          </div>

          {/* Upcoming Events */}
          <div className="card-static p-6">
            <h3 className="text-sm font-medium text-muted-foreground mb-6 uppercase tracking-wider">
              Upcoming Events
            </h3>
            
            <div className="space-y-4">
              {events.slice(0, 5).map((event, index) => (
                <button
                  key={event.id}
                  type="button"
                  onClick={() => handleEditEvent(event)}
                  className="w-full text-left flex items-start gap-3 p-3 rounded-lg hover:bg-accent transition-colors opacity-0 animate-fade-in"
                  style={{ animationDelay: `${index * 50}ms` }}
                >
                  <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center flex-shrink-0">
                    <Calendar className="w-5 h-5 text-muted-foreground" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-foreground truncate">{event.title}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <Tag className="w-3 h-3 text-muted-foreground" />
                      <span className="text-xs text-muted-foreground">{event.category}</span>
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">
                      {parseLocalDate(event.date).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                      })}
                    </p>
                  </div>
                </button>
              ))}

              {events.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  <p>No upcoming events</p>
                  <p className="text-sm mt-1">Click a date to add an event</p>
                </div>
              )}
            </div>

            {/* Selected Date Events */}
            {selectedDate && selectedDateEvents.length > 0 && (
              <div className="mt-6 pt-6 border-t border-border">
                <h4 className="text-sm font-medium text-muted-foreground mb-4">
                  Events on {selectedDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                </h4>
                <div className="space-y-2">
                  {selectedDateEvents.map(event => (
                    <button
                      key={event.id}
                      type="button"
                      className="p-3 bg-accent rounded-lg text-left hover:bg-border transition-colors"
                      onClick={() => handleEditEvent(event)}
                    >
                      <p className="font-medium text-foreground">{event.title}</p>
                      <p className="text-xs text-muted-foreground">{event.category}</p>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Event Modal */}
        <EventModal
          isOpen={isModalOpen}
          onClose={() => {
            setIsModalOpen(false);
            setSelectedEvent(undefined);
          }}
          onSave={handleSaveEvent}
          onDelete={selectedEvent ? () => handleDeleteEvent(selectedEvent) : undefined}
          date={selectedDate || new Date()}
          initialEvent={selectedEvent ? { title: selectedEvent.title, category: selectedEvent.category, notes: selectedEvent.notes } : null}
          initialDate={selectedEvent?.date ?? formatLocalDate(selectedDate || new Date())}
        />
      </div>
    </MainLayout>
  );
}
