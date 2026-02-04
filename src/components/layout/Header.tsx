import { useMemo } from 'react';

interface HeaderProps {
  title: string;
}

export default function Header({ title }: HeaderProps) {
  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good Morning';
    if (hour < 17) return 'Good Afternoon';
    return 'Good Evening';
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
    <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-8 pt-16 lg:pt-0">
      <h1 className="text-foreground">{title}</h1>
      <div className="text-right">
        <p className="text-lg text-foreground font-medium">{greeting}</p>
        <p className="text-sm text-muted-foreground">{formattedDate}</p>
      </div>
    </header>
  );
}
