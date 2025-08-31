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
    // Guard against missing backend credentials
    if (!process.env.VITE_SUPABASE_URL || !process.env.SUPABASE_SERVICE_KEY) {
      console.error('Supabase admin credentials are not configured.');
      return res.status(500).json({ error: 'Server mis-configuration' });
    }

    // Initialize Stripe
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: '2025-07-30.basil',
    });

    // Admin client (service role)
    const adminClient = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    // Get all users with subscription_id but inactive status
    const { data: users, error: fetchError } = await adminClient
      .from('users')
      .select('id, email, subscription_id, subscription_status')
      .not('subscription_id', 'is', null)
      .eq('subscription_status', 'inactive');

    if (fetchError) {
      console.error('Error fetching users:', fetchError);
      return res.status(500).json({ error: 'Failed to fetch users' });
    }

    console.log(`Found ${users.length} users with subscription_id but inactive status`);

    const results = {
      processed: 0,
      updated: 0,
      errors: [],
      details: []
    };

    for (const user of users) {
      try {
        console.log(`Processing user: ${user.id} with subscription: ${user.subscription_id}`);
        
        // Check subscription status in Stripe
        let stripeStatus = 'inactive';
        if (user.subscription_id.startsWith('sub_')) {
          try {
            const subscription = await stripe.subscriptions.retrieve(user.subscription_id);
            stripeStatus = subscription.status;
            console.log(`Stripe status for ${user.id}: ${stripeStatus}`);
          } catch (stripeError) {
            console.error(`Error fetching Stripe subscription for ${user.id}:`, stripeError);
            results.errors.push({
              userId: user.id,
              error: 'Failed to fetch Stripe subscription',
              details: stripeError.message
            });
            continue;
          }
        }

        const correctStatus = mapStripeStatusToLocal(stripeStatus);

        // Update user status if different
        if (correctStatus !== user.subscription_status) {
          const { error: updateError } = await adminClient
            .from('users')
            .update({
              subscription_status: correctStatus,
              updated_at: new Date().toISOString()
            })
            .eq('id', user.id);

          if (updateError) {
            console.error(`Error updating user ${user.id}:`, updateError);
            results.errors.push({
              userId: user.id,
              error: 'Failed to update database',
              details: updateError.message
            });
          } else {
            console.log(`Updated user ${user.id}: ${user.subscription_status} -> ${correctStatus}`);
            results.updated++;
            results.details.push({
              userId: user.id,
              email: user.email,
              oldStatus: user.subscription_status,
              newStatus: correctStatus,
              stripeStatus: stripeStatus
            });
          }
        } else {
          console.log(`User ${user.id} already has correct status: ${correctStatus}`);
          results.details.push({
            userId: user.id,
            email: user.email,
            status: correctStatus,
            stripeStatus: stripeStatus,
            note: 'Status already correct'
          });
        }

        results.processed++;
      } catch (error) {
        console.error(`Error processing user ${user.id}:`, error);
        results.errors.push({
          userId: user.id,
          error: 'Processing error',
          details: error.message
        });
      }
    }

    console.log('Fix subscription status completed:', results);

    return res.status(200).json({
      success: true,
      message: `Processed ${results.processed} users, updated ${results.updated}`,
      results: results
    });

  } catch (err) {
    console.error('Unhandled error in fix-subscription-status:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
