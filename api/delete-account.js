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
    // Tables with foreign key references to auth.users should be deleted first
    const tablesToDelete = [
      { table: 'mood_boards', column: 'user_id' },
      { table: 'user_preferences', column: 'user_id' },
      // These tables reference auth.users(id) directly, so we need to handle them carefully
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

export const config = {
  api: {
    bodyParser: {
      sizeLimit: '1mb',
    },
  },
};