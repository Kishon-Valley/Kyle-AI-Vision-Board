-- Add new columns to users table for pricing tiers and image limits
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS subscription_tier TEXT DEFAULT 'free';
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS images_used_this_month INTEGER DEFAULT 0;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS images_limit_per_month INTEGER DEFAULT 0;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS last_reset_date DATE DEFAULT CURRENT_DATE;

-- Create an enum for subscription tiers (optional, but good for data integrity)
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'subscription_tier_enum') THEN
    CREATE TYPE subscription_tier_enum AS ENUM ('free', 'basic', 'pro', 'yearly');
  END IF;
END $$;

-- Remove the default value first, then change the type, then add the default back
ALTER TABLE public.users ALTER COLUMN subscription_tier DROP DEFAULT;
ALTER TABLE public.users ALTER COLUMN subscription_tier TYPE subscription_tier_enum USING subscription_tier::subscription_tier_enum;
ALTER TABLE public.users ALTER COLUMN subscription_tier SET DEFAULT 'free'::subscription_tier_enum;

-- Create a function to reset monthly image usage
CREATE OR REPLACE FUNCTION reset_monthly_image_usage()
RETURNS void AS $$
BEGIN
  UPDATE public.users 
  SET 
    images_used_this_month = 0,
    last_reset_date = CURRENT_DATE
  WHERE 
    last_reset_date < DATE_TRUNC('month', CURRENT_DATE);
END;
$$ LANGUAGE plpgsql;

-- Create a function to check and increment image usage
CREATE OR REPLACE FUNCTION check_and_increment_image_usage(user_uuid UUID)
RETURNS BOOLEAN AS $$
DECLARE
  user_record RECORD;
BEGIN
  -- Get user's current subscription info
  SELECT subscription_tier, images_used_this_month, images_limit_per_month, last_reset_date
  INTO user_record
  FROM public.users
  WHERE id = user_uuid;
  
  -- If user not found, return false
  IF user_record IS NULL THEN
    RETURN FALSE;
  END IF;
  
  -- Reset monthly usage if it's a new month
  IF user_record.last_reset_date < DATE_TRUNC('month', CURRENT_DATE) THEN
    UPDATE public.users 
    SET 
      images_used_this_month = 0,
      last_reset_date = CURRENT_DATE
    WHERE id = user_uuid;
    user_record.images_used_this_month := 0;
  END IF;
  
  -- Check if user has remaining images
  IF user_record.images_used_this_month >= user_record.images_limit_per_month THEN
    RETURN FALSE;
  END IF;
  
  -- Increment image usage
  UPDATE public.users 
  SET images_used_this_month = images_used_this_month + 1
  WHERE id = user_uuid;
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- Create a function to get user's remaining images
CREATE OR REPLACE FUNCTION get_remaining_images(user_uuid UUID)
RETURNS INTEGER AS $$
DECLARE
  user_record RECORD;
BEGIN
  -- Get user's current subscription info
  SELECT subscription_tier, images_used_this_month, images_limit_per_month, last_reset_date
  INTO user_record
  FROM public.users
  WHERE id = user_uuid;
  
  -- If user not found, return 0
  IF user_record IS NULL THEN
    RETURN 0;
  END IF;
  
  -- Reset monthly usage if it's a new month
  IF user_record.last_reset_date < DATE_TRUNC('month', CURRENT_DATE) THEN
    UPDATE public.users 
    SET 
      images_used_this_month = 0,
      last_reset_date = CURRENT_DATE
    WHERE id = user_uuid;
    user_record.images_used_this_month := 0;
  END IF;
  
  -- Return remaining images
  RETURN GREATEST(0, user_record.images_limit_per_month - user_record.images_used_this_month);
END;
$$ LANGUAGE plpgsql;

-- Update the handle_new_user_complete function to set default values
CREATE OR REPLACE FUNCTION public.handle_new_user_complete()
RETURNS TRIGGER AS $$
BEGIN
  -- Insert into users table with email and default tier values
  INSERT INTO public.users (id, email, subscription_status, subscription_tier, images_limit_per_month)
  VALUES (NEW.id, NEW.email, 'inactive', 'free', 0)
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



