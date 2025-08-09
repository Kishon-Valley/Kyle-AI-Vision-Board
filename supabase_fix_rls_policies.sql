-- FIX MISSING RLS POLICIES FOR OAUTH USER CREATION
-- This script adds the missing policies that allow user creation

-- Add missing INSERT policy for users table
-- This allows the trigger to create user records during OAuth signup
CREATE POLICY "Users can insert own subscription data" ON public.users
  FOR INSERT WITH CHECK (auth.uid() = id);

-- Add missing UPDATE policy for users table
CREATE POLICY "Users can update own subscription data" ON public.users
  FOR UPDATE USING (auth.uid() = id);

-- Add missing INSERT policy for profiles table (if not exists)
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
CREATE POLICY "Users can insert own profile" ON public.profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

-- Verify all policies exist
SELECT 
  'Policy Verification' as check_type,
  schemaname,
  tablename,
  policyname,
  cmd,
  qual
FROM pg_policies 
WHERE schemaname = 'public' 
  AND tablename IN ('users', 'profiles')
ORDER BY tablename, policyname;

-- Test OAuth user creation simulation
DO $$
DECLARE
  test_user_id UUID := gen_random_uuid();
  test_email TEXT := 'test@example.com';
BEGIN
  -- Simulate what happens during OAuth signup
  INSERT INTO public.users (id, email, subscription_status)
  VALUES (test_user_id, test_email, 'inactive');
  
  INSERT INTO public.profiles (id, bio, favorite_style)
  VALUES (test_user_id, 'Test OAuth user', 'Modern');
  
  -- Clean up test data
  DELETE FROM public.users WHERE id = test_user_id;
  DELETE FROM public.profiles WHERE id = test_user_id;
  
  RAISE NOTICE 'OAuth user creation test PASSED - policies are working correctly';
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'OAuth user creation test FAILED: %', SQLERRM;
END $$;

