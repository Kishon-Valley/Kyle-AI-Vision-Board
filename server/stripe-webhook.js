require('dotenv').config();
const express = require('express');
const Stripe = require('stripe');
const { createClient } = require('@supabase/supabase-js');
const cors = require('cors');
const bodyParser = require('body-parser');

const app = express();
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

// Middleware
app.use(cors());
app.use(express.json());

// Stripe webhook endpoint
app.post('/webhook', bodyParser.raw({type: 'application/json'}), async (req, res) => {
  const sig = req.headers['stripe-signature'];
  const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;

  let event;

  try {
    event = stripe.webhooks.constructEvent(req.body, sig, endpointSecret);
  } catch (err) {
    console.error(`Webhook Error: ${err.message}`);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  // Handle the event
  switch (event.type) {
    case 'checkout.session.completed':
      await handleCheckoutSessionCompleted(event.data.object);
      break;
    case 'customer.subscription.updated':
      await handleSubscriptionUpdated(event.data.object);
      break;
    case 'customer.subscription.deleted':
      await handleSubscriptionDeleted(event.data.object);
      break;
    case 'invoice.payment_succeeded':
      await handleInvoicePaid(event.data.object);
      break;
    case 'invoice.payment_failed':
      await handlePaymentFailed(event.data.object);
      break;
    default:
      console.log(`Unhandled event type ${event.type}`);
  }

  res.json({ received: true });
});

// Verify payment endpoint
app.get('/verify-payment', async (req, res) => {
  try {
    const { session_id } = req.query;
    
    if (!session_id) {
      return res.status(400).json({ 
        status: 'error',
        message: 'Session ID is required' 
      });
    }

    // Retrieve the session from Stripe
    const session = await stripe.checkout.sessions.retrieve(session_id, {
      expand: ['customer', 'subscription'],
    });

    if (!session) {
      return res.status(404).json({ 
        status: 'error', 
        message: 'Session not found' 
      });
    }

    const customerId = typeof session.customer === 'string' 
      ? session.customer 
      : session.customer?.id;

    const subscriptionId = typeof session.subscription === 'string'
      ? session.subscription
      : session.subscription?.id;

    if (!customerId || !subscriptionId) {
      return res.status(400).json({ 
        status: 'error', 
        message: 'Invalid session data' 
      });
    }

    // Update the user's subscription status in Supabase
    const { data: user, error: userError } = await supabase
      .from('users')
      .update({
        stripe_customer_id: customerId,
        subscription_id: subscriptionId,
        subscription_status: 'active',
        current_period_end: new Date(session.subscription.current_period_end * 1000).toISOString()
      })
      .eq('id', session.client_reference_id)
      .single();

    if (userError) {
      console.error('Error updating user subscription:', userError);
      return res.status(500).json({ 
        status: 'error', 
        message: 'Failed to update subscription status' 
      });
    }

    res.json({ 
      status: 'success',
      message: 'Payment verified and subscription activated',
      customerId,
      subscriptionId
    });

  } catch (error) {
    console.error('Error verifying payment:', error);
    res.status(500).json({ 
      status: 'error', 
      message: error.message || 'Internal server error' 
    });
  }
});

// Helper functions
async function handleCheckoutSessionCompleted(session) {
  if (!session.customer || !session.subscription) return;

  const { error } = await supabase
    .from('users')
    .update({
      stripe_customer_id: typeof session.customer === 'string' ? session.customer : session.customer.id,
      subscription_id: typeof session.subscription === 'string' ? session.subscription : session.subscription.id,
      subscription_status: 'active',
    })
    .eq('id', session.client_reference_id);

  if (error) {
    console.error('Error updating user after checkout:', error);
    throw error;
  }
}

async function handleSubscriptionUpdated(subscription) {
  if (typeof subscription.customer !== 'string') return;

  const { error } = await supabase
    .from('users')
    .update({
      subscription_id: subscription.id,
      subscription_status: subscription.status,
      current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
    })
    .eq('stripe_customer_id', subscription.customer);

  if (error) {
    console.error('Error updating subscription:', error);
    throw error;
  }
}

async function handleSubscriptionDeleted(subscription) {
  if (typeof subscription.customer !== 'string') return;

  const { error } = await supabase
    .from('users')
    .update({
      subscription_status: 'canceled',
      subscription_id: null,
      current_period_end: null,
    })
    .eq('stripe_customer_id', subscription.customer);

  if (error) {
    console.error('Error canceling subscription:', error);
    throw error;
  }
}

async function handleInvoicePaid(invoice) {
  if (typeof invoice.customer !== 'string') return;

  const { error } = await supabase
    .from('users')
    .update({
      subscription_status: 'active',
      current_period_end: new Date(invoice.period_end * 1000).toISOString(),
    })
    .eq('stripe_customer_id', invoice.customer);

  if (error) {
    console.error('Error updating subscription after payment:', error);
    throw error;
  }
}

async function handlePaymentFailed(invoice) {
  if (typeof invoice.customer !== 'string') return;

  const { error } = await supabase
    .from('users')
    .update({
      subscription_status: 'past_due',
    })
    .eq('stripe_customer_id', invoice.customer);

  if (error) {
    console.error('Error updating subscription after failed payment:', error);
    throw error;
  }
}

// Create Checkout Session endpoint
app.post('/create-checkout-session', async (req, res) => {
  try {
    const { priceId, userId, email, billingInterval } = req.body;
    
    // Use production URLs with fallbacks
    const appUrl = process.env.VITE_APP_URL || 'https://www.moodboardgenerator.com';
    const successUrl = `${appUrl}/payment-success?session_id={CHECKOUT_SESSION_ID}`;
    const cancelUrl = `${appUrl}/pricing`;
    
    console.log('Creating checkout session for:', { 
      priceId, 
      userId, 
      email: email ? `${email.substring(0, 3)}...` : 'no-email',
      billingInterval,
      successUrl,
      cancelUrl
    });

    if (!priceId || !userId || !email || !successUrl || !cancelUrl) {
      return res.status(400).json({
        error: {
          message: 'Missing required parameters',
          code: 'MISSING_REQUIRED_FIELDS',
          details: {
            priceId: !!priceId,
            userId: !!userId,
            email: !!email,
            successUrl: !!successUrl,
            cancelUrl: !!cancelUrl
          }
        }
      });
    }

    // Check if customer exists in Stripe
    let customer;
    const existingCustomers = await stripe.customers.list({ email });

    if (existingCustomers.data.length > 0) {
      customer = existingCustomers.data[0];
    } else {
      // Create a new customer in Stripe
      customer = await stripe.customers.create({
        email,
        metadata: { userId }
      });
    }

    // Create a checkout session
    const session = await stripe.checkout.sessions.create({
      customer: customer.id,
      payment_method_types: ['card'],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      mode: 'subscription',
      success_url: successUrl,
      cancel_url: cancelUrl,
      metadata: { userId },
      subscription_data: {
        metadata: { userId }
      }
    });

    res.json({ url: session.url });
  } catch (error) {
    console.error('Error creating checkout session:', error);
    res.status(500).json({
      error: {
        message: error.message || 'Failed to create checkout session',
        code: 'CHECKOUT_SESSION_ERROR'
      }
    });
  }
});

// Start server
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Webhook endpoint: http://localhost:${PORT}/webhook`);
  console.log(`Verify payment endpoint: http://localhost:${PORT}/verify-payment`);
  console.log(`Checkout session endpoint: http://localhost:${PORT}/create-checkout-session`);
});
