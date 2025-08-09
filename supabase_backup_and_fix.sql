-- SAFE BACKUP AND FIX FOR OAUTH DATABASE ISSUES
-- This script backs up existing data before fixing the database

-- STEP 1: Create backup tables
CREATE TABLE IF NOT EXISTS public.users_backup AS 
SELECT * FROM public.users WHERE EXISTS (SELECT 1 FROM public.users);

CREATE TABLE IF NOT EXISTS public.profiles_backup AS 
SELECT * FROM public.profiles WHERE EXISTS (SELECT 1 FROM public.profiles);

-- STEP 2: Disable all triggers temporarily
DROP TRIGGER IF EXISTS on_auth_user_created_subscription ON auth.users;
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP TRIGGER IF EXISTS on_auth_user_created_complete ON auth.users;

-- STEP 3: Drop and recreate tables with correct structure
DROP TABLE IF EXISTS public.users CASCADE;
DROP TABLE IF EXISTS public.profiles CASCADE;

-- Create users table with proper structure
CREATE TABLE public.users (
  id UUID REFERENCES auth.users(id) PRIMARY KEY,
  email TEXT,
  subscription_id TEXT,
  subscription_status TEXT DEFAULT 'inactive',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Create profiles table with proper structure
CREATE TABLE public.profiles (
  id UUID REFERENCES auth.users(id) PRIMARY KEY,
  bio TEXT DEFAULT 'Interior design enthusiast who loves creating beautiful spaces',
  favorite_style TEXT DEFAULT 'Modern Minimalist',
  avatar_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- STEP 4: Restore data from backup if it exists
INSERT INTO public.users (id, email, subscription_id, subscription_status, created_at, updated_at)
SELECT id, email, subscription_id, subscription_status, created_at, updated_at
FROM public.users_backup
ON CONFLICT (id) DO UPDATE SET 
  email = EXCLUDED.email,
  subscription_id = EXCLUDED.subscription_id,
  subscription_status = EXCLUDED.subscription_status,
  updated_at = NOW();

INSERT INTO public.profiles (id, bio, favorite_style, avatar_url, created_at, updated_at)
SELECT id, bio, favorite_style, avatar_url, created_at, updated_at
FROM public.profiles_backup
ON CONFLICT (id) DO NOTHING;

-- STEP 5: Enable RLS and create policies
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Users table policies
CREATE POLICY "Users can view own subscription data" ON public.users
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Service role can manage all user data" ON public.users
  FOR ALL USING (auth.role() = 'service_role');

-- Profiles table policies
CREATE POLICY "Users can view own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile" ON public.profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

-- STEP 6: Create trigger functions
-- Function to handle user updates
CREATE OR REPLACE FUNCTION public.handle_users_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to handle profile updates
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to handle new user creation
CREATE OR REPLACE FUNCTION public.handle_new_user_complete()
RETURNS TRIGGER AS $$
BEGIN
  -- Insert into users table
  INSERT INTO public.users (id, email, subscription_status)
  VALUES (NEW.id, NEW.email, 'inactive')
  ON CONFLICT (id) DO UPDATE SET 
    email = EXCLUDED.email,
    updated_at = NOW();
  
  -- Insert into profiles table
  INSERT INTO public.profiles (id, bio, favorite_style)
  VALUES (NEW.id, 'Interior design enthusiast who loves creating beautiful spaces', 'Modern Minimalist')
  ON CONFLICT (id) DO NOTHING;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- STEP 7: Create triggers
CREATE TRIGGER set_users_updated_at
BEFORE UPDATE ON public.users
FOR EACH ROW
EXECUTE PROCEDURE public.handle_users_updated_at();

CREATE TRIGGER set_updated_at
BEFORE UPDATE ON public.profiles
FOR EACH ROW
EXECUTE PROCEDURE public.handle_updated_at();

CREATE TRIGGER on_auth_user_created_complete
AFTER INSERT ON auth.users
FOR EACH ROW
EXECUTE PROCEDURE public.handle_new_user_complete();

-- STEP 8: Create records for any remaining auth users
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

INSERT INTO public.profiles (id, bio, favorite_style)
SELECT 
  au.id,
  'Interior design enthusiast who loves creating beautiful spaces',
  'Modern Minimalist'
FROM auth.users au
LEFT JOIN public.profiles p ON au.id = p.id
WHERE p.id IS NULL
ON CONFLICT (id) DO NOTHING;

-- STEP 9: Verify the fix
SELECT 
  'Database setup complete' as status,
  COUNT(*) as total_auth_users,
  (SELECT COUNT(*) FROM public.users) as total_users_records,
  (SELECT COUNT(*) FROM public.profiles) as total_profiles_records
FROM auth.users;

-- STEP 10: Clean up backup tables (optional - uncomment if you want to remove them)
-- DROP TABLE IF EXISTS public.users_backup;
-- DROP TABLE IF EXISTS public.profiles_backup;

