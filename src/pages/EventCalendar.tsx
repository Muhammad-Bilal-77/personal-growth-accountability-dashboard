import { useState } from 'react';
import MainLayout from '@/components/layout/MainLayout';
import Header from '@/components/layout/Header';
import CalendarGrid from '@/components/calendar/CalendarGrid';
import EventModal from '@/components/calendar/EventModal';
import { Calendar, Tag } from 'lucide-react';

interface Event {
  id: string;
  title: string;
  date: string;
  category: string;
  notes?: string;
}

const mockEvents: Event[] = [
  { id: '1', title: 'Study Group Meeting', date: '2024-02-15', category: 'Academic' },
  { id: '2', title: 'Doctor Appointment', date: '2024-02-18', category: 'Health' },
  { id: '3', title: 'Family Dinner', date: '2024-02-20', category: 'Personal' },
];

export default function EventCalendar() {
  const [events, setEvents] = useState<Event[]>(mockEvents);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>();
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleSelectDate = (date: Date) => {
    setSelectedDate(date);
    setIsModalOpen(true);
  };

  const handleSaveEvent = (event: { title: string; category: string; notes: string }) => {
    if (selectedDate) {
      const newEvent: Event = {
        id: Date.now().toString(),
        title: event.title,
        date: selectedDate.toISOString().split('T')[0],
        category: event.category,
        notes: event.notes,
      };
      setEvents([...events, newEvent]);
    }
  };

  // Get events for selected date
  const selectedDateEvents = selectedDate
    ? events.filter(e => e.date === selectedDate.toISOString().split('T')[0])
    : [];

  return (
    <MainLayout>
      <div className="page-enter">
        <Header title="Event Calendar" />

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
                <div
                  key={event.id}
                  className="flex items-start gap-3 p-3 rounded-lg hover:bg-accent transition-colors opacity-0 animate-fade-in"
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
                      {new Date(event.date).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                      })}
                    </p>
                  </div>
                </div>
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
                    <div key={event.id} className="p-3 bg-accent rounded-lg">
                      <p className="font-medium text-foreground">{event.title}</p>
                      <p className="text-xs text-muted-foreground">{event.category}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Event Modal */}
        <EventModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          onSave={handleSaveEvent}
          date={selectedDate || new Date()}
        />
      </div>
    </MainLayout>
  );
}
