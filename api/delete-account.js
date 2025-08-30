import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { userId } = req.body;
    
    if (!userId) {
      return res.status(400).json({ error: 'User ID is required' });
    }

    // 1. Delete user data from storage
    const { data: files, error: listError } = await supabase.storage
      .from('user-uploads')
      .list(userId);

    if (!listError && files?.length > 0) {
      const filesToRemove = files.map((file) => `${userId}/${file.name}`);
      const { error: removeError } = await supabase.storage
        .from('user-uploads')
        .remove(filesToRemove);

      if (removeError) {
        console.error('Error removing user files:', removeError);
      }
    }

    // 2. Delete from database tables (delete children before parents)
    // Use correct key columns per table to avoid partial cleanup
    const tablesByColumn = [
      { table: 'mood_boards', column: 'user_id' },
      { table: 'user_preferences', column: 'user_id' },
      // parent tables reference auth.users(id) via primary key
      { table: 'profiles', column: 'id' },
      { table: 'users', column: 'id' },
    ];

    for (const { table, column } of tablesByColumn) {
      const { error } = await supabase
        .from(table)
        .delete()
        .eq(column, userId);
      if (error) {
        console.error(`Error deleting from ${table} with ${column}=${userId}:`, error);
      }
    }

    // 3. Delete auth user (requires admin client)
    const { error: authError } = await supabase.auth.admin.deleteUser(userId);
    if (authError) {
      console.error('Error deleting auth user:', authError);
      return res.status(500).json({ 
        error: 'Failed to delete user account',
        details: authError.message 
      });
    }

    return res.status(200).json({ success: true });
  } catch (error) {
    console.error('Error in delete-account:', error);
    return res.status(500).json({ 
      error: 'Internal server error',
      details: error.message 
    });
  }
}

export const config = {
  api: {
    bodyParser: {
      sizeLimit: '1mb',
    },
  },
};