create index if not exists audit_logs_created_at_retention_idx
  on public.audit_logs (created_at);

create or replace function public.purge_expired_audit_logs(
  p_batch_size integer default 1000
)
returns integer
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_deleted integer;
begin
  if p_batch_size is null or p_batch_size < 1 or p_batch_size > 1000 then
    raise exception 'Invalid audit log retention batch size'
      using errcode = '22023';
  end if;

  with expired as (
    select id
    from public.audit_logs
    where created_at < now() - interval '12 months'
    order by created_at
    limit p_batch_size
    for update skip locked
  )
  delete from public.audit_logs as logs
  using expired
  where logs.id = expired.id;

  get diagnostics v_deleted = row_count;
  return v_deleted;
end;
$$;

revoke all on function public.purge_expired_audit_logs(integer)
  from public, anon, authenticated;
grant execute on function public.purge_expired_audit_logs(integer)
  to service_role;
