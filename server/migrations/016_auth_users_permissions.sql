alter table auth_users disable row level security;

grant select on auth_users to anon, authenticated;
