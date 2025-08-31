import { createClient } from '@supabase/supabase-js';
import Stripe from 'stripe';

/**
 * Centralized status mapping function
 * Maps Stripe subscription statuses to our local database statuses
 * 
 * Stripe Statuses -> Local Statuses:
 * - 'active', 'trialing' -> 'active'
 * - 'canceled', 'unpaid', 'past_due', 'incomplete_expired' -> 'cancelled'
 * - 'incomplete' -> 'inactive'
 * - All others -> 'inactive'
 * 
 * Note: Stripe uses 'canceled' (American spelling) while we use 'cancelled' (British spelling)
 */
const mapStripeStatusToLocal = (stripeStatus) => {
  switch (stripeStatus) {
    case 'active':
    case 'trialing':
      return 'active';
    case 'canceled':
    case 'unpaid':
    case 'past_due':
    case 'incomplete_expired':
      return 'cancelled';
    case 'incomplete':
      return 'inactive';
    default:
      return 'inactive';
  }
};

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
    let cleanSubscriptionId = userData.subscription_id;
    
    // Handle case where subscription_id might be a JSON string instead of just the ID
    try {
      if (userData.subscription_id.startsWith('{')) {
        const parsedSubscription = JSON.parse(userData.subscription_id);
        cleanSubscriptionId = parsedSubscription.id;
        console.log('Extracted subscription ID from JSON:', cleanSubscriptionId);
      }
    } catch (parseError) {
      console.log('subscription_id is not JSON, using as-is:', userData.subscription_id);
    }
    
    try {
      if (cleanSubscriptionId && cleanSubscriptionId.startsWith('sub_')) {
        const subscription = await stripe.subscriptions.retrieve(cleanSubscriptionId);
        stripeStatus = subscription.status;
        console.log('Stripe subscription status:', stripeStatus);
        
        // If we successfully got the status and it's different from what's stored,
        // update the database with the clean subscription ID
        if (cleanSubscriptionId !== userData.subscription_id) {
          console.log('Updating database with clean subscription ID');
          const { error: updateError } = await adminClient
            .from('users')
            .update({
              subscription_id: cleanSubscriptionId,
              updated_at: new Date().toISOString()
            })
            .eq('id', userId);
          
          if (updateError) {
            console.error('Error updating subscription ID:', updateError);
          } else {
            console.log('Database updated with clean subscription ID');
          }
        }
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

    const localStatus = mapStripeStatusToLocal(stripeStatus);

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
      message: 'Subscription status checked and synced',
      debug: {
        originalSubscriptionId: userData.subscription_id,
        cleanSubscriptionId: cleanSubscriptionId,
        isJson: userData.subscription_id.startsWith('{'),
        wasFixed: cleanSubscriptionId !== userData.subscription_id
      }
    };

    console.log('Final subscription check result:', finalResult);

    return res.status(200).json(finalResult);
  } catch (err) {
    console.error('Unhandled error in check-subscription route:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
