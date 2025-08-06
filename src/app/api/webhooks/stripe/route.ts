


import Stripe from 'stripe';
import { env } from '@/lib/env';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

export async function POST(request: Request) {
  try {
    if (!env.stripe.secretKey || !env.stripe.webhookSecret) {
      return new Response(JSON.stringify({ error: 'Stripe keys not configured' }), { status: 500 });
    }
    const stripe = new Stripe(env.stripe.secretKey, { apiVersion: '2025-07-30.basil' });
    const signature = request.headers.get('stripe-signature');
    if (!signature) {
      return new Response(JSON.stringify({ error: 'Missing Stripe signature' }), { status: 400 });
    }
    const body = await request.text();
    let event: Stripe.Event;
    try {
      event = stripe.webhooks.constructEvent(body, signature, env.stripe.webhookSecret);
    } catch (err) {
      console.error('Webhook signature verification failed:', err);
      return new Response(JSON.stringify({ error: 'Webhook signature verification failed' }), { status: 400 });
    }
    // Handle event types
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        const userId = session.metadata?.user_id;
        if (userId) {
          await supabaseAdmin
            .from('profiles')
            .update({ subscription_status: 'active' })
            .eq('id', userId);
        }
        break;
      }
      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription;
        const userId = subscription.metadata?.user_id;
        if (userId) {
          await supabaseAdmin
            .from('profiles')
            .update({ subscription_status: subscription.status })
            .eq('id', userId);
        }
        break;
      }
      // Add more event handlers as needed
    }
    return new Response(JSON.stringify({ received: true }), { status: 200 });
  } catch (error) {
    console.error('Error handling webhook:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), { status: 500 });
  }
}
