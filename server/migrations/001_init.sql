create extension if not exists "pgcrypto";

create table if not exists tasks (
  id uuid primary key default gen_random_uuid(),
  text text not null,
  completed boolean not null default false,
  task_date date not null default current_date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists prayers (
  id text primary key,
  name text not null,
  time_label text not null,
  sort_order int not null default 0
);

create table if not exists prayer_logs (
  id uuid primary key default gen_random_uuid(),
  prayer_id text not null references prayers(id) on delete cascade,
  log_date date not null default current_date,
  completed boolean not null default false,
  created_at timestamptz not null default now(),
  unique (prayer_id, log_date)
);

create table if not exists events (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  event_date date not null,
  category text not null,
  notes text,
  created_at timestamptz not null default now()
);

create table if not exists subjects (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  sort_order int not null default 0
);

create table if not exists chapters (
  id uuid primary key default gen_random_uuid(),
  subject_id uuid not null references subjects(id) on delete cascade,
  name text not null,
  sort_order int not null default 0
);

create table if not exists lessons (
  id uuid primary key default gen_random_uuid(),
  chapter_id uuid not null references chapters(id) on delete cascade,
  title text not null,
  content text,
  date_added date not null default current_date
);

create table if not exists lesson_views (
  id uuid primary key default gen_random_uuid(),
  lesson_id uuid not null references lessons(id) on delete cascade,
  viewed_at timestamptz not null default now()
);

create table if not exists activity_log (
  id uuid primary key default gen_random_uuid(),
  activity_date date not null,
  count int not null default 0,
  created_at timestamptz not null default now(),
  unique (activity_date)
);

create table if not exists settings_sections (
  id text primary key,
  title text not null,
  description text not null,
  icon text not null,
  sort_order int not null default 0
);
