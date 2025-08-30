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

    // Get the correct priceId from env based on the new tier system
    let priceId;
    switch (billingInterval) {
      case 'basic':
        priceId = process.env.VITE_STRIPE_PRICE_ID_BASIC;
        break;
      case 'pro':
        priceId = process.env.VITE_STRIPE_PRICE_ID_PRO;
        break;
      case 'yearly':
        priceId = process.env.VITE_STRIPE_PRICE_ID_YEARLY;
        break;
      default:
        return res.status(400).json({ error: 'Invalid billing interval' });
    }

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