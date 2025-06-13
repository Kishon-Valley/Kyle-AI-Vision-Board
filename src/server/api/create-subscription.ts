import Stripe from 'stripe';
import { supabaseAdmin } from '../../lib/supabaseAdmin';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-06-20',
  typescript: true,
});

// Helper function to create a new Stripe customer and update Supabase
async function createAndLinkStripeCustomer(userId: string, email: string): Promise<Stripe.Customer> {
  const customer = await stripe.customers.create({
    email,
    metadata: { userId },
  });

  const { error } = await supabaseAdmin
    .from('users')
    .update({ stripe_customer_id: customer.id })
    .eq('id', userId);

  if (error) {
    console.error(`Failed to link new Stripe customer ${customer.id} to user ${userId}`, error);
    throw new Error('Failed to update user with new Stripe customer ID.');
  }

  return customer;
}

async function getOrCreateStripeCustomer(userId: string, email: string): Promise<Stripe.Customer> {
  const { data, error } = await supabaseAdmin
    .from('users')
    .select('stripe_customer_id')
    .eq('id', userId)
    .single();

  if (error && error.code !== 'PGRST116') { // PGRST116 means no row was found, which is fine.
    console.error('Supabase error fetching user:', error.message);
    throw new Error('Failed to query user from database.');
  }

  // If user has a stripe_customer_id, try to retrieve it from Stripe
  if (data?.stripe_customer_id) {
    try {
      const customer = await stripe.customers.retrieve(data.stripe_customer_id);
      // Check if the customer was deleted in Stripe
      if ((customer as Stripe.DeletedCustomer).deleted) {
        console.log(`Stripe customer ${data.stripe_customer_id} was deleted. Creating a new one.`);
        return await createAndLinkStripeCustomer(userId, email);
      }
      return customer as Stripe.Customer;
    } catch (stripeError) {
      // This can happen if the ID is invalid or doesn't exist in Stripe anymore.
      console.warn(`Could not retrieve Stripe customer ${data.stripe_customer_id}. Creating a new one.`, stripeError);
      return await createAndLinkStripeCustomer(userId, email);
    }
  }

  // If no stripe_customer_id exists, create a new one
  return await createAndLinkStripeCustomer(userId, email);
}

export async function POST(request: Request): Promise<Response> {
  try {
    const { priceId, userId, email } = await request.json();

    if (!priceId || !userId || !email) {
      return new Response(JSON.stringify({ error: 'Missing required parameters: priceId, userId, email' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const customer = await getOrCreateStripeCustomer(userId, email);

    const subscription = await stripe.subscriptions.create({
      customer: customer.id,
      items: [{ price: priceId }],
      payment_behavior: 'default_incomplete',
      payment_settings: { save_default_payment_method: 'on_subscription' },
      expand: ['latest_invoice.payment_intent'],
    });

    const invoice = subscription.latest_invoice as Stripe.Invoice;
    const paymentIntent = invoice.payment_intent as Stripe.PaymentIntent;
    const clientSecret = paymentIntent?.client_secret;
    
    if (!clientSecret) {
        throw new Error('Could not extract client_secret from subscription.');
    }

    return new Response(JSON.stringify({ clientSecret, subscriptionId: subscription.id }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('[API/create-subscription] Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    return new Response(JSON.stringify({ error: 'Internal Server Error', details: errorMessage }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
