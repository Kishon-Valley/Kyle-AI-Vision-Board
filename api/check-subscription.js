import { createClient } from '@supabase/supabase-js';
import Stripe from 'stripe';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { userId } = req.body;

    if (!userId) {
      return res.status(400).json({ error: 'Missing userId' });
    }

    console.log(`Checking subscription for user: ${userId}`);

    // Guard against missing backend credentials
    if (!process.env.VITE_SUPABASE_URL || !process.env.SUPABASE_SERVICE_KEY) {
      console.error('Supabase admin credentials are not configured.');
      return res.status(500).json({ error: 'Server mis-configuration' });
    }

    // Initialize Stripe
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: '2025-07-30.basil',
    });

    // Admin client (service role) – NEVER expose service key to the client bundle
    const adminClient = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    // Get user's subscription data
    const { data: userData, error: userError } = await adminClient
      .from('users')
      .select('subscription_id, subscription_status')
      .eq('id', userId)
      .single();

    console.log('User data from database:', userData);

    if (userError) {
      console.error('Error fetching user subscription:', userError);
      return res.status(500).json({ error: 'Failed to fetch user subscription' });
    }

    if (!userData?.subscription_id) {
      console.log('No subscription found for user');
      return res.status(200).json({ 
        hasSubscription: false, 
        subscriptionStatus: 'inactive',
        message: 'No subscription found'
      });
    }

    // Check subscription status in Stripe
    let stripeStatus = 'inactive';
    try {
      if (userData.subscription_id.startsWith('sub_')) {
        const subscription = await stripe.subscriptions.retrieve(userData.subscription_id);
        stripeStatus = subscription.status;
        console.log('Stripe subscription status:', stripeStatus);
      }
    } catch (stripeError) {
      console.error('Error fetching Stripe subscription:', stripeError);
      // If we can't fetch from Stripe, use the database status
      return res.status(200).json({ 
        hasSubscription: userData.subscription_status === 'active',
        subscriptionStatus: userData.subscription_status,
        message: 'Using database status'
      });
    }

    // Map Stripe status to our status
    let localStatus = 'inactive';
    switch (stripeStatus) {
      case 'active':
      case 'trialing':
        localStatus = 'active';
        break;
      case 'canceled':
      case 'unpaid':
      case 'past_due':
        localStatus = 'cancelled';
        break;
      default:
        localStatus = 'inactive';
    }

    console.log(`Status mapping: Stripe=${stripeStatus} -> Local=${localStatus}`);

    // Update local database if status differs
    if (localStatus !== userData.subscription_status) {
      console.log(`Updating subscription status: ${userData.subscription_status} -> ${localStatus}`);
      const { error: updateError } = await adminClient
        .from('users')
        .update({
          subscription_status: localStatus,
          updated_at: new Date().toISOString()
        })
        .eq('id', userId);

      if (updateError) {
        console.error('Error updating subscription status:', updateError);
      } else {
        console.log(`Subscription status synced for user: ${userId} (${userData.subscription_status} -> ${localStatus})`);
      }
    }

    const finalResult = {
      hasSubscription: localStatus === 'active',
      subscriptionStatus: localStatus,
      stripeStatus: stripeStatus,
      message: 'Subscription status checked and synced'
    };

    console.log('Final subscription check result:', finalResult);

    return res.status(200).json(finalResult);
  } catch (err) {
    console.error('Unhandled error in check-subscription route:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
