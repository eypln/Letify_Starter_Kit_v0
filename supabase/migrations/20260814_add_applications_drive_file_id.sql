-- Store the Google Drive source file ID and prevent a CV from being inserted twice.
ALTER TABLE public.applications
    ADD COLUMN IF NOT EXISTS drive_file_id TEXT;

DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM public.applications
        WHERE drive_file_id IS NOT NULL
        GROUP BY drive_file_id
        HAVING COUNT(*) > 1
    ) THEN
        RAISE EXCEPTION
            'Cannot add applications_drive_file_id_key: duplicate drive_file_id values exist. Remove duplicate application rows first.';
    END IF;

    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'applications_drive_file_id_key'
          AND conrelid = 'public.applications'::regclass
    ) THEN
        ALTER TABLE public.applications
            ADD CONSTRAINT applications_drive_file_id_key UNIQUE (drive_file_id);
    END IF;
END;
$$;

CREATE INDEX IF NOT EXISTS idx_applications_drive_file_id
    ON public.applications(drive_file_id);