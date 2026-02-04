alter table drive_tokens add column if not exists folder_id text;

alter table lessons add column if not exists drive_file_id text;
