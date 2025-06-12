import Stripe from 'stripe';
import { Request, Response } from 'express';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-05-28.basil',
});

export default async function handler(
  req: Request,
  res: Response
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { priceId, userId } = req.body;

    if (!priceId) {
      return res.status(400).json({ error: 'Missing required priceId parameter' });
    }

    // Create customer
    const customer = await stripe.customers.create({
      email: req.body.email || 'customer@example.com', // Replace with real email
      metadata: {
        userId: userId || 'unknown',
      },
    });

    // Create subscription
    const subscription = await stripe.subscriptions.create({
      customer: customer.id,
      items: [{ price: priceId }],
      payment_behavior: 'default_incomplete',
      payment_settings: { save_default_payment_method: 'on_subscription' },
      expand: ['latest_invoice.payment_intent'],
    });

    const clientSecret = (subscription.latest_invoice as Stripe.Invoice & { payment_intent: Stripe.PaymentIntent })?.payment_intent?.client_secret;

    if (!clientSecret) {
      return res.status(500).json({ error: 'Failed to generate payment intent' });
    }

    res.status(200).json({
      clientSecret,
      subscriptionId: subscription.id,
      customerId: customer.id,
      status: subscription.status,
      currentPeriodEnd: (subscription as any).current_period_end,
    });
  } catch (error) {
    console.error('Error creating subscription:', error);
    res.status(500).json({ error: error.message || 'Failed to create subscription' });
  }
}
