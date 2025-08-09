-- Fix OAuth signup triggers to handle conflicts better
-- This script should be run in your Supabase SQL editor

-- Drop existing triggers first
DROP TRIGGER IF EXISTS on_auth_user_created_subscription ON auth.users;
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Drop existing functions
DROP FUNCTION IF EXISTS public.handle_new_user_subscription();
DROP FUNCTION IF EXISTS public.handle_new_user();

-- Create improved function for user subscription data
CREATE OR REPLACE FUNCTION public.handle_new_user_subscription()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, subscription_status, created_at, updated_at)
  VALUES (NEW.id, 'inactive', NOW(), NOW())
  ON CONFLICT (id) DO UPDATE SET
    updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create improved function for user profiles
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, bio, favorite_style, created_at, updated_at)
  VALUES (
    NEW.id, 
    'Interior design enthusiast who loves creating beautiful spaces',
    'Modern Minimalist',
    NOW(), 
    NOW()
  )
  ON CONFLICT (id) DO UPDATE SET
    updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Recreate triggers
CREATE TRIGGER on_auth_user_created_subscription
AFTER INSERT ON auth.users
FOR EACH ROW
EXECUTE PROCEDURE public.handle_new_user_subscription();

CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW
EXECUTE PROCEDURE public.handle_new_user();

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_users_id ON public.users(id);
CREATE INDEX IF NOT EXISTS idx_profiles_id ON public.profiles(id);
CREATE INDEX IF NOT EXISTS idx_mood_boards_user_id ON public.mood_boards(user_id);

-- Add better error handling for the tables
ALTER TABLE public.users 
ADD CONSTRAINT users_subscription_status_check 
CHECK (subscription_status IN ('active', 'inactive', 'cancelled', 'trialing'));

-- Ensure proper foreign key constraints
ALTER TABLE public.profiles 
DROP CONSTRAINT IF EXISTS profiles_id_fkey,
ADD CONSTRAINT profiles_id_fkey 
FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE public.users 
DROP CONSTRAINT IF EXISTS users_id_fkey,
ADD CONSTRAINT users_id_fkey 
FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- Add cascade delete to mood_boards if not already present
ALTER TABLE public.mood_boards 
DROP CONSTRAINT IF EXISTS mood_boards_user_id_fkey,
ADD CONSTRAINT mood_boards_user_id_fkey 
FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
