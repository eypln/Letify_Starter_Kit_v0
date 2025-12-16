-- Add hired column to applications table
ALTER TABLE public.applications 
ADD COLUMN IF NOT EXISTS hired BOOLEAN DEFAULT FALSE;

-- Create index for better filtering performance
CREATE INDEX IF NOT EXISTS idx_applications_hired ON public.applications(hired);
