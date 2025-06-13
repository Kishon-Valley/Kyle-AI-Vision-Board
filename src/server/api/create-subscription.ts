import Stripe from 'stripe';
import { Request, Response } from 'express';
import { supabaseAdmin } from '../../lib/supabaseAdmin';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-06-20',
  typescript: true,
});

async function getOrCreateStripeCustomer(userId: string, email: string): Promise<Stripe.Customer> {
  // Check if the user already has a Stripe customer ID in your database
  const { data, error } = await supabaseAdmin
    .from('users')
    .select('stripe_customer_id')
    .eq('id', userId)
    .single();

  if (error && error.code !== 'PGRST116') { // PGRST116: row not found
    throw new Error('Failed to query user from database');
  }

  if (data?.stripe_customer_id) {
    return await stripe.customers.retrieve(data.stripe_customer_id) as Stripe.Customer;
  }

  // Create a new Stripe customer
  const customer = await stripe.customers.create({
    email,
    metadata: { userId },
  });

  // Save the new customer ID to your database
  await supabaseAdmin
    .from('users')
    .update({ stripe_customer_id: customer.id })
    .eq('id', userId);

  return customer;
}

export async function POST(req: Request, res: Response) {
  try {
    const { priceId, userId, email } = req.body;

    if (!userId || !email) {
      return res.status(400).json({ error: 'User ID and email are required' });
    }

    const customer = await getOrCreateStripeCustomer(userId, email);

    const subscription = await stripe.subscriptions.create({
      customer: customer.id,
      items: [{ price: priceId }],
      payment_behavior: 'default_incomplete',
      payment_settings: { save_default_payment_method: 'on_subscription' },
      expand: ['latest_invoice.payment_intent'],
    });

    const clientSecret = (
      subscription.latest_invoice as Stripe.Invoice & { payment_intent: Stripe.PaymentIntent }
    ).payment_intent?.client_secret;

    if (!clientSecret) {
      throw new Error('Failed to create subscription');
    }

    return res.json({
      clientSecret,
      subscriptionId: subscription.id,
    });
  } catch (error) {
    console.error('Error creating subscription:', error);
    return res.status(500).json({ error: 'Failed to create subscription' });
  }
}
