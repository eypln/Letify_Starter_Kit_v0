-- Letify Admin Account Setup
-- This migration creates the admin account with full privileges

-- 1. Create admin user in auth.users (run manually in Supabase CLI or dashboard)
-- You need to manually create this account in Supabase:
-- Email: admin@letify.cloud
-- This is typically done through the Supabase dashboard under Authentication

-- 2. Create profile for admin user
-- After the auth user is created, insert the profile record
-- Replace <ADMIN_UUID> with the actual UUID of the admin user from auth.users table

INSERT INTO public.profiles (user_id, full_name, phone, status, role, created_at, updated_at)
SELECT id, 'Admin', '', 'approved', 'admin', now(), now()
FROM auth.users
WHERE email = 'admin@letify.cloud'
ON CONFLICT (user_id) DO UPDATE SET
  status = 'approved',
  role = 'admin';

-- Note: The admin account creation must be done manually in Supabase Dashboard:
-- 1. Go to Authentication > Users
-- 2. Click "Add user"
-- 3. Use email: admin@letify.cloud
-- 4. Set a secure password
-- 5. Then run this SQL script to create the profile

-- After running this migration:
-- - Admin can access the dashboard
-- - Admin will have full access to the admin panel
-- - Admin can approve/deny user registrations
