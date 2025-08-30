import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { action, userId } = req.body;
    
    if (!action || !['check', 'cleanup', 'cleanup-user'].includes(action)) {
      return res.status(400).json({ error: 'Invalid action. Must be "check", "cleanup", or "cleanup-user"' });
    }

    console.log(`Cleanup action: ${action}${userId ? ` for user: ${userId}` : ''}`);

    // Guard against missing backend credentials
    if (!process.env.VITE_SUPABASE_URL || !process.env.SUPABASE_SERVICE_KEY) {
      console.error('Supabase admin credentials are not configured.');
      return res.status(500).json({ error: 'Server mis-configuration' });
    }

    if (action === 'check') {
      // Check for orphaned records across all tables
      const orphanedRecords = {};
      
      try {
        // Check profiles table
        const { data: orphanedProfiles, error: profilesError } = await supabase
          .from('profiles')
          .select('id')
          .not('id', 'in', `(SELECT id FROM auth.users)`);
        
        if (!profilesError && orphanedProfiles) {
          orphanedRecords.profiles = orphanedProfiles.length;
        }

        // Check users table
        const { data: orphanedUsers, error: usersError } = await supabase
          .from('users')
          .select('id')
          .not('id', 'in', `(SELECT id FROM auth.users)`);
        
        if (!usersError && orphanedUsers) {
          orphanedRecords.users = orphanedUsers.length;
        }

        // Check mood_boards table
        const { data: orphanedMoodBoards, error: moodBoardsError } = await supabase
          .from('mood_boards')
          .select('id')
          .not('user_id', 'in', `(SELECT id FROM auth.users)`);
        
        if (!moodBoardsError && orphanedMoodBoards) {
          orphanedRecords.mood_boards = orphanedMoodBoards.length;
        }

        // Check user_preferences table if it exists
        try {
          const { data: orphanedPreferences, error: preferencesError } = await supabase
            .from('user_preferences')
            .select('id')
            .not('user_id', 'in', `(SELECT id FROM auth.users)`);
          
          if (!preferencesError && orphanedPreferences) {
            orphanedRecords.user_preferences = orphanedPreferences.length;
          }
        } catch (tableError) {
          // Table might not exist, which is fine
          orphanedRecords.user_preferences = 'table_not_found';
        }

        return res.status(200).json({
          success: true,
          orphanedRecords,
          message: 'Orphaned records check completed'
        });

      } catch (checkError) {
        console.error('Error checking orphaned records:', checkError);
        return res.status(500).json({ 
          error: 'Failed to check orphaned records',
          details: checkError.message 
        });
      }

    } else if (action === 'cleanup') {
      // Clean up all orphaned records
      let totalCleaned = 0;
      
      try {
        // Clean up orphaned profiles
        const { error: profilesError } = await supabase
          .from('profiles')
          .delete()
          .not('id', 'in', `(SELECT id FROM auth.users)`);
        
        if (!profilesError) {
          console.log('Cleaned up orphaned profiles');
          totalCleaned++;
        }

        // Clean up orphaned users table records
        const { error: usersError } = await supabase
          .from('users')
          .delete()
          .not('id', 'in', `(SELECT id FROM auth.users)`);
        
        if (!usersError) {
          console.log('Cleaned up orphaned users records');
          totalCleaned++;
        }

        // Clean up orphaned mood boards
        const { error: moodBoardsError } = await supabase
          .from('mood_boards')
          .delete()
          .not('user_id', 'in', `(SELECT id FROM auth.users)`);
        
        if (!moodBoardsError) {
          console.log('Cleaned up orphaned mood boards');
          totalCleaned++;
        }

        // Clean up orphaned user preferences if table exists
        try {
          const { error: preferencesError } = await supabase
            .from('user_preferences')
            .delete()
            .not('user_id', 'in', `(SELECT id FROM auth.users)`);
          
          if (!preferencesError) {
            console.log('Cleaned up orphaned user preferences');
            totalCleaned++;
          }
        } catch (tableError) {
          // Table might not exist, which is fine
          console.log('user_preferences table not found, skipping');
        }

        return res.status(200).json({
          success: true,
          totalCleaned,
          message: `Cleanup completed. ${totalCleaned} table cleanups performed.`
        });

      } catch (cleanupError) {
        console.error('Error during cleanup:', cleanupError);
        return res.status(500).json({ 
          error: 'Failed to cleanup orphaned records',
          details: cleanupError.message 
        });
      }

    } else if (action === 'cleanup-user' && userId) {
      // Clean up records for a specific user
      let cleanedTables = [];
      
      try {
        // Clean up user's mood boards
        const { error: moodBoardsError } = await supabase
          .from('mood_boards')
          .delete()
          .eq('user_id', userId);
        
        if (!moodBoardsError) {
          cleanedTables.push('mood_boards');
        }

        // Clean up user's profile
        const { error: profileError } = await supabase
          .from('profiles')
          .delete()
          .eq('id', userId);
        
        if (!profileError) {
          cleanedTables.push('profiles');
        }

        // Clean up user's subscription data
        const { error: userError } = await supabase
          .from('users')
          .delete()
          .eq('id', userId);
        
        if (!userError) {
          cleanedTables.push('users');
        }

        // Clean up user preferences if table exists
        try {
          const { error: preferencesError } = await supabase
            .from('user_preferences')
            .delete()
            .eq('user_id', userId);
          
          if (!preferencesError) {
            cleanedTables.push('user_preferences');
          }
        } catch (tableError) {
          // Table might not exist, which is fine
        }

        return res.status(200).json({
          success: true,
          cleanedTables,
          message: `User cleanup completed. Cleaned tables: ${cleanedTables.join(', ')}`
        });

      } catch (userCleanupError) {
        console.error('Error during user cleanup:', userCleanupError);
        return res.status(500).json({ 
          error: 'Failed to cleanup user records',
          details: userCleanupError.message 
        });
      }
    }

  } catch (error) {
    console.error('Error in cleanup-orphaned-records:', error);
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
