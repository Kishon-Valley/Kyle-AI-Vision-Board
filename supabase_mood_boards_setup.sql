-- Create mood_boards table to store user-generated mood boards

-- First, create the table
CREATE TABLE IF NOT EXISTS mood_boards (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  image_url TEXT NOT NULL,
  description TEXT NOT NULL,
  style TEXT NOT NULL,
  room_type TEXT NOT NULL,
  color_palette TEXT[] DEFAULT '{}',
  budget TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Set up Row Level Security (RLS)
ALTER TABLE mood_boards ENABLE ROW LEVEL SECURITY;

-- Create policies
-- Allow users to view their own mood boards
CREATE POLICY "Users can view their own mood boards" 
  ON mood_boards 
  FOR SELECT 
  USING (auth.uid() = user_id);

-- Allow users to insert their own mood boards
CREATE POLICY "Users can insert their own mood boards" 
  ON mood_boards 
  FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

-- Allow users to update their own mood boards
CREATE POLICY "Users can update their own mood boards" 
  ON mood_boards 
  FOR UPDATE 
  USING (auth.uid() = user_id);

-- Allow users to delete their own mood boards
CREATE POLICY "Users can delete their own mood boards" 
  ON mood_boards 
  FOR DELETE 
  USING (auth.uid() = user_id);

-- Create trigger for updating the updated_at column
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_mood_boards_updated_at
BEFORE UPDATE ON mood_boards
FOR EACH ROW
EXECUTE FUNCTION update_updated_at();
