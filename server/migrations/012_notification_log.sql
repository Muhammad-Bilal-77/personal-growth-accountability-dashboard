create table if not exists notification_log (
  id uuid primary key default gen_random_uuid(),
  notification_type text not null,
  reference_date date not null,
  reference_id text,
  created_at timestamptz not null default now(),
  unique (notification_type, reference_date, reference_id)
);
