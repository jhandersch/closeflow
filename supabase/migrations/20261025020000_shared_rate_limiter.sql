-- Shared rate limiter backed by Postgres so limits hold across serverless instances.
-- Only the server (service role) can call it; the table is not exposed to clients.
create table if not exists public.rate_limit_buckets (
  key text primary key,
  hits integer not null,
  window_reset_at timestamptz not null
);

alter table public.rate_limit_buckets enable row level security;
revoke all on table public.rate_limit_buckets from anon, authenticated;

create or replace function public.check_rate_limit(
  p_key text,
  p_limit integer,
  p_window_seconds integer
)
returns table(is_allowed boolean, remaining_count integer, reset_at timestamptz)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_hits integer;
  v_reset timestamptz;
begin
  insert into public.rate_limit_buckets as b (key, hits, window_reset_at)
  values (p_key, 1, now() + make_interval(secs => p_window_seconds))
  on conflict (key) do update set
    hits = case when b.window_reset_at <= now() then 1 else b.hits + 1 end,
    window_reset_at = case
      when b.window_reset_at <= now() then now() + make_interval(secs => p_window_seconds)
      else b.window_reset_at
    end
  returning b.hits, b.window_reset_at into v_hits, v_reset;

  if random() < 0.01 then
    delete from public.rate_limit_buckets where window_reset_at < now() - interval '1 hour';
  end if;

  return query select v_hits <= p_limit, greatest(p_limit - v_hits, 0), v_reset;
end;
$$;

revoke all on function public.check_rate_limit(text, integer, integer) from public, anon, authenticated;
grant execute on function public.check_rate_limit(text, integer, integer) to service_role;
