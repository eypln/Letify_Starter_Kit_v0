-- Complete Supabase Storage Setup for user_uploads bucket
-- Run this after the initial migration if you're still getting upload errors

-- 1. Ensure the bucket exists with correct configuration
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'user_uploads', 
  'user_uploads', 
  true, 
  1048576, -- 1MB limit
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
ON CONFLICT (id) 
DO UPDATE SET 
  public = true,
  file_size_limit = 1048576,
  allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

-- 2. Drop existing policies to start fresh
DROP POLICY IF EXISTS "users can insert into own folder" ON storage.objects;
DROP POLICY IF EXISTS "users can update own files" ON storage.objects;
DROP POLICY IF EXISTS "users can delete own files" ON storage.objects;
DROP POLICY IF EXISTS "users can view own files" ON storage.objects;
DROP POLICY IF EXISTS "public can view user uploads" ON storage.objects;

-- 3. Create comprehensive policies for user_uploads bucket

-- Allow authenticated users to upload to their own folder
CREATE POLICY "users can insert into own folder"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'user_uploads' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Allow authenticated users to update their own files
CREATE POLICY "users can update own files"
ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id = 'user_uploads' AND
  (storage.foldername(name))[1] = auth.uid()::text
)
WITH CHECK (
  bucket_id = 'user_uploads' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Allow authenticated users to delete their own files
CREATE POLICY "users can delete own files"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'user_uploads' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Allow authenticated users to view their own files
CREATE POLICY "users can view own files"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'user_uploads' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Allow public read access for user_uploads (since bucket is public)
CREATE POLICY "public can view user uploads"
ON storage.objects FOR SELECT TO public
USING (bucket_id = 'user_uploads');

-- 4. Enable RLS on storage.objects (should already be enabled)
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;