import { VercelRequest, VercelResponse } from '@vercel/node';
import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';
import { createNamedLogger } from './logger';

// Initialize logger
const logger = createNamedLogger('stripe-webhook');

// Server-side secrets (do NOT prefix with VITE_*)
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string, {
  apiVersion: '2025-05-28.basil',
});

if (!process.env.STRIPE_WEBHOOK_SECRET) {
  logger.error('STRIPE_WEBHOOK_SECRET is not configured');
  throw new Error('Missing required Stripe webhook secret');
}

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET as string;

// Supabase service role key for server-to-server writes bypassing RLS
const supabase = createClient(
  process.env.SUPABASE_URL as string,
  process.env.SUPABASE_SERVICE_KEY as string,
);

if (!process.env.SUPABASE_SERVICE_KEY) {
  logger.error('SUPABASE_SERVICE_KEY is not configured');
  throw new Error('Missing required Supabase service key');
}

// Disables Vercel's default body parser so we can access the raw body for Stripe signature verification
export const config = {
  api: {
    bodyParser: false,
  },
};

const getRawBody = (req: VercelRequest): Promise<Buffer> => {
  return new Promise((resolve) => {
    const chunks: Buffer[] = [];
    req.on('data', (chunk) => chunks.push(Buffer.from(chunk)));
    req.on('end', () => resolve(Buffer.concat(chunks)));
  });
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    logger.warn('Non-POST request to webhook endpoint');
    res.setHeader('Allow', 'POST');
    return res.status(405).end('Method Not Allowed');
  }

  let event: Stripe.Event;
  try {
    const rawBody = await getRawBody(req);
    const signature = req.headers['stripe-signature'] as string;

    if (!signature) {
      logger.error('Missing Stripe signature header');
      return res.status(400).send('Missing Stripe signature');
    }

    event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
    logger.info('Received webhook event', { type: event.type, id: event.id });
  } catch (err) {
    logger.error('Webhook signature verification failed', { error: err });
    return res.status(400).send(`Webhook Error: ${(err as Error).message}`);
  }

  try {
    switch (event.type) {
      case 'customer.subscription.created':
      case 'customer.subscription.updated':
      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription;
        const customerId = typeof subscription.customer === 'string' 
          ? subscription.customer 
          : subscription.customer.id;

        // Fetch customer to get userId metadata
        const customer = await stripe.customers.retrieve(customerId) as Stripe.Customer;
        const userId = customer.metadata?.userId;

        if (!userId) {
          logger.error('No userId found in customer metadata', { customerId });
          return res.status(400).send('Missing user ID in customer metadata');
        }

        const payload = {
          user_id: userId,
          stripe_subscription_id: subscription.id,
          stripe_customer_id: customerId,
          status: subscription.status,
          current_period_end: new Date((subscription as any).current_period_end * 1000).toISOString(),
          cancel_at: (subscription as any).cancel_at ? new Date((subscription as any).cancel_at * 1000).toISOString() : null,
          cancel_at_period_end: (subscription as any).cancel_at_period_end,
          trial_end: (subscription as any).trial_end ? new Date((subscription as any).trial_end * 1000).toISOString() : null,
          created_at: new Date(subscription.created * 1000).toISOString(),
          updated_at: new Date().toISOString(),
          metadata: subscription.metadata
        };

        logger.info('Updating subscription in database', { subscriptionId: subscription.id });
        
        const { error: dbError } = await supabase
          .from('subscriptions')
          .upsert(payload, {
            onConflict: 'user_id'
          });

        if (dbError) {
          logger.error('Failed to update subscription in DB', { error: dbError });
          throw dbError;
        }

        break;
      }
      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice & { subscription: string | { id: string } };
        const subscriptionId = typeof invoice.subscription === 'string' 
          ? invoice.subscription 
          : invoice.subscription.id;

        logger.info('Handling payment failed', { subscriptionId });

        const { error: dbError } = await supabase
          .from('subscriptions')
          .update({ 
            status: 'past_due',
            updated_at: new Date().toISOString()
          })
          .eq('stripe_subscription_id', subscriptionId);

        if (dbError) {
          logger.error('Failed to update subscription status', { error: dbError });
          throw dbError;
        }

        break;
      }
      case 'invoice.payment_succeeded': {
        const invoice = event.data.object as Stripe.Invoice & { subscription: string | { id: string } };
        const subscriptionId = typeof invoice.subscription === 'string' 
          ? invoice.subscription 
          : invoice.subscription.id;

        logger.info('Handling payment succeeded', { subscriptionId });

        const { error: dbError } = await supabase
          .from('subscriptions')
          .update({ 
            status: 'active',
            updated_at: new Date().toISOString()
          })
          .eq('stripe_subscription_id', subscriptionId);

        if (dbError) {
          logger.error('Failed to update subscription status', { error: dbError });
          throw dbError;
        }

        break;
      }
      default:
        logger.info('Ignored webhook event', { type: event.type });
        break;
    }

    logger.info('Webhook processed successfully', { eventId: event.id });
    res.json({ received: true });
  } catch (err) {
    logger.error('Webhook handler failed', { error: err });
    res.status(500).send('Webhook handler failure');
  }
}
