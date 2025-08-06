import Stripe from 'stripe';
import { env } from '@/lib/env';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

export async function POST(request: Request) {
  try {
    if (!env.stripe.secretKey) {
      return new Response(JSON.stringify({ error: 'Stripe secret key not configured' }), { status: 500 });
    }
    const stripe = new Stripe(env.stripe.secretKey, { apiVersion: '2025-07-30.basil' });
    const { billingInterval, userId } = await request.json();
    if (!billingInterval || !userId) {
      return new Response(JSON.stringify({ error: 'Missing required parameters', billingInterval, userId }), { status: 400 });
    }
    // Get the correct priceId from env
    const priceId = billingInterval === 'year' ? env.stripe.priceIds.yearly : env.stripe.priceIds.monthly;
    // Create a PaymentIntent with Stripe
    let paymentIntent;
    try {
      paymentIntent = await stripe.paymentIntents.create({
        amount: billingInterval === 'year' ? 1500 : 199, // Amount in cents (example)
        currency: 'usd',
        metadata: { user_id: userId, billing_interval: billingInterval },
        automatic_payment_methods: { enabled: true },
      });
    } catch (stripeError) {
      console.error('Stripe error:', stripeError);
      return new Response(JSON.stringify({ error: 'Stripe error', details: stripeError instanceof Error ? stripeError.message : stripeError }), { status: 500 });
    }
    return new Response(JSON.stringify({ clientSecret: paymentIntent.client_secret }), { status: 200 });
  } catch (err) {
    console.error('Error creating payment intent:', err);
    return new Response(JSON.stringify({ error: 'Internal server error', details: err instanceof Error ? err.message : err }), { status: 500 });
  }
}