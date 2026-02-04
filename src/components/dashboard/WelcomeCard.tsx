import { useMemo } from 'react';

const quotes = [
  "The journey of a thousand miles begins with a single step.",
  "Consistency is the key to achieving and maintaining momentum.",
  "Small daily improvements lead to stunning results.",
  "Discipline is the bridge between goals and accomplishment.",
  "Success is the sum of small efforts repeated day in and day out.",
];

export default function WelcomeCard() {
  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good Morning';
    if (hour < 17) return 'Good Afternoon';
    return 'Good Evening';
  }, []);

  const quote = useMemo(() => {
    return quotes[Math.floor(Math.random() * quotes.length)];
  }, []);

  const formattedDate = useMemo(() => {
    return new Date().toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  }, []);

  return (
    <div className="card-elevated p-8 opacity-0 animate-fade-in">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-2">
            {greeting}
          </h2>
          <p className="text-muted-foreground">{formattedDate}</p>
        </div>
        <div className="max-w-md">
          <p className="text-foreground/80 italic text-lg leading-relaxed">
            "{quote}"
          </p>
        </div>
      </div>
    </div>
  );
}
