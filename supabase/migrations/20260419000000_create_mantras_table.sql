-- Mantras: per-user list of meditation mantras with an optional 1-5 rating.
-- Seeded client-side the first time a user views an empty list (20 presets).
-- Protected by row-level security so each user can only read/write their own.

create table if not exists public.mantras (
  id         uuid        primary key default gen_random_uuid(),
  user_id    uuid        not null references auth.users (id) on delete cascade,
  text       text        not null check (char_length(text) between 1 and 500),
  rating     smallint    check (rating between 1 and 5),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Support the default ordering (rating desc nulls last, text asc) for each user.
create index if not exists mantras_user_id_rating_text_idx
  on public.mantras (user_id, rating desc nulls last, text asc);

-- Prevent duplicate mantra text within a single user's library. This also
-- guards against double-seeding if the client retries.
create unique index if not exists mantras_user_id_text_unique_idx
  on public.mantras (user_id, text);

create or replace function public.handle_mantras_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists mantras_set_updated_at on public.mantras;

create trigger mantras_set_updated_at
  before update on public.mantras
  for each row execute function public.handle_mantras_updated_at();

-- Row-level security: each user can only see and modify their own mantras.
alter table public.mantras enable row level security;

drop policy if exists "Users can view their own mantras"   on public.mantras;
drop policy if exists "Users can insert their own mantras" on public.mantras;
drop policy if exists "Users can update their own mantras" on public.mantras;
drop policy if exists "Users can delete their own mantras" on public.mantras;

create policy "Users can view their own mantras"
  on public.mantras for select
  using (auth.uid() = user_id);

create policy "Users can insert their own mantras"
  on public.mantras for insert
  with check (auth.uid() = user_id);

create policy "Users can update their own mantras"
  on public.mantras for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users can delete their own mantras"
  on public.mantras for delete
  using (auth.uid() = user_id);
