import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { userId, email, provider } = req.body;

    if (!userId || !email) {
      return res.status(400).json({ error: 'Missing required parameters' });
    }

    // Guard against missing backend credentials
    if (!process.env.VITE_SUPABASE_URL || !process.env.SUPABASE_SERVICE_KEY) {
      console.error('Supabase admin credentials are not configured.');
      return res.status(500).json({ error: 'Server mis-configuration' });
    }

    // Admin client (service role)
    const adminClient = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    console.log(`🔧 Handling OAuth signup for user: ${userId} (${email})`);

    // Check if user exists in auth
    const { data: authUser, error: authError } = await adminClient.auth.admin.getUserById(userId);
    
    if (authError) {
      console.error('Error checking auth user:', authError);
      return res.status(500).json({ error: 'Failed to verify user authentication' });
    }

    if (!authUser.user) {
      return res.status(404).json({ error: 'User not found in authentication system' });
    }

    // Check for existing data conflicts
    try {
      // Check if user data exists in users table
      const { data: existingUser, error: userCheckError } = await adminClient
        .from('users')
        .select('id')
        .eq('id', userId)
        .maybeSingle();

      if (userCheckError) {
        console.warn('Error checking existing user data:', userCheckError);
      } else if (existingUser) {
        console.log('✅ User data already exists in users table');
      } else {
        // Create user data if it doesn't exist
        console.log('📝 Creating user data in users table...');
        const { error: createUserError } = await adminClient
          .from('users')
          .insert({
            id: userId,
            subscription_status: 'inactive',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          });

        if (createUserError) {
          console.error('Error creating user data:', createUserError);
          return res.status(500).json({ error: 'Database error saving new user' });
        }
        console.log('✅ User data created successfully');
      }

      // Check if profile exists
      const { data: existingProfile, error: profileCheckError } = await adminClient
        .from('profiles')
        .select('id')
        .eq('id', userId)
        .maybeSingle();

      if (profileCheckError) {
        console.warn('Error checking existing profile:', profileCheckError);
      } else if (existingProfile) {
        console.log('✅ Profile already exists');
      } else {
        // Create profile if it doesn't exist
        console.log('📝 Creating profile...');
        const { error: createProfileError } = await adminClient
          .from('profiles')
          .insert({
            id: userId,
            bio: 'Interior design enthusiast who loves creating beautiful spaces',
            favorite_style: 'Modern Minimalist',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          });

        if (createProfileError) {
          console.error('Error creating profile:', createProfileError);
          return res.status(500).json({ error: 'Database error saving new profile' });
        }
        console.log('✅ Profile created successfully');
      }

    } catch (dbError) {
      console.error('Database operation error:', dbError);
      return res.status(500).json({ error: 'Database error during signup process' });
    }

    console.log(`✅ OAuth signup completed successfully for user: ${userId}`);
    return res.status(200).json({ 
      success: true, 
      message: 'OAuth signup completed successfully',
      userId: userId
    });

  } catch (err) {
    console.error('Unhandled error in oauth-signup-handler:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
