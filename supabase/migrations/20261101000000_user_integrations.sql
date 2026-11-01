-- Encrypted third-party credentials (Google OAuth tokens, Slack webhook).
-- Only the server (service role) may read or write them; clients never see them.
create table if not exists public.user_integrations (
  user_id uuid not null references auth.users(id) on delete cascade,
  provider text not null check (provider in ('google', 'slack')),
  encrypted_credentials text not null,
  account_label text,
  scopes text[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, provider)
);

alter table public.user_integrations enable row level security;
revoke all on table public.user_integrations from anon, authenticated;
grant select, insert, update, delete on table public.user_integrations to service_role;
