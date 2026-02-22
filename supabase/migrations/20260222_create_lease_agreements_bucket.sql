-- Create Lease_agreements storage bucket for deal documents
-- Documents: Lease Agreement, Inventory List, Invoice-owner, Invoice-client
-- Supported formats: PDF, Word (docx), JPEG/JPG
-- Storage path: ref_no/document_type/filename

-- Insert the bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'Lease_agreements',
  'Lease_agreements',
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

-- RLS Policies for Lease_agreements bucket

-- Allow authenticated users to upload files
CREATE POLICY "Allow authenticated uploads to Lease_agreements"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'Lease_agreements');

-- Allow authenticated users to read files
CREATE POLICY "Allow authenticated reads from Lease_agreements"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'Lease_agreements');

-- Allow authenticated users to update files  
CREATE POLICY "Allow authenticated updates to Lease_agreements"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'Lease_agreements')
WITH CHECK (bucket_id = 'Lease_agreements');

-- Allow authenticated users to delete files
CREATE POLICY "Allow authenticated deletes from Lease_agreements"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'Lease_agreements');

-- Allow public read access (for viewing documents)
CREATE POLICY "Allow public reads from Lease_agreements"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'Lease_agreements');
