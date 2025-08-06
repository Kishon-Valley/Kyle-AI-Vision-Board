import Stripe from 'stripe';
import { env } from '@/lib/env';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

export async function POST(request: Request) {
  try {
    const { session_id } = await request.json();
    if (!session_id) {
      return new Response(JSON.stringify({ error: 'Missing session_id' }), { status: 400 });
    }
    if (!env.stripe.secretKey) {
      return new Response(JSON.stringify({ error: 'Stripe secret key not configured' }), { status: 500 });
    }
    const stripe = new Stripe(env.stripe.secretKey, { apiVersion: '2025-07-30.basil' });
    // Retrieve the session from Stripe
    const session = await stripe.checkout.sessions.retrieve(session_id, {
      expand: ['subscription', 'customer'],
    });
    if (!session || session.payment_status !== 'paid') {
      return new Response(JSON.stringify({ error: 'Payment not completed' }), { status: 400 });
    }
    // Optionally, update/check the user's subscription status in Supabase
    // (Assume metadata contains user_id)
    const userId = session.metadata?.user_id;
    if (userId) {
      await supabaseAdmin
        .from('profiles')
        .update({ subscription_status: 'active' })
        .eq('id', userId);
    }
    return new Response(JSON.stringify({ success: true }), { status: 200 });
  } catch (err) {
    console.error('Error verifying payment:', err);
    return new Response(JSON.stringify({ error: 'Internal server error' }), { status: 500 });
  }
}