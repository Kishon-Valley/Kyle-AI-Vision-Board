import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { sessionId } = req.body;

    if (!sessionId) {
      return res.status(400).json({ error: 'Missing sessionId' });
    }

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

    // Retrieve the checkout session from Stripe
    const session = await stripe.checkout.sessions.retrieve(sessionId, {
      expand: ['subscription', 'customer'],
    });

    console.log('Retrieved session:', {
      id: session.id,
      payment_status: session.payment_status,
      subscription: session.subscription,
      metadata: session.metadata
    });

    if (!session) {
      return res.status(400).json({ error: 'Invalid session' });
    }

    // Check if payment was successful
    if (session.payment_status !== 'paid') {
      console.log('Payment not completed. Status:', session.payment_status);
      return res.status(400).json({ error: 'Payment not completed' });
    }

    // Extract user ID from metadata
    const userId = session.metadata?.user_id;
    if (!userId) {
      console.error('No user ID found in session metadata');
      return res.status(400).json({ error: 'No user ID found in session metadata' });
    }

    console.log(`Verifying session for user: ${userId}`);

    // Get the subscription ID - handle both string and object cases
    let subscriptionId;
    let stripeStatus = 'active';
    
    if (typeof session.subscription === 'string') {
      subscriptionId = session.subscription;
    } else if (session.subscription && typeof session.subscription === 'object') {
      subscriptionId = session.subscription.id;
      stripeStatus = session.subscription.status;
    } else {
      subscriptionId = session.id;
    }
    
    console.log('Extracted subscription ID:', subscriptionId);
    console.log('Initial Stripe status:', stripeStatus);
    
    // Verify subscription status in Stripe if it's a subscription
    if (subscriptionId && subscriptionId.startsWith('sub_')) {
      try {
        const subscription = await stripe.subscriptions.retrieve(subscriptionId);
        stripeStatus = subscription.status;
        console.log('Verified Stripe subscription status:', stripeStatus);
        
        // If subscription is not active, return error
        if (stripeStatus !== 'active' && stripeStatus !== 'trialing') {
          console.error('Subscription is not active in Stripe:', stripeStatus);
          return res.status(400).json({ error: 'Subscription is not active' });
        }
      } catch (stripeError) {
        console.error('Error fetching subscription from Stripe:', stripeError);
        return res.status(500).json({ error: 'Failed to verify subscription with Stripe' });
      }
    }

    // Ensure we only store the subscription ID string
    console.log('Storing subscription ID in database:', subscriptionId);
    
    // Update user subscription status in database
    const { data: updateData, error: updateError } = await adminClient
      .from('users')
      .upsert({
        id: userId,
        subscription_id: subscriptionId,
        subscription_status: 'active',
        updated_at: new Date().toISOString()
      })
      .select();

    if (updateError) {
      console.error('Error updating user subscription:', updateError);
      return res.status(500).json({ error: 'Failed to update subscription status' });
    }

    console.log(`Subscription activated for user: ${userId}`);
    console.log('Updated user data:', updateData);

    return res.status(200).json({ 
      success: true, 
      session: {
        id: session.id,
        payment_status: session.payment_status,
        subscription_id: subscriptionId,
        stripe_status: stripeStatus
      },
      user: updateData?.[0],
      message: 'Session verified and subscription activated successfully' 
    });
  } catch (err) {
    console.error('Unhandled error in verify-session route:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
