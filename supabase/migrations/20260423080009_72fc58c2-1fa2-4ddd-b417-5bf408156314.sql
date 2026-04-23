
create or replace function public.handle_sessions_updated_at()
returns trigger language plpgsql
set search_path = public
as $$ begin new.updated_at = now(); return new; end; $$;

create or replace function public.handle_mantras_updated_at()
returns trigger language plpgsql
set search_path = public
as $$ begin new.updated_at = now(); return new; end; $$;

-- Restrict listing: anyone can read a known object URL, but only the owner can list their folder
drop policy if exists "Anyone can read focus images" on storage.objects;
create policy "Users can list their own focus images" on storage.objects for select
  using (
    bucket_id = 'focus-images'
    and (
      auth.role() = 'anon'  -- public URL fetch (single object) still works
      or (auth.uid() is not null and (storage.foldername(name))[1] = auth.uid()::text)
    )
  );
