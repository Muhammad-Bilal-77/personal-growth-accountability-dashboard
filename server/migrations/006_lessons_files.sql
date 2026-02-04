alter table lessons add column if not exists file_url text;
alter table lessons add column if not exists file_name text;
alter table lessons add column if not exists updated_at timestamptz not null default now();
