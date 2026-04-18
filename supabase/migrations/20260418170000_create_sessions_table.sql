-- Mindfulness sessions: one row per logged meditation session, scoped per user.
-- Protected by row-level security so each user can only read/write their own rows.

create table if not exists public.sessions (
  id           uuid        primary key default gen_random_uuid(),
  user_id      uuid        not null references auth.users (id) on delete cascade,
  date         date        not null,
  duration_min numeric     not null check (duration_min > 0),
  presence     smallint    not null check (presence between 1 and 5),
  notes        text        not null default '',
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create index if not exists sessions_user_id_date_idx
  on public.sessions (user_id, date desc);

create index if not exists sessions_user_id_created_at_idx
  on public.sessions (user_id, created_at desc);

-- Keep updated_at fresh on every update.
create or replace function public.handle_sessions_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists sessions_set_updated_at on public.sessions;

create trigger sessions_set_updated_at
  before update on public.sessions
  for each row execute function public.handle_sessions_updated_at();

-- Row-level security: each user can only see and modify their own sessions.
alter table public.sessions enable row level security;

drop policy if exists "Users can view their own sessions"   on public.sessions;
drop policy if exists "Users can insert their own sessions" on public.sessions;
drop policy if exists "Users can update their own sessions" on public.sessions;
drop policy if exists "Users can delete their own sessions" on public.sessions;

create policy "Users can view their own sessions"
  on public.sessions for select
  using (auth.uid() = user_id);

create policy "Users can insert their own sessions"
  on public.sessions for insert
  with check (auth.uid() = user_id);

create policy "Users can update their own sessions"
  on public.sessions for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users can delete their own sessions"
  on public.sessions for delete
  using (auth.uid() = user_id);
