interface LinearProgressProps {
  value: number;
  max: number;
  showLabel?: boolean;
}

export default function LinearProgress({ value, max, showLabel = true }: LinearProgressProps) {
  const percentage = Math.round((value / max) * 100);

  return (
    <div className="space-y-3">
      {showLabel && (
        <div className="flex justify-between items-center text-sm">
          <span className="text-muted-foreground">{value} of {max} completed</span>
          <span className="font-medium text-foreground">{percentage}%</span>
        </div>
      )}
      <div className="h-2 bg-muted rounded-full overflow-hidden">
        <div
          className="h-full bg-foreground rounded-full transition-all duration-700 ease-out"
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}
