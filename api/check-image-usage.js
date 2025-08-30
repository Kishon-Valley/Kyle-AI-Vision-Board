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

    console.log(`Checking image usage for user: ${userId}`);

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

    // Get user's subscription and usage data
    const { data: userData, error: userError } = await adminClient
      .from('users')
      .select('subscription_tier, subscription_status, images_used_this_month, images_limit_per_month, last_reset_date')
      .eq('id', userId)
      .single();

    if (userError) {
      console.error('Error fetching user data:', userError);
      return res.status(500).json({ error: 'Failed to fetch user data' });
    }

    if (!userData) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Check if we need to reset monthly usage
    const currentDate = new Date();
    const lastResetDate = new Date(userData.last_reset_date);
    const isNewMonth = currentDate.getMonth() !== lastResetDate.getMonth() || 
                      currentDate.getFullYear() !== lastResetDate.getFullYear();

    let imagesUsed = userData.images_used_this_month;
    let imagesLimit = userData.images_limit_per_month;

    // Reset usage if it's a new month
    if (isNewMonth) {
      const { error: resetError } = await adminClient
        .from('users')
        .update({
          images_used_this_month: 0,
          last_reset_date: currentDate.toISOString().split('T')[0]
        })
        .eq('id', userId);

      if (resetError) {
        console.error('Error resetting monthly usage:', resetError);
      } else {
        imagesUsed = 0;
        console.log(`Reset monthly usage for user: ${userId}`);
      }
    }

    const remainingImages = Math.max(0, imagesLimit - imagesUsed);
    const canGenerateImage = userData.subscription_status === 'active' && remainingImages > 0;

    const result = {
      subscriptionTier: userData.subscription_tier,
      subscriptionStatus: userData.subscription_status,
      imagesUsed: imagesUsed,
      imagesLimit: imagesLimit,
      remainingImages: remainingImages,
      canGenerateImage: canGenerateImage,
      isNewMonth: isNewMonth
    };

    console.log('Image usage check result:', result);

    return res.status(200).json(result);
  } catch (err) {
    console.error('Unhandled error in check-image-usage route:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}



