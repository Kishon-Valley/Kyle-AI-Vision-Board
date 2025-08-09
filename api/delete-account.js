import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { userId } = req.body;

    if (!userId) {
      return res.status(400).json({ error: 'Missing userId' });
    }

    // Guard against missing backend credentials
    if (!process.env.VITE_SUPABASE_URL || !process.env.SUPABASE_SERVICE_KEY) {
      console.error('Supabase admin credentials are not configured.');
      return res.status(500).json({ error: 'Server mis-configuration' });
    }

    // Admin client (service role) – NEVER expose service key to the client bundle
    const adminClient = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    console.log(`🗑️ Starting account deletion for user: ${userId}`);

    // Step 1: Delete all related data first (mood boards, profiles, etc.)
    try {
      // Delete mood boards
      const { error: moodBoardsError } = await adminClient
        .from('mood_boards')
        .delete()
        .eq('user_id', userId);
      
      if (moodBoardsError) {
        console.warn('Failed to delete mood boards:', moodBoardsError);
      } else {
        console.log('✅ Mood boards deleted');
      }

      // Delete profile data
      const { error: profileError } = await adminClient
        .from('profiles')
        .delete()
        .eq('id', userId);
      
      if (profileError) {
        console.warn('Failed to delete profile:', profileError);
      } else {
        console.log('✅ Profile deleted');
      }

      // Delete user subscription data
      const { error: userError } = await adminClient
        .from('users')
        .delete()
        .eq('id', userId);
      
      if (userError) {
        console.warn('Failed to delete user data:', userError);
      } else {
        console.log('✅ User data deleted');
      }

      // Delete any storage files
      try {
        const { data: files, error: listError } = await adminClient.storage
          .from('profile-images')
          .list(userId);
        
        if (!listError && files && files.length > 0) {
          const filePaths = files.map(file => `${userId}/${file.name}`);
          const { error: removeError } = await adminClient.storage
            .from('profile-images')
            .remove(filePaths);
          
          if (removeError) {
            console.warn('Failed to delete storage files:', removeError);
          } else {
            console.log('✅ Storage files deleted');
          }
        }
      } catch (storageError) {
        console.warn('Error handling storage cleanup:', storageError);
      }

    } catch (dataError) {
      console.error('Error during data cleanup:', dataError);
      // Continue with auth user deletion even if data cleanup fails
    }

    // Step 2: Delete the auth user
    console.log('🗑️ Deleting auth user...');
    const { error } = await adminClient.auth.admin.deleteUser(userId, true);

    if (error) {
      console.error('Error deleting user via admin API:', error);
      return res.status(500).json({ error: error.message });
    }

    console.log(`✅ Account deletion completed for user: ${userId}`);
    return res.status(200).json({ success: true, message: 'Account deleted successfully' });
  } catch (err) {
    console.error('Unhandled error in delete-account route:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
