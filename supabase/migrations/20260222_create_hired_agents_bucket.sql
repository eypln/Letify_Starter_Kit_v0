-- Create hired_agents storage bucket for applicant documents
-- Documents: Passport, CV, Selfie, Service Agreement
-- Supported formats: PDF, Word (docx), JPEG/JPG
-- Storage path: applicant_name/document_type/filename

-- Insert the bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'hired_agents',
  'hired_agents',
  true,
  10485760, -- 10MB limit
  ARRAY[
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'image/jpeg',
    'image/jpg',
    'image/png'
  ]
) ON CONFLICT (id) DO NOTHING;

-- RLS Policies for hired_agents bucket

-- Allow authenticated users to upload files
CREATE POLICY "Allow authenticated uploads to hired_agents"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'hired_agents');

-- Allow authenticated users to read files
CREATE POLICY "Allow authenticated reads from hired_agents"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'hired_agents');

-- Allow authenticated users to update files  
CREATE POLICY "Allow authenticated updates to hired_agents"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'hired_agents')
WITH CHECK (bucket_id = 'hired_agents');

-- Allow authenticated users to delete files
CREATE POLICY "Allow authenticated deletes from hired_agents"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'hired_agents');

-- Allow public read access (for viewing documents)
CREATE POLICY "Allow public reads from hired_agents"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'hired_agents');
