-- DEEP DIAGNOSTIC TO IDENTIFY OAUTH DATABASE ERROR
-- This script will help us find the exact cause of the "Database error saving new user"

-- 1. Check if the trigger function exists and is working
SELECT 
  'Trigger Function Check' as check_type,
  routine_name,
  routine_definition
FROM information_schema.routines 
WHERE routine_schema = 'public' 
  AND routine_name LIKE '%user%'
ORDER BY routine_name;

-- 2. Check if triggers are properly attached
SELECT 
  'Trigger Attachment Check' as check_type,
  trigger_name,
  event_object_table,
  event_manipulation,
  action_timing,
  action_statement
FROM information_schema.triggers 
WHERE trigger_schema = 'public' 
  AND event_object_table = 'users'
ORDER BY trigger_name;

-- 3. Check table constraints that might be causing issues
SELECT 
  'Table Constraints Check' as check_type,
  table_name,
  constraint_name,
  constraint_type,
  is_deferrable,
  initially_deferred
FROM information_schema.table_constraints 
WHERE table_schema = 'public' 
  AND table_name IN ('users', 'profiles')
ORDER BY table_name, constraint_type;

-- 4. Check foreign key constraints
SELECT 
  'Foreign Key Check' as check_type,
  tc.table_name,
  kcu.column_name,
  ccu.table_name AS foreign_table_name,
  ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc 
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
  AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
  AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY' 
  AND tc.table_schema = 'public'
  AND tc.table_name IN ('users', 'profiles');

-- 5. Check if auth.users table exists and has the expected structure
SELECT 
  'Auth Users Check' as check_type,
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns 
WHERE table_schema = 'auth' 
  AND table_name = 'users'
ORDER BY ordinal_position;

-- 6. Test the trigger function manually with detailed error reporting
DO $$
DECLARE
  test_user_id UUID := gen_random_uuid();
  test_email TEXT := 'test@example.com';
  error_message TEXT;
BEGIN
  RAISE NOTICE 'Testing OAuth user creation simulation...';
  
  -- Test inserting into users table
  BEGIN
    INSERT INTO public.users (id, email, subscription_status)
    VALUES (test_user_id, test_email, 'inactive');
    RAISE NOTICE 'Users table insert: SUCCESS';
  EXCEPTION
    WHEN OTHERS THEN
      error_message := SQLERRM;
      RAISE NOTICE 'Users table insert: FAILED - %', error_message;
  END;
  
  -- Test inserting into profiles table
  BEGIN
    INSERT INTO public.profiles (id, bio, favorite_style)
    VALUES (test_user_id, 'Test OAuth user', 'Modern');
    RAISE NOTICE 'Profiles table insert: SUCCESS';
  EXCEPTION
    WHEN OTHERS THEN
      error_message := SQLERRM;
      RAISE NOTICE 'Profiles table insert: FAILED - %', error_message;
  END;
  
  -- Clean up test data
  DELETE FROM public.users WHERE id = test_user_id;
  DELETE FROM public.profiles WHERE id = test_user_id;
  
  RAISE NOTICE 'Test completed successfully';
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'Test failed with error: %', SQLERRM;
END $$;

-- 7. Check if there are any recent errors in the database
SELECT 
  'Recent Errors Check' as check_type,
  'Check Supabase Dashboard > Logs for recent database errors' as message;

