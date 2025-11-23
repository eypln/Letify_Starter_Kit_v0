-- Letify Roles Migration
-- Add new roles: teamleader, manager, boss

-- 1. Add role values to profiles table constraint
-- Note: The CHECK constraint in the profiles table needs to be updated
-- This is typically done by recreating the column or altering constraints

-- Update the role column constraint to include new roles
-- First, drop the existing constraint and recreate it
ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS profiles_role_check;

-- Add new constraint with all roles
ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_role_check 
  CHECK (role IN ('agent', 'teamleader', 'manager', 'boss', 'admin'));

-- 2. Update the trigger to set default role for new users
-- This ensures new profiles get the correct role assignment
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  BEGIN
    INSERT INTO public.profiles (user_id, full_name, phone, status, role)
    VALUES (
      NEW.id, 
      COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
      COALESCE(NEW.raw_user_meta_data->>'phone', ''),
      'pending_admin',
      COALESCE(NEW.raw_user_meta_data->>'role', 'agent')  -- Use role from signup or default to 'agent'
    );
    RAISE LOG 'Profile created successfully for user: %', NEW.id;
  EXCEPTION WHEN OTHERS THEN
    RAISE LOG 'Error creating profile for user %: %', NEW.id, SQLERRM;
  END;
  RETURN NEW;
END;
$$ language 'plpgsql' SECURITY DEFINER;

-- 3. Documentation of roles and their access levels
/*
ROLE DEFINITIONS AND ACCESS LEVELS:

1. AGENT (Default User)
   - Can create listings
   - Can view own clients
   - Can record viewings
   - Can manage revenue
   - NO access to: /admin, /teamleader, /manager, /boss

2. TEAMLEADER
   - Can view team member viewings
   - Receives viewing notifications from agents
   - Can approve/view agent activity
   - Can access analytics
   - NO access to: /admin, /manager, /boss

3. MANAGER
   - Can manage team leads and agents
   - Can view comprehensive analytics
   - Can manage subscriptions
   - NO access to: /admin, /boss

4. BOSS
   - Can approve revenue completions
   - Receives revenue notifications
   - Can view business analytics
   - NO access to: /admin

5. ADMIN
   - Can approve/deny new user registrations
   - Can view all users
   - Can manage system settings
   - Full access to all features
*/

-- 4. Create index on role column for faster queries
CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles(role);
