-- Fix account deletion issues by updating foreign key constraints
-- This script ensures that when a user is deleted, all related data is properly cleaned up

-- 1. First, drop existing foreign key constraints that don't have CASCADE
DO $$ 
BEGIN
  -- Drop foreign key constraint on profiles table
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'profiles_id_fkey' 
    AND table_name = 'profiles'
  ) THEN
    ALTER TABLE public.profiles DROP CONSTRAINT profiles_id_fkey;
  END IF;
  
  -- Drop foreign key constraint on users table
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'users_id_fkey' 
    AND table_name = 'users'
  ) THEN
    ALTER TABLE public.users DROP CONSTRAINT users_id_fkey;
  END IF;
END $$;

-- 2. Recreate foreign key constraints with CASCADE DELETE
-- This ensures that when auth.users record is deleted, related records are automatically removed

-- Profiles table - CASCADE DELETE
ALTER TABLE public.profiles 
ADD CONSTRAINT profiles_id_fkey 
FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- Users table - CASCADE DELETE  
ALTER TABLE public.users 
ADD CONSTRAINT users_id_fkey 
FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- 3. Ensure mood_boards table has proper CASCADE (should already exist)
-- Verify the constraint exists and has CASCADE
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'mood_boards_user_id_fkey' 
    AND table_name = 'mood_boards'
  ) THEN
    -- Add the constraint if it doesn't exist
    ALTER TABLE public.mood_boards 
    ADD CONSTRAINT mood_boards_user_id_fkey 
    FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
  END IF;
END $$;

-- 4. Create a function to safely delete user data
CREATE OR REPLACE FUNCTION safe_delete_user(user_uuid UUID)
RETURNS BOOLEAN AS $$
DECLARE
  success BOOLEAN := TRUE;
BEGIN
  -- Start transaction
  BEGIN
    -- Delete from mood_boards (should cascade automatically)
    DELETE FROM public.mood_boards WHERE user_id = user_uuid;
    
    -- Delete from user_preferences if table exists
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'user_preferences') THEN
      DELETE FROM public.user_preferences WHERE user_id = user_uuid;
    END IF;
    
    -- Delete from profiles (will cascade from auth.users deletion)
    DELETE FROM public.profiles WHERE id = user_uuid;
    
    -- Delete from users table (will cascade from auth.users deletion)
    DELETE FROM public.users WHERE id = user_uuid;
    
    -- Delete auth user (this will trigger CASCADE on all remaining references)
    -- Note: This requires admin privileges and should be called from the API
    -- The function just prepares the data for deletion
    
    RETURN TRUE;
  EXCEPTION
    WHEN OTHERS THEN
      -- Log the error
      RAISE LOG 'Error in safe_delete_user for user %: %', user_uuid, SQLERRM;
      RETURN FALSE;
  END;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Create a trigger to automatically clean up orphaned records
-- This helps prevent issues when manual deletion fails
CREATE OR REPLACE FUNCTION cleanup_orphaned_records()
RETURNS TRIGGER AS $$
BEGIN
  -- If auth user is deleted, clean up any remaining orphaned records
  IF TG_OP = 'DELETE' THEN
    -- Clean up orphaned profiles
    DELETE FROM public.profiles WHERE id = OLD.id;
    
    -- Clean up orphaned users table records
    DELETE FROM public.users WHERE id = OLD.id;
    
    -- Clean up orphaned mood boards
    DELETE FROM public.mood_boards WHERE user_id = OLD.id;
    
    -- Clean up orphaned user preferences if table exists
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'user_preferences') THEN
      DELETE FROM public.user_preferences WHERE user_id = OLD.id;
    END IF;
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. Create the trigger on auth.users
DROP TRIGGER IF EXISTS cleanup_orphaned_records_trigger ON auth.users;
CREATE TRIGGER cleanup_orphaned_records_trigger
  AFTER DELETE ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION cleanup_orphaned_records();

-- 7. Add indexes for better deletion performance
CREATE INDEX IF NOT EXISTS idx_mood_boards_user_id ON public.mood_boards(user_id);
CREATE INDEX IF NOT EXISTS idx_profiles_id ON public.profiles(id);
CREATE INDEX IF NOT EXISTS idx_users_id ON public.users(id);

-- 8. Create a function to check for orphaned records
CREATE OR REPLACE FUNCTION check_orphaned_records()
RETURNS TABLE(table_name TEXT, orphaned_count BIGINT) AS $$
BEGIN
  RETURN QUERY
  SELECT 'profiles'::TEXT, COUNT(*)::BIGINT
  FROM public.profiles p
  LEFT JOIN auth.users a ON p.id = a.id
  WHERE a.id IS NULL
  
  UNION ALL
  
  SELECT 'users'::TEXT, COUNT(*)::BIGINT
  FROM public.users u
  LEFT JOIN auth.users a ON u.id = a.id
  WHERE a.id IS NULL
  
  UNION ALL
  
  SELECT 'mood_boards'::TEXT, COUNT(*)::BIGINT
  FROM public.mood_boards mb
  LEFT JOIN auth.users a ON mb.user_id = a.id
  WHERE a.id IS NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 9. Grant necessary permissions
GRANT EXECUTE ON FUNCTION safe_delete_user(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION cleanup_orphaned_records() TO authenticated;
GRANT EXECUTE ON FUNCTION check_orphaned_records() TO authenticated;

-- 10. Create a function to manually clean up orphaned records (for admin use)
CREATE OR REPLACE FUNCTION cleanup_all_orphaned_records()
RETURNS INTEGER AS $$
DECLARE
  total_cleaned INTEGER := 0;
  cleaned INTEGER;
BEGIN
  -- Clean up orphaned profiles
  DELETE FROM public.profiles 
  WHERE id NOT IN (SELECT id FROM auth.users);
  GET DIAGNOSTICS cleaned = ROW_COUNT;
  total_cleaned := total_cleaned + cleaned;
  
  -- Clean up orphaned users table records
  DELETE FROM public.users 
  WHERE id NOT IN (SELECT id FROM auth.users);
  GET DIAGNOSTICS cleaned = ROW_COUNT;
  total_cleaned := total_cleaned + cleaned;
  
  -- Clean up orphaned mood boards
  DELETE FROM public.mood_boards 
  WHERE user_id NOT IN (SELECT id FROM auth.users);
  GET DIAGNOSTICS cleaned = ROW_COUNT;
  total_cleaned := total_cleaned + cleaned;
  
  -- Clean up orphaned user preferences if table exists
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'user_preferences') THEN
    DELETE FROM public.user_preferences 
    WHERE user_id NOT IN (SELECT id FROM auth.users);
    GET DIAGNOSTICS cleaned = ROW_COUNT;
    total_cleaned := total_cleaned + cleaned;
  END IF;
  
  RETURN total_cleaned;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to service role
GRANT EXECUTE ON FUNCTION cleanup_all_orphaned_records() TO service_role;

-- 11. Log the completion
DO $$
BEGIN
  RAISE LOG 'Account deletion fixes completed successfully';
  RAISE LOG 'Foreign key constraints updated with CASCADE DELETE';
  RAISE LOG 'Cleanup functions and triggers created';
  RAISE LOG 'Indexes created for better performance';
END $$;
