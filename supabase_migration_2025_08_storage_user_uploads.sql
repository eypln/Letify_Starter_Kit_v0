-- Create bucket if not exists
insert into storage.buckets (id, name, public) values ('user_uploads', 'user_uploads', true)
on conflict (id) do nothing;

-- Allow authenticated users to read their own objects and public read is already allowed by bucket.public=true
-- Insert (write) restricted to path starting with their uid

-- Drop existing policies if they exist
drop policy if exists "users can insert into own folder" on storage.objects;
drop policy if exists "users can update own files" on storage.objects;
drop policy if exists "users can delete own files" on storage.objects;

-- Create new policies
create policy "users can insert into own folder"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'user_uploads'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "users can update own files"
  on storage.objects for update to authenticated
  using (
    bucket_id = 'user_uploads'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "users can delete own files"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'user_uploads'
    and (storage.foldername(name))[1] = auth.uid()::text
  );