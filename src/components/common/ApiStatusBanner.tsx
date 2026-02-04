interface ApiStatusBannerProps {
  message?: string;
}

export default function ApiStatusBanner({ message }: ApiStatusBannerProps) {
  if (!message) return null;

  return (
    <div className="card-static p-4 border border-border mb-6">
      <p className="text-sm text-foreground">{message}</p>
      <p className="text-xs text-muted-foreground mt-1">
        Ensure the backend is running (npm run dev:all) and .env is configured.
      </p>
    </div>
  );
}
