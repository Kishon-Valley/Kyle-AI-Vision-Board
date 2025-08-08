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

    // Create a Checkout Session for better subscription handling
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      mode: 'subscription',
      success_url: `${process.env.VITE_APP_URL || 'https://www.moodboardgenerator.com'}/payment-success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.VITE_APP_URL || 'https://www.moodboardgenerator.com'}/pricing`,
      metadata: { 
        user_id: userId, 
        billing_interval: billingInterval 
      },
      subscription_data: {
        metadata: {
          user_id: userId,
          billing_interval: billingInterval
        }
      }
    });

    return res.status(200).json({ 
      sessionId: session.id,
      url: session.url 
    });
  } catch (err) {
    console.error('Error creating checkout session:', err);
    return res.status(500).json({ 
      error: 'Internal server error', 
      details: err.message 
    });
  }
} 