-- Link CloseFlow calendar events to their Google Calendar counterpart so imports never duplicate.
alter table public.calendar_events add column if not exists google_event_id text;

create unique index if not exists idx_calendar_events_user_google_event
  on public.calendar_events(user_id, google_event_id);
