create table if not exists drive_tokens (
  id int primary key default 1,
  access_token text,
  refresh_token text,
  scope text,
  token_type text,
  expiry_date bigint,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
