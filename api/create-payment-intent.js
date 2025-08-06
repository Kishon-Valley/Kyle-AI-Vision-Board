import Stripe from 'stripe';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { billingInterval, userId } = req.body;
    
    if (!billingInterval || !userId) {
      return res.status(400).json({ 
        error: 'Missing required parameters', 
        billingInterval, 
        userId 
      });
    }

    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: '2025-07-30.basil',
    });

    // Get the correct priceId from env
    const priceId = billingInterval === 'year' 
      ? process.env.VITE_STRIPE_PRICE_ID_YEARLY 
      : process.env.VITE_STRIPE_PRICE_ID_MONTHLY;

    // Create a PaymentIntent with Stripe
    const paymentIntent = await stripe.paymentIntents.create({
      amount: billingInterval === 'year' ? 1500 : 199, // Amount in cents
      currency: 'usd',
      metadata: { user_id: userId, billing_interval: billingInterval },
      automatic_payment_methods: { enabled: true },
    });

    return res.status(200).json({ clientSecret: paymentIntent.client_secret });
  } catch (err) {
    console.error('Error creating payment intent:', err);
    return res.status(500).json({ 
      error: 'Internal server error', 
      details: err.message 
    });
  }
} 