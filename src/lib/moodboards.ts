import { supabase } from './supabase';

export interface MoodBoard {
  id?: string;
  user_id?: string;
  image_url: string;
  description: string;
  style: string;
  room_type: string;
  color_palette?: string[];
  budget?: string;
  created_at?: string;
  status?: 'in_progress' | 'completed' | 'archived';
}

/**
 * Save a mood board to the user's account in Supabase
 */
export async function saveMoodBoard(moodBoard: MoodBoard) {
  const { data: userData } = await supabase.auth.getUser();
  
  if (!userData?.user) {
    throw new Error('User not authenticated');
  }
  
  const { data, error } = await supabase
    .from('mood_boards')
    .insert([
      {
        user_id: userData.user.id,
        image_url: moodBoard.image_url,
        description: moodBoard.description,
        style: moodBoard.style,
        room_type: moodBoard.room_type,
        color_palette: moodBoard.color_palette,
        budget: moodBoard.budget,
        status: moodBoard.status || 'in_progress'
      }
    ])
    .select();
  
  if (error) {
    console.error('Error saving mood board:', error);
    throw error;
  }
  
  return data[0];
}

/**
 * Get all mood boards for the current user
 */
export async function getUserMoodBoards() {
  const { data: userData } = await supabase.auth.getUser();
  
  if (!userData?.user) {
    throw new Error('User not authenticated');
  }
  
  const { data, error } = await supabase
    .from('mood_boards')
    .select('*')
    .eq('user_id', userData.user.id)
    .order('created_at', { ascending: false });
  
  if (error) {
    console.error('Error fetching mood boards:', error);
    throw error;
  }
  
  return data;
}

/**
 * Get a single mood board by ID
 */
export async function getMoodBoardById(id: string) {
  const { data, error } = await supabase
    .from('mood_boards')
    .select('*')
    .eq('id', id)
    .single();
  
  if (error) {
    console.error('Error fetching mood board:', error);
    throw error;
  }
  
  return data;
}

/**
 * Delete a mood board
 */
export async function deleteMoodBoard(id: string) {
  const { data: userData } = await supabase.auth.getUser();
  
  if (!userData?.user) {
    throw new Error('User not authenticated');
  }
  
  const { error } = await supabase
    .from('mood_boards')
    .delete()
    .eq('id', id)
    .eq('user_id', userData.user.id);
  
  if (error) {
    console.error('Error deleting mood board:', error);
    throw error;
  }
  
  return true;
}

/**
 * Update the status of a mood board
 */
export async function updateMoodBoardStatus(id: string, status: 'in_progress' | 'completed' | 'archived') {
  const { data: userData } = await supabase.auth.getUser();
  
  if (!userData?.user) {
    throw new Error('User not authenticated');
  }
  
  const { data, error } = await supabase
    .from('mood_boards')
    .update({ status, updated_at: new Date().toISOString() })
    .eq('id', id)
    .eq('user_id', userData.user.id)
    .select();
  
  if (error) {
    console.error('Error updating mood board status:', error);
    throw error;
  }
  
  return data[0];
}
