-- =========================================================================
-- FIX: User Approval System - Add Missing Trigger on auth.users
-- =========================================================================
-- Problem: New users are not appearing in admin approval queue
-- Root Cause: Missing trigger on auth.users table to create profile + approval_queue entry
-- Solution: Create trigger that fires AFTER INSERT on auth.users
-- =========================================================================

-- Step 1: Drop existing trigger if it exists (on wrong table or outdated)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Step 2: Ensure handle_new_user function exists and is correct
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Log for debugging
  RAISE LOG 'Creating profile for new user: %', NEW.id;
  
  -- Create profile with pending_admin status
  INSERT INTO public.profiles (user_id, full_name, phone, role, status)
  VALUES (
    NEW.id,
    NULLIF(COALESCE(NEW.raw_user_meta_data->>'full_name', ''), ''),
    NULLIF(COALESCE(NEW.raw_user_meta_data->>'phone', ''), ''),
    COALESCE(NULLIF(NEW.raw_user_meta_data->>'role', ''), 'agent'), -- Use role from sign-up or default to 'agent'
    'pending_admin' -- Always start with pending_admin status
  )
  ON CONFLICT (user_id) DO NOTHING;

  -- Add to approval queue
  INSERT INTO public.approval_queue (user_id, status)
  VALUES (NEW.id, 'pending')
  ON CONFLICT (user_id) DO NOTHING;

  RAISE LOG 'Profile and approval queue entry created for user: %', NEW.id;
  
  RETURN NEW;
END;
$$;

-- Step 3: Create the trigger on auth.users table
-- This fires AFTER a new user is inserted (after sign-up or email verification)
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Step 4: Optional - Update enqueue_on_confirm to handle email confirmation
-- This ensures approval_queue entry exists when email is confirmed
CREATE OR REPLACE FUNCTION public.enqueue_on_confirm()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- If email was just confirmed
  IF NEW.email_confirmed_at IS NOT NULL 
     AND (OLD.email_confirmed_at IS DISTINCT FROM NEW.email_confirmed_at) THEN
    
    RAISE LOG 'Email confirmed for user: %', NEW.id;
    
    -- Ensure approval_queue entry exists
    INSERT INTO public.approval_queue (user_id, status)
    VALUES (NEW.id, 'pending')
    ON CONFLICT (user_id) DO NOTHING;
    
  END IF;
  
  RETURN NEW;
END;
$$;

-- Step 5: Create trigger for email confirmation (if it doesn't exist)
DROP TRIGGER IF EXISTS on_user_email_confirmed ON auth.users;

CREATE TRIGGER on_user_email_confirmed
  AFTER UPDATE ON auth.users
  FOR EACH ROW
  WHEN (NEW.email_confirmed_at IS NOT NULL AND OLD.email_confirmed_at IS NULL)
  EXECUTE FUNCTION public.enqueue_on_confirm();

-- =========================================================================
-- Manual Fix: Add existing users to approval queue
-- =========================================================================
-- For users that were created before this trigger was in place
INSERT INTO public.approval_queue (user_id, status)
SELECT p.user_id, 'pending'
FROM public.profiles p
WHERE p.status = 'pending_admin'
  AND NOT EXISTS (
    SELECT 1 FROM public.approval_queue aq 
    WHERE aq.user_id = p.user_id
  )
ON CONFLICT (user_id) DO NOTHING;

-- =========================================================================
-- Verification Query (Run this to check if triggers are working)
-- =========================================================================
-- SELECT 
--   t.tgname AS trigger_name,
--   t.tgenabled AS enabled,
--   p.proname AS function_name
-- FROM pg_trigger t
-- JOIN pg_proc p ON t.tgfoid = p.oid
-- JOIN pg_class c ON t.tgrelid = c.oid
-- JOIN pg_namespace n ON c.relnamespace = n.oid
-- WHERE n.nspname = 'auth' 
--   AND c.relname = 'users'
--   AND t.tgname IN ('on_auth_user_created', 'on_user_email_confirmed');
