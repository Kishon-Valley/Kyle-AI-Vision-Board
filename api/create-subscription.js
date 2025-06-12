const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2025-06-15' // Latest stable version
});

// Rate limiting middleware
const rateLimit = require('express-rate-limit');
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests per windowMs
});

// Vercel serverless function handler
export default async function handler(req, res) {
  // Apply rate limiting middleware
  limiter(req, res, async () => {
    // Set CORS headers with proper security
    const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(',') || ['*'];
    const origin = req.headers.origin;

    if (allowedOrigins.includes('*') || allowedOrigins.includes(origin)) {
      res.setHeader('Access-Control-Allow-Origin', origin);
      res.setHeader('Access-Control-Allow-Credentials', true);
      res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
      res.setHeader(
        'Access-Control-Allow-Headers',
        'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
      );
    }

    // Handle OPTIONS request
    if (req.method === 'OPTIONS') {
      res.status(200).end();
      return;
    }

    // Only allow POST requests
    if (req.method !== 'POST') {
      return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
      // Validate request body
      const { priceId, userId, email } = req.body;
      
      if (!priceId || !userId || !email) {
        return res.status(400).json({ 
          error: 'Missing required parameters', 
          details: 'priceId, userId, and email are required' 
        });
      }

      // Validate email format
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        return res.status(400).json({ 
          error: 'Invalid email format' 
        });
      }

      // Validate Stripe secret key
      if (!process.env.STRIPE_SECRET_KEY) {
        console.error('Stripe secret key is not configured');
        return res.status(500).json({ error: 'Payment service is not properly configured' });
      }

      // Create a customer
      const customer = await stripe.customers.create({
        email,
        metadata: {
          userId,
          email
        },
        invoice_settings: {
          default_payment_method: 'pm_card_visa' // Will be replaced by real payment method
        },
      });

      // Create a subscription
      const subscription = await stripe.subscriptions.create({
        customer: customer.id,
        items: [{ price: priceId }],
        payment_behavior: 'default_incomplete',
        payment_settings: { save_default_payment_method: 'on_subscription' },
        expand: ['latest_invoice.payment_intent'],
        metadata: {
          userId,
          email
        }
      });

      // Validate the subscription response
      if (!subscription.latest_invoice?.payment_intent?.client_secret) {
        console.error('No client secret in subscription response:', subscription);
        return res.status(500).json({ error: 'Failed to create payment intent' });
      }

      const clientSecret = subscription.latest_invoice.payment_intent.client_secret;

      return res.status(200).json({
        clientSecret,
        subscriptionId: subscription.id,
        customerId: customer.id,
        status: subscription.status,
        currentPeriodEnd: subscription.current_period_end,
        metadata: subscription.metadata
      });
    } catch (error) {
      console.error('Error creating subscription:', error);
      
      // Handle specific Stripe errors
      if (error.type === 'StripeCardError') {
        return res.status(400).json({ error: error.message });
      } else if (error.type === 'StripeInvalidRequestError') {
        return res.status(400).json({ error: 'Invalid request to payment service' });
      } else if (error.type === 'StripeAPIError') {
        return res.status(500).json({ error: 'Payment service error' });
      }

      // Generic error response
      return res.status(500).json({ 
        error: 'An error occurred while processing your payment',
        details: error.message
      });
    }
  });
}