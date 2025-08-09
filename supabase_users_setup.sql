-- Create users table to store subscription information
CREATE TABLE IF NOT EXISTS public.users (
  id UUID REFERENCES auth.users(id) PRIMARY KEY,
  email TEXT,
  subscription_id TEXT,
  subscription_status TEXT DEFAULT 'inactive',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Add email column if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'email') THEN
    ALTER TABLE public.users ADD COLUMN email TEXT;
  END IF;
END $$;

-- Enable Row Level Security
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist to avoid conflicts
DROP POLICY IF EXISTS "Users can view own subscription data" ON public.users;
DROP POLICY IF EXISTS "Service role can manage all user data" ON public.users;

-- Create policies
-- Allow users to view their own subscription data
CREATE POLICY "Users can view own subscription data" ON public.users
  FOR SELECT USING (auth.uid() = id);

-- Allow service role to manage all user data (for webhooks)
CREATE POLICY "Service role can manage all user data" ON public.users
  FOR ALL USING (auth.role() = 'service_role');

-- Create a trigger to set updated_at on update
CREATE OR REPLACE FUNCTION public.handle_users_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_users_updated_at ON public.users;
CREATE TRIGGER set_users_updated_at
BEFORE UPDATE ON public.users
FOR EACH ROW
EXECUTE PROCEDURE public.handle_users_updated_at();

-- Create a function to handle new user signup (COMBINED with profiles)
CREATE OR REPLACE FUNCTION public.handle_new_user_complete()
RETURNS TRIGGER AS $$
BEGIN
  -- Insert into users table with email
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

-- Drop existing triggers if they exist
DROP TRIGGER IF EXISTS on_auth_user_created_subscription ON auth.users;
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP TRIGGER IF EXISTS on_auth_user_created_complete ON auth.users;

-- Create the combined trigger
CREATE TRIGGER on_auth_user_created_complete
AFTER INSERT ON auth.users
FOR EACH ROW
EXECUTE PROCEDURE public.handle_new_user_complete();
