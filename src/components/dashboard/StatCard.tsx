import { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface StatCardProps {
  title: string;
  children: ReactNode;
  className?: string;
  delay?: number;
}

export default function StatCard({ title, children, className, delay = 0 }: StatCardProps) {
  return (
    <div
      className={cn(
        'card-elevated p-6 opacity-0 animate-fade-in',
        className
      )}
      style={{ animationDelay: `${delay}ms` }}
    >
      <h3 className="text-sm font-medium text-muted-foreground mb-4 uppercase tracking-wider">
        {title}
      </h3>
      {children}
    </div>
  );
}
