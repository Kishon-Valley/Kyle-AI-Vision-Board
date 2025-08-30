import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { userId } = req.body;
    
    if (!userId) {
      return res.status(400).json({ error: 'User ID is required' });
    }

    // Initialize Supabase with service role
    const supabase = createClient(
      process.env.VITE_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_KEY,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    );

    // 1. Cancel any active subscription first
    try {
      const { error: subError } = await supabase
        .from('subscriptions')
        .update({ status: 'canceled' })
        .eq('user_id', userId);

      if (subError) throw subError;
    } catch (subError) {
      console.error('Error canceling subscription:', subError);
      // Continue with account deletion even if subscription cancellation fails
    }

    // 2. Delete user data from storage
    try {
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
    } catch (storageError) {
      console.error('Storage cleanup error:', storageError);
      // Continue with account deletion even if storage cleanup fails
    }

    // 3. Delete from database tables
    const tables = ['profiles', 'mood_boards', 'user_preferences'];
    for (const table of tables) {
      try {
        const { error } = await supabase
          .from(table)
          .delete()
          .eq('user_id', userId);
        
        if (error) {
          console.error(`Error deleting from ${table}:`, error);
        }
      } catch (dbError) {
        console.error(`Database error for table ${table}:`, dbError);
      }
    }

    // 4. Delete auth user (requires admin client)
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