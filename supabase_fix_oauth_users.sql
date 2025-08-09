-- Fix for OAuth users who failed to be created properly
-- Run this in your Supabase SQL editor

-- First, let's see what users exist in auth.users but not in our tables
SELECT 
  au.id,
  au.email,
  au.created_at as auth_created,
  u.id as users_table_id,
  p.id as profiles_table_id
FROM auth.users au
LEFT JOIN public.users u ON au.id = u.id
LEFT JOIN public.profiles p ON au.id = p.id
WHERE u.id IS NULL OR p.id IS NULL;

-- Create missing user records for users who exist in auth but not in our tables
INSERT INTO public.users (id, subscription_status)
SELECT 
  au.id,
  'inactive'
FROM auth.users au
LEFT JOIN public.users u ON au.id = u.id
WHERE u.id IS NULL
ON CONFLICT (id) DO NOTHING;

-- Create missing profile records
INSERT INTO public.profiles (id, bio, favorite_style)
SELECT 
  au.id,
  'Interior design enthusiast who loves creating beautiful spaces',
  'Modern Minimalist'
FROM auth.users au
LEFT JOIN public.profiles p ON au.id = p.id
WHERE p.id IS NULL
ON CONFLICT (id) DO NOTHING;

-- Verify the fix worked
SELECT 
  au.id,
  au.email,
  u.subscription_status,
  p.bio
FROM auth.users au
LEFT JOIN public.users u ON au.id = u.id
LEFT JOIN public.profiles p ON au.id = p.id
ORDER BY au.created_at DESC
LIMIT 10;
