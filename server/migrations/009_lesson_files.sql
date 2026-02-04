create table if not exists lesson_files (
  id uuid primary key default gen_random_uuid(),
  lesson_id uuid not null references lessons(id) on delete cascade,
  file_url text not null,
  file_name text not null,
  drive_file_id text,
  created_at timestamptz not null default now()
);
