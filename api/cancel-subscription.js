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

    // Get user's subscription status
    const { data: userData, error: userError } = await adminClient
      .from('users')
      .select('subscription_id, subscription_status')
      .eq('id', userId)
      .single();

    if (userError) {
      console.error('Error fetching user subscription:', userError);
      return res.status(500).json({ error: 'Failed to fetch user subscription' });
    }

    // If user has an active subscription, cancel it
    if (userData?.subscription_id && userData?.subscription_status === 'active') {
      try {
        // Update subscription status to cancelled
        const { error: updateError } = await adminClient
          .from('users')
          .update({ 
            subscription_status: 'cancelled',
            updated_at: new Date().toISOString()
          })
          .eq('id', userId);

        if (updateError) {
          console.error('Error updating subscription status:', updateError);
          return res.status(500).json({ error: 'Failed to cancel subscription' });
        }

        console.log(`Subscription cancelled for user: ${userId}`);
      } catch (subscriptionError) {
        console.error('Error cancelling subscription:', subscriptionError);
        // Don't fail the entire deletion process if subscription cancellation fails
        // Just log the error and continue
      }
    }

    return res.status(200).json({ success: true, message: 'Subscription cancelled successfully' });
  } catch (err) {
    console.error('Unhandled error in cancel-subscription route:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
