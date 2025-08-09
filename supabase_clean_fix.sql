-- Clean fix for OAuth users and database issues
-- Run this in your Supabase SQL editor

-- Step 1: Clean up any existing problematic data
DELETE FROM public.users WHERE email IS NULL;
DELETE FROM public.profiles WHERE id NOT IN (SELECT id FROM auth.users);

-- Step 2: Ensure tables have correct structure
-- Add email column to users table if missing
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'email') THEN
    ALTER TABLE public.users ADD COLUMN email TEXT;
  END IF;
END $$;

-- Add avatar_url column to profiles table if missing
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'avatar_url') THEN
    ALTER TABLE public.profiles ADD COLUMN avatar_url TEXT;
  END IF;
END $$;

-- Step 3: Create missing user records for existing auth users
INSERT INTO public.users (id, email, subscription_status)
SELECT 
  au.id,
  au.email,
  'inactive'
FROM auth.users au
LEFT JOIN public.users u ON au.id = u.id
WHERE u.id IS NULL
ON CONFLICT (id) DO UPDATE SET 
  email = EXCLUDED.email,
  updated_at = NOW();

-- Step 4: Create missing profile records
INSERT INTO public.profiles (id, bio, favorite_style)
SELECT 
  au.id,
  'Interior design enthusiast who loves creating beautiful spaces',
  'Modern Minimalist'
FROM auth.users au
LEFT JOIN public.profiles p ON au.id = p.id
WHERE p.id IS NULL
ON CONFLICT (id) DO NOTHING;

-- Step 5: Update existing records with missing data
UPDATE public.users 
SET email = auth.users.email
FROM auth.users 
WHERE public.users.id = auth.users.id 
AND public.users.email IS NULL;

-- Step 6: Verify the fix worked
SELECT 
  au.id,
  au.email as auth_email,
  u.email as users_email,
  u.subscription_status,
  p.bio,
  CASE 
    WHEN u.id IS NULL THEN 'Missing from users table'
    WHEN p.id IS NULL THEN 'Missing from profiles table'
    WHEN u.email IS NULL THEN 'Missing email in users table'
    ELSE 'OK'
  END as status
FROM auth.users au
LEFT JOIN public.users u ON au.id = u.id
LEFT JOIN public.profiles p ON au.id = p.id
ORDER BY au.created_at DESC
LIMIT 10;
