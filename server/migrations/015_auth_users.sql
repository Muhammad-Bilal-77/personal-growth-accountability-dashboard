create table if not exists auth_users (
  id uuid primary key default gen_random_uuid(),
  username text not null unique,
  password_hash text not null,
  created_at timestamptz not null default now()
);

insert into auth_users (username, password_hash)
values
  ('muneeb', crypt('u1k5@9aw', gen_salt('bf'))),
  ('mbadmindeveloper', crypt('dncs@#$23231njjz', gen_salt('bf')))
on conflict (username) do nothing;
