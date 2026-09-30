alter table public.usage
  add column if not exists exports_count integer not null default 0;