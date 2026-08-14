-- Create applications table for job applications tracking
CREATE TABLE IF NOT EXISTS public.applications (
    id BIGSERIAL PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    application_date DATE NOT NULL,
    applicant_name TEXT NOT NULL,
    nationality TEXT,
    phone TEXT,
    email TEXT,
    drive_file_id TEXT UNIQUE,
    re_experience BOOLEAN DEFAULT FALSE,
    first_call_status TEXT,
    second_call_notes TEXT,
    appointment_date DATE,
    interview_point TEXT,
    vat_type TEXT,
    start_date DATE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add RLS policies for applications table
ALTER TABLE public.applications ENABLE ROW LEVEL SECURITY;

-- Users can view all applications (teamleader access)
CREATE POLICY "Teamleaders can view all applications"
    ON public.applications
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.user_id = auth.uid()
            AND profiles.role IN ('teamleader', 'manager', 'boss', 'admin')
        )
    );

-- Users can insert applications
CREATE POLICY "Teamleaders can insert applications"
    ON public.applications
    FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.user_id = auth.uid()
            AND profiles.role IN ('teamleader', 'manager', 'boss', 'admin')
        )
    );

-- Users can update applications
CREATE POLICY "Teamleaders can update applications"
    ON public.applications
    FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.user_id = auth.uid()
            AND profiles.role IN ('teamleader', 'manager', 'boss', 'admin')
        )
    );

-- Users can delete applications
CREATE POLICY "Teamleaders can delete applications"
    ON public.applications
    FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.user_id = auth.uid()
            AND profiles.role IN ('teamleader', 'manager', 'boss', 'admin')
        )
    );

-- Create indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_applications_user_id ON public.applications(user_id);
CREATE INDEX IF NOT EXISTS idx_applications_created_at ON public.applications(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_applications_application_date ON public.applications(application_date DESC);
CREATE INDEX IF NOT EXISTS idx_applications_drive_file_id ON public.applications(drive_file_id);
CREATE INDEX IF NOT EXISTS idx_applications_first_call_status ON public.applications(first_call_status);

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_applications_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER applications_updated_at
    BEFORE UPDATE ON public.applications
    FOR EACH ROW
    EXECUTE FUNCTION update_applications_updated_at();
