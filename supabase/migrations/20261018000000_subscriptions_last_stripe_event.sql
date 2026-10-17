-- Stripe delivers webhooks at-least-once and not in order. Remember the creation time of the
-- last applied event so that stale events cannot overwrite newer subscription state.
alter table public.subscriptions
  add column if not exists last_stripe_event_at timestamptz;
