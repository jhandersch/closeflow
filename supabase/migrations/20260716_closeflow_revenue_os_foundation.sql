-- CloseFlow Revenue OS foundation
-- Idempotent schema extension for workspace-first SaaS model.

create extension if not exists pgcrypto;

-- Core profile table (auth.users companion)
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  avatar_url text,
  phone text,
  timezone text,
  language text default 'de',
  job_title text,
  signature text,
  notification_preferences jsonb not null default '{}'::jsonb,
  company_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Workspace model
create table if not exists public.workspaces (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text unique,
  logo text,
  industry text,
  size text,
  owner_id uuid not null references auth.users(id) on delete cascade,
  plan text not null default 'free',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.workspace_members (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null check (role in ('owner', 'admin', 'sales_manager', 'sales_rep', 'member', 'viewer')),
  permissions jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  unique (workspace_id, user_id)
);

create table if not exists public.workspace_invites (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  email text not null,
  role text not null check (role in ('owner', 'admin', 'sales_manager', 'sales_rep', 'member', 'viewer')),
  token text not null unique,
  expires_at timestamptz,
  accepted_at timestamptz,
  created_at timestamptz not null default now(),
  unique (workspace_id, email)
);

create table if not exists public.teams (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  name text not null,
  created_at timestamptz not null default now(),
  unique (workspace_id, name)
);

create table if not exists public.team_members (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.teams(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (team_id, user_id)
);

-- Extend/normalize CRM tables
alter table if exists public.leads add column if not exists workspace_id uuid references public.workspaces(id) on delete cascade;
alter table if exists public.leads add column if not exists owner_id uuid references auth.users(id) on delete set null;
alter table if exists public.leads add column if not exists website text;
alter table if exists public.leads add column if not exists industry text;
alter table if exists public.leads add column if not exists employees integer;
alter table if exists public.leads add column if not exists country text;
alter table if exists public.leads add column if not exists source text;
alter table if exists public.leads add column if not exists probability numeric(5,2) default 0;
alter table if exists public.leads add column if not exists expected_close_at timestamptz;
alter table if exists public.leads add column if not exists stage_changed_at timestamptz default now();

create table if not exists public.lead_tags (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  name text not null,
  color text,
  created_at timestamptz not null default now(),
  unique (workspace_id, name)
);

create table if not exists public.lead_tag_links (
  lead_id uuid not null references public.leads(id) on delete cascade,
  tag_id uuid not null references public.lead_tags(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (lead_id, tag_id)
);

create table if not exists public.customers (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  lead_id uuid references public.leads(id) on delete set null,
  company text not null,
  contact text,
  email text,
  phone text,
  revenue numeric(14,2) not null default 0,
  status text not null default 'active',
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table if exists public.tasks add column if not exists workspace_id uuid references public.workspaces(id) on delete cascade;
alter table if exists public.tasks add column if not exists assigned_to uuid references auth.users(id) on delete set null;
alter table if exists public.tasks add column if not exists priority text default 'medium';
alter table if exists public.tasks add column if not exists completed_at timestamptz;

alter table if exists public.activities add column if not exists workspace_id uuid references public.workspaces(id) on delete cascade;
alter table if exists public.activities add column if not exists title text;
alter table if exists public.activities add column if not exists description text;

-- AI + forecasting tables
create table if not exists public.ai_conversations (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  lead_id uuid references public.leads(id) on delete set null,
  messages jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.lead_scores (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid not null references public.leads(id) on delete cascade,
  score integer not null check (score >= 0 and score <= 100),
  confidence integer not null check (confidence >= 0 and confidence <= 100),
  reason text,
  created_at timestamptz not null default now()
);

create table if not exists public.lead_memory (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid not null references public.leads(id) on delete cascade,
  memory text not null,
  importance integer not null default 50 check (importance >= 0 and importance <= 100),
  created_at timestamptz not null default now()
);

create table if not exists public.revenue_events (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  lead_id uuid references public.leads(id) on delete set null,
  amount numeric(14,2) not null,
  type text not null check (type in ('won', 'lost', 'refund')),
  created_at timestamptz not null default now()
);

create table if not exists public.usage (
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  month text not null,
  ai_requests integer not null default 0,
  lead_count integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (workspace_id, month)
);

-- Billing + notifications + automations
create table if not exists public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null unique references public.workspaces(id) on delete cascade,
  stripe_customer_id text,
  stripe_subscription_id text,
  plan text not null default 'free',
  status text not null default 'active',
  current_period_end timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  type text not null,
  title text not null,
  body text,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.automations (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  name text not null,
  trigger_event text not null,
  actions jsonb not null default '[]'::jsonb,
  enabled boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.automation_runs (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  automation_id uuid not null references public.automations(id) on delete cascade,
  status text not null default 'success',
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  actor_user_id uuid references auth.users(id) on delete set null,
  event_type text not null,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

-- Indexes
create index if not exists idx_workspace_members_user_id on public.workspace_members(user_id);
create index if not exists idx_workspace_members_workspace_id on public.workspace_members(workspace_id);
create index if not exists idx_workspace_invites_workspace_id on public.workspace_invites(workspace_id);
create index if not exists idx_leads_workspace_id on public.leads(workspace_id);
create index if not exists idx_leads_owner_id on public.leads(owner_id);
create index if not exists idx_tasks_workspace_id on public.tasks(workspace_id);
create index if not exists idx_tasks_assigned_to on public.tasks(assigned_to);
create index if not exists idx_activities_workspace_id on public.activities(workspace_id);
create index if not exists idx_customers_workspace_id on public.customers(workspace_id);
create index if not exists idx_revenue_events_workspace_id on public.revenue_events(workspace_id);
create index if not exists idx_notifications_user_id on public.notifications(user_id);
create index if not exists idx_audit_logs_workspace_id on public.audit_logs(workspace_id);

-- RLS helpers
create or replace function public.is_workspace_member(p_workspace_id uuid)
returns boolean
language sql
stable
as $$
  select exists (
    select 1
    from public.workspace_members wm
    where wm.workspace_id = p_workspace_id
      and wm.user_id = auth.uid()
  );
$$;

create or replace function public.is_workspace_manager(p_workspace_id uuid)
returns boolean
language sql
stable
as $$
  select exists (
    select 1
    from public.workspace_members wm
    where wm.workspace_id = p_workspace_id
      and wm.user_id = auth.uid()
      and wm.role in ('owner', 'admin', 'sales_manager')
  );
$$;

-- RLS on workspace-aware tables
alter table public.profiles enable row level security;
alter table public.workspaces enable row level security;
alter table public.workspace_members enable row level security;
alter table public.workspace_invites enable row level security;
alter table public.teams enable row level security;
alter table public.team_members enable row level security;
alter table public.customers enable row level security;
alter table public.ai_conversations enable row level security;
alter table public.lead_scores enable row level security;
alter table public.lead_memory enable row level security;
alter table public.revenue_events enable row level security;
alter table public.usage enable row level security;
alter table public.subscriptions enable row level security;
alter table public.notifications enable row level security;
alter table public.automations enable row level security;
alter table public.automation_runs enable row level security;
alter table public.audit_logs enable row level security;

-- Profile self access
 drop policy if exists profiles_self_select on public.profiles;
create policy profiles_self_select on public.profiles for select using (id = auth.uid());
 drop policy if exists profiles_self_insert on public.profiles;
create policy profiles_self_insert on public.profiles for insert with check (id = auth.uid());
 drop policy if exists profiles_self_update on public.profiles;
create policy profiles_self_update on public.profiles for update using (id = auth.uid()) with check (id = auth.uid());

-- Workspaces
 drop policy if exists workspaces_member_select on public.workspaces;
create policy workspaces_member_select on public.workspaces for select using (public.is_workspace_member(id));
 drop policy if exists workspaces_owner_insert on public.workspaces;
create policy workspaces_owner_insert on public.workspaces for insert with check (owner_id = auth.uid());
 drop policy if exists workspaces_manager_update on public.workspaces;
create policy workspaces_manager_update on public.workspaces for update using (public.is_workspace_manager(id)) with check (public.is_workspace_manager(id));

-- Workspace members
 drop policy if exists workspace_members_member_select on public.workspace_members;
create policy workspace_members_member_select on public.workspace_members for select using (public.is_workspace_member(workspace_id));
 drop policy if exists workspace_members_manager_insert on public.workspace_members;
create policy workspace_members_manager_insert on public.workspace_members for insert with check (public.is_workspace_manager(workspace_id));
 drop policy if exists workspace_members_manager_update on public.workspace_members;
create policy workspace_members_manager_update on public.workspace_members for update using (public.is_workspace_manager(workspace_id)) with check (public.is_workspace_manager(workspace_id));
 drop policy if exists workspace_members_manager_delete on public.workspace_members;
create policy workspace_members_manager_delete on public.workspace_members for delete using (public.is_workspace_manager(workspace_id));

-- Workspace invites
 drop policy if exists workspace_invites_member_select on public.workspace_invites;
create policy workspace_invites_member_select on public.workspace_invites for select using (public.is_workspace_member(workspace_id));
 drop policy if exists workspace_invites_manager_insert on public.workspace_invites;
create policy workspace_invites_manager_insert on public.workspace_invites for insert with check (public.is_workspace_manager(workspace_id));
 drop policy if exists workspace_invites_manager_update on public.workspace_invites;
create policy workspace_invites_manager_update on public.workspace_invites for update using (public.is_workspace_manager(workspace_id)) with check (public.is_workspace_manager(workspace_id));
 drop policy if exists workspace_invites_manager_delete on public.workspace_invites;
create policy workspace_invites_manager_delete on public.workspace_invites for delete using (public.is_workspace_manager(workspace_id));

-- Generic policies for workspace keyed tables
 drop policy if exists teams_member_select on public.teams;
create policy teams_member_select on public.teams for select using (public.is_workspace_member(workspace_id));
 drop policy if exists teams_manager_mutation on public.teams;
create policy teams_manager_mutation on public.teams for all using (public.is_workspace_manager(workspace_id)) with check (public.is_workspace_manager(workspace_id));

 drop policy if exists customers_member_select on public.customers;
create policy customers_member_select on public.customers for select using (public.is_workspace_member(workspace_id));
 drop policy if exists customers_member_mutation on public.customers;
create policy customers_member_mutation on public.customers for all using (public.is_workspace_member(workspace_id)) with check (public.is_workspace_member(workspace_id));

 drop policy if exists ai_conversations_member_access on public.ai_conversations;
create policy ai_conversations_member_access on public.ai_conversations for all using (public.is_workspace_member(workspace_id)) with check (public.is_workspace_member(workspace_id));

 drop policy if exists revenue_events_member_access on public.revenue_events;
create policy revenue_events_member_access on public.revenue_events for all using (public.is_workspace_member(workspace_id)) with check (public.is_workspace_member(workspace_id));

 drop policy if exists usage_member_access on public.usage;
create policy usage_member_access on public.usage for all using (public.is_workspace_member(workspace_id)) with check (public.is_workspace_member(workspace_id));

 drop policy if exists subscriptions_member_select on public.subscriptions;
create policy subscriptions_member_select on public.subscriptions for select using (public.is_workspace_member(workspace_id));
 drop policy if exists subscriptions_manager_mutation on public.subscriptions;
create policy subscriptions_manager_mutation on public.subscriptions for all using (public.is_workspace_manager(workspace_id)) with check (public.is_workspace_manager(workspace_id));

 drop policy if exists notifications_owner_access on public.notifications;
create policy notifications_owner_access on public.notifications for select using (user_id = auth.uid());
 drop policy if exists notifications_owner_update on public.notifications;
create policy notifications_owner_update on public.notifications for update using (user_id = auth.uid()) with check (user_id = auth.uid());

 drop policy if exists automations_member_select on public.automations;
create policy automations_member_select on public.automations for select using (public.is_workspace_member(workspace_id));
 drop policy if exists automations_manager_mutation on public.automations;
create policy automations_manager_mutation on public.automations for all using (public.is_workspace_manager(workspace_id)) with check (public.is_workspace_manager(workspace_id));

 drop policy if exists automation_runs_member_select on public.automation_runs;
create policy automation_runs_member_select on public.automation_runs for select using (public.is_workspace_member(workspace_id));
 drop policy if exists automation_runs_manager_insert on public.automation_runs;
create policy automation_runs_manager_insert on public.automation_runs for insert with check (public.is_workspace_manager(workspace_id));

 drop policy if exists audit_logs_member_select on public.audit_logs;
create policy audit_logs_member_select on public.audit_logs for select using (public.is_workspace_member(workspace_id));
 drop policy if exists audit_logs_manager_insert on public.audit_logs;
create policy audit_logs_manager_insert on public.audit_logs for insert with check (public.is_workspace_manager(workspace_id));
