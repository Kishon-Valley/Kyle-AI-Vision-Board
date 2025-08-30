import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { userId, action } = req.body;
    
    // Support both account deletion and cleanup operations
    if (action === 'cleanup' || action === 'check') {
      return await handleCleanupOperations(req, res, action);
    }
    
    // Default action: delete account
    if (!userId) {
      return res.status(400).json({ error: 'User ID is required' });
    }

    console.log(`Starting account deletion for user: ${userId}`);

    // 1. Delete user data from storage
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

      // Also clean up profile images
      const { data: profileFiles, error: profileListError } = await supabase.storage
        .from('profile-images')
        .list(userId);

      if (!profileListError && profileFiles?.length > 0) {
        const profileFilesToRemove = profileFiles.map((file) => `${userId}/${file.name}`);
        const { error: profileRemoveError } = await supabase.storage
          .from('profile-images')
          .remove(profileFilesToRemove);

        if (profileRemoveError) {
          console.error('Error removing profile images:', profileRemoveError);
        }
      }
    } catch (storageError) {
      console.warn('Storage cleanup warning:', storageError);
    }

    // 2. Delete from database tables in correct order (children first, then parents)
    // Only include tables that actually exist in your database
    const tablesToDelete = [
      { table: 'mood_boards', column: 'user_id' },
      // Remove user_preferences since it doesn't exist in your database
      { table: 'profiles', column: 'id' },
      { table: 'users', column: 'id' },
    ];

    for (const { table, column } of tablesToDelete) {
      try {
        const { error } = await supabase
          .from(table)
          .delete()
          .eq(column, userId);
        
        if (error) {
          console.error(`Error deleting from ${table} with ${column}=${userId}:`, error);
          // Don't fail the entire process for table deletion errors
          // Continue with other cleanup steps
        } else {
          console.log(`Successfully deleted from ${table}`);
        }
      } catch (tableError) {
        console.error(`Exception deleting from ${table}:`, tableError);
      }
    }

    // 3. Delete auth user (this will cascade to any remaining references)
    try {
      const { error: authError } = await supabase.auth.admin.deleteUser(userId);
      if (authError) {
        console.error('Error deleting auth user:', authError);
        
        // If auth deletion fails, try to clean up any remaining orphaned records
        console.log('Attempting to clean up orphaned records...');
        
        // Force delete any remaining records that might be blocking auth deletion
        for (const { table, column } of tablesToDelete) {
          try {
            const { error: forceDeleteError } = await supabase
              .from(table)
              .delete()
              .eq(column, userId);
            
            if (forceDeleteError) {
              console.error(`Force delete failed for ${table}:`, forceDeleteError);
            }
          } catch (forceError) {
            console.error(`Force delete exception for ${table}:`, forceError);
          }
        }
        
        // Try auth deletion again
        const { error: retryAuthError } = await supabase.auth.admin.deleteUser(userId);
        if (retryAuthError) {
          console.error('Retry auth deletion failed:', retryAuthError);
          return res.status(500).json({ 
            error: 'Failed to delete user account',
            details: retryAuthError.message 
          });
        }
      }
      
      console.log(`Successfully deleted auth user: ${userId}`);
    } catch (authException) {
      console.error('Exception during auth deletion:', authException);
      return res.status(500).json({ 
        error: 'Failed to delete user account',
        details: authException.message 
      });
    }

    // 4. Verify cleanup by checking if any records remain
    let cleanupComplete = true;
    for (const { table, column } of tablesToDelete) {
      try {
        const { data: remainingRecords, error: checkError } = await supabase
          .from(table)
          .select('id')
          .eq(column, userId)
          .limit(1);
        
        if (!checkError && remainingRecords && remainingRecords.length > 0) {
          console.warn(`Found remaining records in ${table} for user ${userId}`);
          cleanupComplete = false;
        }
      } catch (checkException) {
        console.warn(`Could not verify cleanup for ${table}:`, checkException);
      }
    }

    if (!cleanupComplete) {
      console.warn('Some cleanup steps may not have completed successfully');
    }

    console.log(`Account deletion completed for user: ${userId}`);
    return res.status(200).json({ 
      success: true, 
      message: 'Account deleted successfully',
      cleanupComplete 
    });
    
  } catch (error) {
    console.error('Error in delete-account:', error);
    return res.status(500).json({ 
      error: 'Internal server error',
      details: error.message 
    });
  }
}

// Helper function to handle cleanup operations
async function handleCleanupOperations(req, res, action) {
  try {
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

        // Don't check user_preferences since the table doesn't exist
        orphanedRecords.user_preferences = 'table_not_found';

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

        // Skip user_preferences cleanup since the table doesn't exist
        console.log('user_preferences table not found, skipping');

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
    }

  } catch (error) {
    console.error('Error in cleanup operations:', error);
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