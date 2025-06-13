require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const Stripe = require('stripe');
const { createClient } = require('@supabase/supabase-js');

// Initialize Stripe
if (!process.env.STRIPE_SECRET_KEY) {
  console.error('STRIPE_SECRET_KEY is not set in environment variables');
  process.exit(1);
}

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2023-10-16'
});

// Initialize Supabase
const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Supabase URL or key is not set in environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// Create Express app
const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors({
  origin: [
    'https://www.moodboardgenerator.com',
    'https://moodboardgenerator.com',
    'http://localhost:5173'
  ],
  credentials: true
}));

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Create subscription endpoint
app.post('/api/create-subscription', async (req, res) => {
  try {
    console.log('Received request body:', req.body);

    if (!req.body || !req.body.priceId || !req.body.userId || !req.body.email) {
      return res.status(400).json({ 
        error: 'Missing required parameters',
        details: {
          priceId: !!req.body.priceId,
          userId: !!req.body.userId,
          email: !!req.body.email
        }
      });
    }

    const { priceId, userId, email, billingInterval } = req.body;
    const appUrl = process.env.VITE_APP_URL || 'https://www.moodboardgenerator.com';
    
    // Create or get customer in Stripe
    let customer;
    
    // Check if user already has a customer ID in Supabase
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('stripe_customer_id')
      .eq('id', userId)
      .single();
      
    if (userError || !userData) {
      // Create new customer in Stripe
      customer = await stripe.customers.create({
        email: email,
        metadata: { userId }
      });
      
      // Save customer ID to Supabase
      const { error: updateError } = await supabase
        .from('users')
        .upsert({
          id: userId,
          email: email,
          stripe_customer_id: customer.id,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'id'
        });
        
      if (updateError) {
        console.error('Error updating user in Supabase:', updateError);
        return res.status(500).json({ error: 'Failed to update user data' });
      }
    } else {
      // Use existing customer
      customer = { id: userData.stripe_customer_id };
    }
    
    // Create checkout session
    const session = await stripe.checkout.sessions.create({
      customer: customer.id,
      payment_method_types: ['card'],
      line_items: [{
        price: priceId,
        quantity: 1,
      }],
      mode: 'subscription',
      success_url: `${appUrl}/payment-success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${appUrl}/pricing`,
      metadata: {
        userId,
        priceId,
        billingInterval
      }
    });
    
    res.json({ url: session.url });
    
  } catch (error) {
    console.error('Error creating subscription:', error);
    res.status(500).json({ 
      error: 'Failed to create subscription',
      details: error.message 
    });
  }
});

// Webhook handler for Stripe events
app.post('/api/webhook', bodyParser.raw({ type: 'application/json' }), async (req, res) => {
  const sig = req.headers['stripe-signature'];
  const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;

  let event;

  try {
    event = stripe.webhooks.constructEvent(req.body, sig, endpointSecret);
  } catch (err) {
    console.error('Webhook signature verification failed:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  // Handle the event
  switch (event.type) {
    case 'checkout.session.completed':
      const session = event.data.object;
      await handleCheckoutSessionCompleted(session);
      break;
    case 'customer.subscription.updated':
    case 'customer.subscription.deleted':
      const subscription = event.data.object;
      await handleSubscriptionUpdated(subscription);
      break;
    case 'invoice.payment_succeeded':
      const invoice = event.data.object;
      await handleInvoicePaid(invoice);
      break;
    case 'invoice.payment_failed':
      await handlePaymentFailed(event.data.object);
      break;
    default:
      console.log(`Unhandled event type ${event.type}`);
  }

  // Return a 200 response to acknowledge receipt of the event
  res.json({ received: true });
});

async function handleCheckoutSessionCompleted(session) {
  const userId = session.metadata.userId;
  const customerId = session.customer;
  const subscriptionId = session.subscription;

  try {
    // Update user in Supabase with subscription info
    const { error } = await supabase
      .from('users')
      .update({
        stripe_customer_id: customerId,
        subscription_id: subscriptionId,
        subscription_status: 'active',
        updated_at: new Date().toISOString()
      })
      .eq('id', userId);

    if (error) throw error;
    console.log(`Updated user ${userId} with subscription ${subscriptionId}`);
  } catch (error) {
    console.error('Error handling checkout.session.completed:', error);
    throw error;
  }
}

async function handleSubscriptionUpdated(subscription) {
  const customerId = subscription.customer;
  const status = subscription.status;

  try {
    // Update user's subscription status in Supabase
    const { error } = await supabase
      .from('users')
      .update({
        subscription_status: status,
        updated_at: new Date().toISOString()
      })
      .eq('stripe_customer_id', customerId);

    if (error) throw error;
    console.log(`Updated subscription status to ${status} for customer ${customerId}`);
  } catch (error) {
    console.error('Error updating subscription status:', error);
    throw error;
  }
}

async function handleInvoicePaid(invoice) {
  const customerId = invoice.customer;
  const amountPaid = invoice.amount_paid;
  const currency = invoice.currency;

  try {
    // Log the successful payment in your database
    const { error } = await supabase
      .from('payments')
      .insert({
        customer_id: customerId,
        amount: amountPaid / 100, // Convert from cents to dollars
        currency: currency,
        status: 'succeeded',
        invoice_id: invoice.id,
        created_at: new Date().toISOString()
      });

    if (error) throw error;
    console.log(`Recorded payment of ${amountPaid} ${currency} for customer ${customerId}`);
  } catch (error) {
    console.error('Error recording payment:', error);
    throw error;
  }
}

async function handlePaymentFailed(invoice) {
  const customerId = invoice.customer;
  const paymentIntent = invoice.payment_intent;

  try {
    // Log the failed payment in your database
    const { error } = await supabase
      .from('payments')
      .insert({
        customer_id: customerId,
        amount: invoice.amount_due / 100, // Convert from cents to dollars
        currency: invoice.currency,
        status: 'failed',
        invoice_id: invoice.id,
        payment_intent: paymentIntent,
        failure_reason: invoice.billing_reason,
        created_at: new Date().toISOString()
      });

    if (error) throw error;
    console.log(`Recorded failed payment for customer ${customerId}, invoice ${invoice.id}`);
  } catch (error) {
    console.error('Error recording failed payment:', error);
    throw error;
  }
}

// Simple endpoint to check if the server is running
app.get('/', (req, res) => {
  res.send('Vision Board AI API is running');
});

// Create subscription endpoint
app.post('/api/create-subscription', async (req, res) => {
  const { priceId, userId } = req.body;

  if (!priceId || !userId) {
    return res.status(400).json({ error: 'Price ID and User ID are required' });
  }

  try {
    // Check if user already has a customer ID
    const { data: user, error: userError } = await supabaseAdmin
      .from('users')
      .select('stripe_customer_id')
      .eq('id', userId)
      .single();

    if (userError) {
      console.error('Error fetching user:', userError);
      return res.status(500).json({ error: 'Error fetching user data' });
    }

    let customer;
    
    if (user.stripe_customer_id) {
      // Use existing customer
      customer = await stripe.customers.retrieve(user.stripe_customer_id);
    } else {
      // Create new customer
      const { data: userData, error: fetchError } = await supabaseAdmin.auth.admin.getUserById(userId);
      if (fetchError) {
        console.error('Error fetching user data:', fetchError);
        return res.status(500).json({ error: 'Error fetching user data' });
      }

      const email = userData.user.email;
      customer = await stripe.customers.create({
        email,
        metadata: { userId },
      });

      // Save customer ID to user record
      const { error: updateError } = await supabaseAdmin
        .from('users')
        .update({ stripe_customer_id: customer.id })
        .eq('id', userId);

      if (updateError) {
        console.error('Error updating user with Stripe customer ID:', updateError);
        // Continue anyway - we have the customer in Stripe
      }
    }

    // Create a subscription
    const subscription = await stripe.subscriptions.create({
      customer: customer.id,
      items: [{ price: priceId }],
      payment_behavior: 'default_incomplete',
      payment_settings: { save_default_payment_method: 'on_subscription' },
      expand: ['latest_invoice.payment_intent'],
    });

    console.log('Created subscription:', subscription);

    // Check if we have the payment intent
    if (!subscription.latest_invoice?.payment_intent?.client_secret) {
      console.error('No client secret in subscription response:', subscription);
      return res.status(500).json({ 
        error: 'Failed to create payment intent',
        details: 'No client secret received from Stripe'
      });
    }

    const clientSecret = subscription.latest_invoice.payment_intent.client_secret;

    // Create initial subscription record
    const { error: dbError } = await supabaseAdmin
      .from('subscriptions')
      .insert({
        user_id: userId,
        stripe_customer_id: customer.id,
        stripe_subscription_id: subscription.id,
        status: subscription.status,
        price_id: priceId
      });

    if (dbError) {
      console.error('Error creating subscription record:', dbError);
      // Continue even if database insert fails - webhook will handle it
    }

    res.status(200).json({
      clientSecret,
      subscriptionId: subscription.id,
    });
  } catch (error) {
    console.error('Error creating subscription:', error);
    
    // Handle specific Stripe errors
    if (error.type === 'StripeInvalidRequestError') {
      return res.status(400).json({ 
        error: 'Invalid request to payment service',
        details: error.message
      });
    }
    
    res.status(500).json({ 
      error: 'Failed to create subscription',
      details: error.message
    });
  }
});

// Delete user account endpoint
app.post('/api/delete-account', async (req, res) => {
  const { userId } = req.body;

  if (!userId) {
    return res.status(400).json({ error: 'User ID is required' });
  }

  try {
    // First, verify the user exists and get their auth ID
    const { data: user, error: userError } = await supabaseAdmin.auth.admin.getUserById(userId);
    
    if (userError || !user) {
      console.error('Error fetching user:', userError);
      return res.status(404).json({ error: 'User not found' });
    }

    // Delete user data from profiles table
    const { error: profileError } = await supabaseAdmin
      .from('profiles')
      .delete()
      .eq('id', userId);

    if (profileError) {
      console.error('Error deleting profile data:', profileError);
      // Continue even if profile deletion fails
    }

    // Delete user data from subscriptions table
    const { error: subscriptionError } = await supabaseAdmin
      .from('subscriptions')
      .delete()
      .eq('user_id', userId);

    if (subscriptionError) {
      console.error('Error deleting subscription data:', subscriptionError);
      // Continue even if subscription deletion fails
    }

    // Delete the user from auth
    const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(userId);
    
    if (deleteError) {
      console.error('Error deleting user from auth:', deleteError);
      return res.status(500).json({ error: 'Failed to delete user from authentication' });
    }

    res.status(200).json({ success: true, message: 'Account deleted successfully' });
  } catch (error) {
    console.error('Error in delete account:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Start server
const server = app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT}`);
  console.log('Environment:', process.env.NODE_ENV || 'development');
  console.log('Supabase URL:', process.env.VITE_SUPABASE_URL ? 'Set' : 'Not set');
  console.log('Stripe Key:', process.env.STRIPE_SECRET_KEY ? 'Set' : 'Not set');
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (err) => {
  console.error('Unhandled Rejection:', err);
  server.close(() => process.exit(1));
});

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err);
  server.close(() => process.exit(1));
});

// Handle process termination
process.on('SIGTERM', () => {
  console.log('SIGTERM received. Shutting down gracefully');
  server.close(() => {
    console.log('Process terminated');
  });
});

// Export the Express API
module.exports = app;
