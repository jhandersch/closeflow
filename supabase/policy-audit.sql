-- Read-only audit: RLS status and policies for all public tables.
-- Flags: RLS off, policies that allow everything (true), policies for anon/public,
-- and write policies that do not use can_write_workspace (viewer bypass candidates).
with t as (
  select c.relname as tablename, c.relrowsecurity as rls
  from pg_class c
  join pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'public' and c.relkind = 'r'
),
p as (
  select tablename, policyname, cmd, roles::text as roles,
         coalesce(qual, '') as qual, coalesce(with_check, '') as with_check
  from pg_policies where schemaname = 'public'
)
select t.tablename,
       case when not t.rls then 'RLS OFF' else 'rls on' end as rls,
       p.policyname, p.cmd, p.roles,
       case
         when not t.rls then 'PROBLEM: RLS disabled'
         when p.policyname is null then 'no policies (deny all)'
         when p.qual = 'true' or p.with_check = 'true' then 'PROBLEM: allows all rows'
         when p.roles ~ '(anon|public)' and p.policyname is not null then 'CHECK: anon/public role'
         when p.cmd in ('INSERT','UPDATE','DELETE','ALL')
              and (p.qual || p.with_check) ~ 'workspace'
              and (p.qual || p.with_check) !~ 'can_write_workspace' then 'CHECK: write without viewer guard'
         else 'ok'
       end as finding,
       left(p.qual, 140) as qual
from t left join p using (tablename)
order by (case when not t.rls then 0 else 1 end), t.tablename, p.cmd, p.policyname;
