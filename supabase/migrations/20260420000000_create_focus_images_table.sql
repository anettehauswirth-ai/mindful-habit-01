-- Focus images: per-user library of meditation focus images, tagged by topic.
-- Seeded client-side the first time a user views an empty list (10 presets).
-- Protected by row-level security so each user can only read/write their own.

create table if not exists public.focus_images (
  id           uuid        primary key default gen_random_uuid(),
  user_id      uuid        not null references auth.users (id) on delete cascade,
  url          text        not null check (char_length(url) between 1 and 2048),
  -- For user uploads we keep the storage object key so we can clean up the
  -- file when the row is deleted. Null for preset rows that point at an
  -- external URL.
  storage_path text,
  tag          text        not null check (tag in (
                              'nature', 'mandalas', 'candles', 'spirals', 'other'
                            )),
  created_at   timestamptz not null default now()
);

-- Support the default ordering (created_at desc) for each user.
create index if not exists focus_images_user_id_created_at_idx
  on public.focus_images (user_id, created_at desc);

-- Helps the tag filter on the page.
create index if not exists focus_images_user_id_tag_idx
  on public.focus_images (user_id, tag);

-- Row-level security: each user can only see and modify their own images.
alter table public.focus_images enable row level security;

drop policy if exists "Users can view their own focus images"   on public.focus_images;
drop policy if exists "Users can insert their own focus images" on public.focus_images;
drop policy if exists "Users can update their own focus images" on public.focus_images;
drop policy if exists "Users can delete their own focus images" on public.focus_images;

create policy "Users can view their own focus images"
  on public.focus_images for select
  using (auth.uid() = user_id);

create policy "Users can insert their own focus images"
  on public.focus_images for insert
  with check (auth.uid() = user_id);

create policy "Users can update their own focus images"
  on public.focus_images for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users can delete their own focus images"
  on public.focus_images for delete
  using (auth.uid() = user_id);
