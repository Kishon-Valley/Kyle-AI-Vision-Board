import Stripe from 'stripe';
import { Request, Response } from 'express';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-05-28.basil',
  typescript: true,
});

export async function POST(req: Request, res: Response) {
  try {
    const { priceId, billingInterval } = req.body;

    // Create a customer
    const customer = await stripe.customers.create({
      payment_method: 'pm_card_visa', // In production, you'll get this from the client
      email: 'customer@example.com', // In production, get this from your auth system
      invoice_settings: {
        default_payment_method: 'pm_card_visa',
      },
    });

    // Create a subscription
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
