create table if not exists user_settings (
  id int primary key default 1,
  lat numeric,
  lng numeric,
  timezone text,
  updated_at timestamptz not null default now()
);
