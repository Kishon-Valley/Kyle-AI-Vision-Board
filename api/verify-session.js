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

    if (!session) {
      return res.status(400).json({ error: 'Invalid session' });
    }

    // Check if payment was successful
    if (session.payment_status !== 'paid') {
      return res.status(400).json({ error: 'Payment not completed' });
    }

    // Extract user ID from metadata
    const userId = session.metadata?.user_id;
    if (!userId) {
      return res.status(400).json({ error: 'No user ID found in session metadata' });
    }

    // Update user subscription status in database
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
      return res.status(500).json({ error: 'Failed to update subscription status' });
    }

    console.log(`Subscription activated for user: ${userId}`);

    return res.status(200).json({ 
      success: true, 
      session: {
        id: session.id,
        payment_status: session.payment_status,
        subscription_id: session.subscription
      },
      message: 'Session verified and subscription activated successfully' 
    });
  } catch (err) {
    console.error('Unhandled error in verify-session route:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
