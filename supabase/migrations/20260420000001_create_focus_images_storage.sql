-- Storage bucket for user-uploaded focus images. Public read so the URLs we
-- store in `public.focus_images.url` work without signed-URL gymnastics.
-- Writes are scoped to the uploader's own folder via RLS on storage.objects.
--
-- Convention for object keys: `<user_id>/<random-uuid>.<ext>`. The first
-- folder segment is the auth uid so the policies below can match on it.

insert into storage.buckets (id, name, public)
values ('focus-images', 'focus-images', true)
on conflict (id) do nothing;

drop policy if exists "Anyone can read focus images"           on storage.objects;
drop policy if exists "Users can upload to their focus folder" on storage.objects;
drop policy if exists "Users can update their focus images"    on storage.objects;
drop policy if exists "Users can delete their focus images"    on storage.objects;

create policy "Anyone can read focus images"
  on storage.objects for select
  using (bucket_id = 'focus-images');

create policy "Users can upload to their focus folder"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'focus-images'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "Users can update their focus images"
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'focus-images'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "Users can delete their focus images"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'focus-images'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
