import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

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
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: '2025-07-30.basil',
    });

    const signature = req.headers['stripe-signature'];
    if (!signature) {
      console.error('Missing Stripe signature in webhook');
      return res.status(400).json({ error: 'Missing Stripe signature' });
    }

    const body = req.body;
    let event;

    try {
      event = stripe.webhooks.constructEvent(
        body,
        signature,
        process.env.STRIPE_WEBHOOK_SECRET
      );
    } catch (err) {
      console.error('Webhook signature verification failed:', err);
      return res.status(400).json({ error: 'Webhook signature verification failed' });
    }

    console.log(`Processing webhook event: ${event.type}`);

    // Initialize Supabase admin client
    const adminClient = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    // Handle event types
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object;
        console.log('Payment completed for session:', session.id);
        console.log('Session metadata:', session.metadata);
        console.log('Session subscription:', session.subscription);
        
        // Extract user ID from metadata
        const userId = session.metadata?.user_id;
        if (!userId) {
          console.error('No user ID found in session metadata');
          return res.status(400).json({ error: 'No user ID found in session metadata' });
        }

        console.log(`Processing subscription activation for user: ${userId}`);
        
        try {
          // Ensure we only store the subscription ID, not the full object
          const subscriptionId = session.subscription || session.id;
          console.log('Storing subscription ID:', subscriptionId);
          
          // Determine tier and image limits based on billing interval
          const billingInterval = session.metadata?.billing_interval;
          let subscriptionTier = 'basic';
          let imagesLimitPerMonth = 3;
          
          switch (billingInterval) {
            case 'basic':
              subscriptionTier = 'basic';
              imagesLimitPerMonth = 3;
              break;
            case 'pro':
              subscriptionTier = 'pro';
              imagesLimitPerMonth = 50;
              break;
            case 'yearly':
              subscriptionTier = 'yearly';
              imagesLimitPerMonth = 50;
              break;
            default:
              // Fallback to basic if billing interval is not specified
              subscriptionTier = 'basic';
              imagesLimitPerMonth = 3;
          }
          
          // Update user subscription status to active with tier information
          const { data: updateData, error: updateError } = await adminClient
            .from('users')
            .upsert({
              id: userId,
              subscription_id: subscriptionId,
              subscription_status: 'active',
              subscription_tier: subscriptionTier,
              images_limit_per_month: imagesLimitPerMonth,
              images_used_this_month: 0,
              last_reset_date: new Date().toISOString().split('T')[0],
              updated_at: new Date().toISOString()
            })
            .select();

          if (updateError) {
            console.error('Error updating user subscription:', updateError);
            return res.status(500).json({ error: 'Failed to update subscription status' });
          } else {
            console.log(`Subscription activated for user: ${userId}`);
            console.log('Updated user data:', updateData);
          }
        } catch (dbError) {
          console.error('Database error during subscription activation:', dbError);
          return res.status(500).json({ error: 'Database error during subscription activation' });
        }
        break;
      }
      
      case 'customer.subscription.updated': {
        const subscription = event.data.object;
        console.log('Subscription updated:', subscription.id);
        console.log('Subscription status:', subscription.status);
        
        try {
          // Find user by subscription ID
          const { data: userData, error: userError } = await adminClient
            .from('users')
            .select('id, subscription_status')
            .eq('subscription_id', subscription.id)
            .single();

          if (userError) {
            console.error('Error finding user by subscription ID:', userError);
            return res.status(500).json({ error: 'Failed to find user for subscription update' });
          }

          if (!userData) {
            console.error('No user found for subscription ID:', subscription.id);
            return res.status(404).json({ error: 'No user found for subscription' });
          }

          const status = mapStripeStatusToLocal(subscription.status);

          console.log(`Updating subscription status for user ${userData.id}: ${userData.subscription_status} -> ${status}`);

          // Update user subscription status
          const { error: updateError } = await adminClient
            .from('users')
            .update({
              subscription_status: status,
              updated_at: new Date().toISOString()
            })
            .eq('id', userData.id);

          if (updateError) {
            console.error('Error updating subscription status:', updateError);
            return res.status(500).json({ error: 'Failed to update subscription status' });
          } else {
            console.log(`Subscription status updated to ${status} for user: ${userData.id}`);
          }
        } catch (error) {
          console.error('Error processing subscription update:', error);
          return res.status(500).json({ error: 'Error processing subscription update' });
        }
        break;
      }
      
      case 'customer.subscription.deleted': {
        const subscription = event.data.object;
        console.log('Subscription deleted:', subscription.id);
        
        try {
          // Find user by subscription ID and mark as cancelled
          const { data: userData, error: userError } = await adminClient
            .from('users')
            .select('id')
            .eq('subscription_id', subscription.id)
            .single();

          if (userError) {
            console.error('Error finding user for subscription deletion:', userError);
            return res.status(500).json({ error: 'Failed to find user for subscription deletion' });
          }

          if (!userData) {
            console.error('No user found for deleted subscription ID:', subscription.id);
            return res.status(404).json({ error: 'No user found for deleted subscription' });
          }

          const { error: updateError } = await adminClient
            .from('users')
            .update({
              subscription_status: 'cancelled',
              updated_at: new Date().toISOString()
            })
            .eq('id', userData.id);

          if (updateError) {
            console.error('Error updating subscription status for deletion:', updateError);
            return res.status(500).json({ error: 'Failed to update subscription status for deletion' });
          } else {
            console.log(`Subscription cancelled for user: ${userData.id}`);
          }
        } catch (error) {
          console.error('Error processing subscription deletion:', error);
          return res.status(500).json({ error: 'Error processing subscription deletion' });
        }
        break;
      }
      
      case 'invoice.payment_failed': {
        const invoice = event.data.object;
        console.log('Payment failed for invoice:', invoice.id);
        
        try {
          // Find user by subscription ID
          const { data: userData, error: userError } = await adminClient
            .from('users')
            .select('id')
            .eq('subscription_id', invoice.subscription)
            .single();

          if (userError) {
            console.error('Error finding user for payment failure:', userError);
            return res.status(500).json({ error: 'Failed to find user for payment failure' });
          }

          if (!userData) {
            console.error('No user found for failed payment subscription:', invoice.subscription);
            return res.status(404).json({ error: 'No user found for failed payment' });
          }

          const { error: updateError } = await adminClient
            .from('users')
            .update({
              subscription_status: 'cancelled',
              updated_at: new Date().toISOString()
            })
            .eq('id', userData.id);

          if (updateError) {
            console.error('Error updating subscription status for payment failure:', updateError);
            return res.status(500).json({ error: 'Failed to update subscription status for payment failure' });
          } else {
            console.log(`Subscription cancelled due to payment failure for user: ${userData.id}`);
          }
        } catch (error) {
          console.error('Error processing payment failure:', error);
          return res.status(500).json({ error: 'Error processing payment failure' });
        }
        break;
      }
      
      case 'invoice.payment_succeeded': {
        const invoice = event.data.object;
        console.log('Payment succeeded for invoice:', invoice.id);
        
        try {
          // Find user by subscription ID
          const { data: userData, error: userError } = await adminClient
            .from('users')
            .select('id')
            .eq('subscription_id', invoice.subscription)
            .single();

          if (userError) {
            console.error('Error finding user for payment success:', userError);
            return res.status(500).json({ error: 'Failed to find user for payment success' });
          }

          if (!userData) {
            console.error('No user found for successful payment subscription:', invoice.subscription);
            return res.status(404).json({ error: 'No user found for successful payment' });
          }

          const { error: updateError } = await adminClient
            .from('users')
            .update({
              subscription_status: 'active',
              updated_at: new Date().toISOString()
            })
            .eq('id', userData.id);

          if (updateError) {
            console.error('Error updating subscription status for payment success:', updateError);
            return res.status(500).json({ error: 'Failed to update subscription status for payment success' });
          } else {
            console.log(`Subscription reactivated for user: ${userData.id}`);
          }
        } catch (error) {
          console.error('Error processing payment success:', error);
          return res.status(500).json({ error: 'Error processing payment success' });
        }
        break;
      }
      
      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    return res.status(200).json({ received: true });
  } catch (error) {
    console.error('Error handling webhook:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
} 