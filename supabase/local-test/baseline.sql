-- LOCAL TEST ONLY. Reconstructed from supabase/schema-repair-template.sql because the
-- base CRM tables (leads, activities) are not created by any versioned migration.
-- Never apply to production.

create extension if not exists pgcrypto;

create table if not exists public.leads (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  name text not null,
  company text not null,
  status text not null default 'new',
  value numeric not null default 0,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.leads add column if not exists stage_changed_at timestamptz;
alter table public.leads add column if not exists last_activity_at timestamptz;
alter table public.leads add column if not exists source text;
alter table public.leads add column if not exists tags text[];
alter table public.leads add column if not exists email text;
alter table public.leads add column if not exists phone text;
alter table public.leads add column if not exists address text;
alter table public.leads add column if not exists website text;
alter table public.leads add column if not exists owner_id uuid;
alter table public.leads add column if not exists next_action text;
alter table public.leads add column if not exists next_action_date timestamptz;
alter table public.leads add column if not exists is_vip boolean not null default false;

create table if not exists public.activities (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid references public.leads(id) on delete cascade,
  user_id uuid not null,
  action text not null,
  type text not null default 'other',
  created_at timestamptz not null default now()
);

create table if not exists public.tasks (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid not null references public.leads(id) on delete cascade,
  user_id uuid not null,
  title text not null,
  completed boolean not null default false,
  priority text not null default 'medium',
  due_date timestamptz,
  created_at timestamptz not null default now()
);
