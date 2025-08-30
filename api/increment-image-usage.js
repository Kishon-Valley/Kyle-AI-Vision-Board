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

    console.log(`Incrementing image usage for user: ${userId}`);

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

    // First, check current usage and limits
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

    // Check if user has an active subscription
    if (userData.subscription_status !== 'active') {
      return res.status(403).json({ 
        error: 'Subscription required',
        message: 'You need an active subscription to generate images'
      });
    }

    // Check if we need to reset monthly usage
    const currentDate = new Date();
    const lastResetDate = new Date(userData.last_reset_date);
    const isNewMonth = currentDate.getMonth() !== lastResetDate.getMonth() || 
                      currentDate.getFullYear() !== lastResetDate.getFullYear();

    let imagesUsed = userData.images_used_this_month;
    const imagesLimit = userData.images_limit_per_month;

    // Reset usage if it's a new month
    if (isNewMonth) {
      imagesUsed = 0;
    }

    // Check if user has remaining images
    if (imagesUsed >= imagesLimit) {
      return res.status(403).json({ 
        error: 'Image limit reached',
        message: `You've used all ${imagesLimit} images for this month. Upgrade your plan for more images.`,
        imagesUsed: imagesUsed,
        imagesLimit: imagesLimit,
        remainingImages: 0
      });
    }

    // Increment image usage
    const newImagesUsed = imagesUsed + 1;
    const { error: updateError } = await adminClient
      .from('users')
      .update({
        images_used_this_month: newImagesUsed,
        last_reset_date: currentDate.toISOString().split('T')[0],
        updated_at: new Date().toISOString()
      })
      .eq('id', userId);

    if (updateError) {
      console.error('Error updating image usage:', updateError);
      return res.status(500).json({ error: 'Failed to update image usage' });
    }

    const remainingImages = imagesLimit - newImagesUsed;

    const result = {
      success: true,
      imagesUsed: newImagesUsed,
      imagesLimit: imagesLimit,
      remainingImages: remainingImages,
      message: `Image usage updated. ${remainingImages} images remaining this month.`
    };

    console.log(`Image usage incremented for user ${userId}: ${imagesUsed} -> ${newImagesUsed}`);

    return res.status(200).json(result);
  } catch (err) {
    console.error('Unhandled error in increment-image-usage route:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}



