alter table tasks add column if not exists due_at timestamptz;
alter table tasks add column if not exists reminder_sent boolean not null default false;
