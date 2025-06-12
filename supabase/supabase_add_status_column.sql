-- Add status column to mood_boards table
ALTER TABLE public.mood_boards ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'in_progress';

-- Create an enum type for status values
COMMENT ON COLUMN public.mood_boards.status IS 'Project status: in_progress, completed, archived';

-- Update existing records to have a default status
UPDATE public.mood_boards SET status = 'in_progress' WHERE status IS NULL;
