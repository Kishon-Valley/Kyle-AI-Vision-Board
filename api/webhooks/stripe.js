import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

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
        
        // Extract user ID from metadata
        const userId = session.metadata?.user_id;
        if (userId) {
          // Update user subscription status to active
          const { error: updateError } = await adminClient
            .from('users')
            .upsert({
              id: userId,
              subscription_id: session.subscription || session.id,
              subscription_status: 'active',
              updated_at: new Date().toISOString()
            });

          if (updateError) {
            console.error('Error updating user subscription:', updateError);
          } else {
            console.log(`Subscription activated for user: ${userId}`);
          }
        }
        break;
      }
      
      case 'customer.subscription.updated': {
        const subscription = event.data.object;
        console.log('Subscription updated:', subscription.id);
        
        // Find user by subscription ID
        const { data: userData, error: userError } = await adminClient
          .from('users')
          .select('id')
          .eq('subscription_id', subscription.id)
          .single();

        if (!userError && userData) {
          let status = 'inactive';
          
          // Map Stripe subscription status to our status
          switch (subscription.status) {
            case 'active':
            case 'trialing':
              status = 'active';
              break;
            case 'canceled':
            case 'unpaid':
            case 'past_due':
              status = 'cancelled';
              break;
            default:
              status = 'inactive';
          }

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
          } else {
            console.log(`Subscription status updated to ${status} for user: ${userData.id}`);
          }
        }
        break;
      }
      
      case 'customer.subscription.deleted': {
        const subscription = event.data.object;
        console.log('Subscription deleted:', subscription.id);
        
        // Find user by subscription ID and mark as cancelled
        const { data: userData, error: userError } = await adminClient
          .from('users')
          .select('id')
          .eq('subscription_id', subscription.id)
          .single();

        if (!userError && userData) {
          const { error: updateError } = await adminClient
            .from('users')
            .update({
              subscription_status: 'cancelled',
              updated_at: new Date().toISOString()
            })
            .eq('id', userData.id);

          if (updateError) {
            console.error('Error updating subscription status:', updateError);
          } else {
            console.log(`Subscription cancelled for user: ${userData.id}`);
          }
        }
        break;
      }
      
      case 'invoice.payment_failed': {
        const invoice = event.data.object;
        console.log('Payment failed for invoice:', invoice.id);
        
        // Find user by subscription ID
        const { data: userData, error: userError } = await adminClient
          .from('users')
          .select('id')
          .eq('subscription_id', invoice.subscription)
          .single();

        if (!userError && userData) {
          const { error: updateError } = await adminClient
            .from('users')
            .update({
              subscription_status: 'cancelled',
              updated_at: new Date().toISOString()
            })
            .eq('id', userData.id);

          if (updateError) {
            console.error('Error updating subscription status:', updateError);
          } else {
            console.log(`Subscription cancelled due to payment failure for user: ${userData.id}`);
          }
        }
        break;
      }
      
      case 'invoice.payment_succeeded': {
        const invoice = event.data.object;
        console.log('Payment succeeded for invoice:', invoice.id);
        
        // Find user by subscription ID
        const { data: userData, error: userError } = await adminClient
          .from('users')
          .select('id')
          .eq('subscription_id', invoice.subscription)
          .single();

        if (!userError && userData) {
          const { error: updateError } = await adminClient
            .from('users')
            .update({
              subscription_status: 'active',
              updated_at: new Date().toISOString()
            })
            .eq('id', userData.id);

          if (updateError) {
            console.error('Error updating subscription status:', updateError);
          } else {
            console.log(`Subscription reactivated for user: ${userData.id}`);
          }
        }
        break;
      }
    }

    return res.status(200).json({ received: true });
  } catch (error) {
    console.error('Error handling webhook:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
} 