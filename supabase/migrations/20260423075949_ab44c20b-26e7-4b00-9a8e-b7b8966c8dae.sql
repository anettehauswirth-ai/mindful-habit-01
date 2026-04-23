
-- Sessions
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
create index if not exists sessions_user_id_date_idx on public.sessions (user_id, date desc);
create index if not exists sessions_user_id_created_at_idx on public.sessions (user_id, created_at desc);

create or replace function public.handle_sessions_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end; $$;

drop trigger if exists sessions_set_updated_at on public.sessions;
create trigger sessions_set_updated_at before update on public.sessions
  for each row execute function public.handle_sessions_updated_at();

alter table public.sessions enable row level security;
drop policy if exists "Users can view their own sessions"   on public.sessions;
drop policy if exists "Users can insert their own sessions" on public.sessions;
drop policy if exists "Users can update their own sessions" on public.sessions;
drop policy if exists "Users can delete their own sessions" on public.sessions;
create policy "Users can view their own sessions"   on public.sessions for select using (auth.uid() = user_id);
create policy "Users can insert their own sessions" on public.sessions for insert with check (auth.uid() = user_id);
create policy "Users can update their own sessions" on public.sessions for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Users can delete their own sessions" on public.sessions for delete using (auth.uid() = user_id);

-- Mantras
create table if not exists public.mantras (
  id         uuid        primary key default gen_random_uuid(),
  user_id    uuid        not null references auth.users (id) on delete cascade,
  text       text        not null check (char_length(text) between 1 and 500),
  rating     smallint    check (rating between 1 and 5),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists mantras_user_id_rating_text_idx on public.mantras (user_id, rating desc nulls last, text asc);
create unique index if not exists mantras_user_id_text_unique_idx on public.mantras (user_id, text);

create or replace function public.handle_mantras_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end; $$;

drop trigger if exists mantras_set_updated_at on public.mantras;
create trigger mantras_set_updated_at before update on public.mantras
  for each row execute function public.handle_mantras_updated_at();

alter table public.mantras enable row level security;
drop policy if exists "Users can view their own mantras"   on public.mantras;
drop policy if exists "Users can insert their own mantras" on public.mantras;
drop policy if exists "Users can update their own mantras" on public.mantras;
drop policy if exists "Users can delete their own mantras" on public.mantras;
create policy "Users can view their own mantras"   on public.mantras for select using (auth.uid() = user_id);
create policy "Users can insert their own mantras" on public.mantras for insert with check (auth.uid() = user_id);
create policy "Users can update their own mantras" on public.mantras for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Users can delete their own mantras" on public.mantras for delete using (auth.uid() = user_id);

-- Focus images
create table if not exists public.focus_images (
  id           uuid        primary key default gen_random_uuid(),
  user_id      uuid        not null references auth.users (id) on delete cascade,
  url          text        not null check (char_length(url) between 1 and 2048),
  storage_path text,
  tag          text        not null check (tag in ('nature','mandalas','candles','spirals','other')),
  created_at   timestamptz not null default now()
);
create index if not exists focus_images_user_id_created_at_idx on public.focus_images (user_id, created_at desc);
create index if not exists focus_images_user_id_tag_idx on public.focus_images (user_id, tag);

alter table public.focus_images enable row level security;
drop policy if exists "Users can view their own focus images"   on public.focus_images;
drop policy if exists "Users can insert their own focus images" on public.focus_images;
drop policy if exists "Users can update their own focus images" on public.focus_images;
drop policy if exists "Users can delete their own focus images" on public.focus_images;
create policy "Users can view their own focus images"   on public.focus_images for select using (auth.uid() = user_id);
create policy "Users can insert their own focus images" on public.focus_images for insert with check (auth.uid() = user_id);
create policy "Users can update their own focus images" on public.focus_images for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Users can delete their own focus images" on public.focus_images for delete using (auth.uid() = user_id);

-- Storage bucket
insert into storage.buckets (id, name, public) values ('focus-images', 'focus-images', true)
on conflict (id) do nothing;

drop policy if exists "Anyone can read focus images"           on storage.objects;
drop policy if exists "Users can upload to their focus folder" on storage.objects;
drop policy if exists "Users can update their focus images"    on storage.objects;
drop policy if exists "Users can delete their focus images"    on storage.objects;

create policy "Anyone can read focus images" on storage.objects for select using (bucket_id = 'focus-images');
create policy "Users can upload to their focus folder" on storage.objects for insert to authenticated
  with check (bucket_id = 'focus-images' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "Users can update their focus images" on storage.objects for update to authenticated
  using (bucket_id = 'focus-images' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "Users can delete their focus images" on storage.objects for delete to authenticated
  using (bucket_id = 'focus-images' and (storage.foldername(name))[1] = auth.uid()::text);
