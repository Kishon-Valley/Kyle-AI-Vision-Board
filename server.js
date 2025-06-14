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

// CORS configuration
const corsOptions = {
  origin: [
    'https://www.moodboardgenerator.com',
    'https://moodboardgenerator.com',
    'http://localhost:5173'
  ],
  methods: ['GET', 'POST', 'OPTIONS', 'PUT', 'PATCH', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept'],
  credentials: true,
  preflightContinue: false,
  optionsSuccessStatus: 204
};

// Apply CORS middleware
app.use(cors(corsOptions));

// Handle preflight requests
app.options('*', cors(corsOptions));

// Body parser middleware
app.use(bodyParser.json({ limit: '50mb' }));
app.use(bodyParser.urlencoded({ limit: '50mb', extended: true }));

// Add headers middleware
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', req.headers.origin);
  res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, PATCH, DELETE');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  res.header('Access-Control-Allow-Credentials', 'true');
  next();
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Create subscription endpoint
app.post('/api/create-subscription', async (req, res) => {
  try {
    console.log('Received request body:', JSON.stringify(req.body, null, 2));

    // Validate required fields
    const requiredFields = ['priceId', 'userId', 'email', 'billingInterval'];
    const missingFields = requiredFields.filter(field => !req.body[field]);
    
    if (missingFields.length > 0) {
      console.error('Missing required fields:', missingFields);
      return res.status(400).json({ 
        success: false,
        error: 'Missing required parameters',
        missingFields: missingFields,
        receivedData: {
          priceId: !!req.body.priceId,
          userId: !!req.body.userId,
          email: !!req.body.email,
          billingInterval: req.body.billingInterval
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
        .select('stripe_customer_id, email')
        .eq('id', userId)
        .single();
      
      if (userError || !userData) {
        console.log('Creating new Stripe customer for user:', { userId, email });
        // Create new customer in Stripe
        customer = await stripe.customers.create({
          email: email,
          metadata: { userId },
          name: email.split('@')[0] // Use the part before @ as the name
        });
        
        console.log('Created Stripe customer:', customer.id);
        
        // Save customer ID to Supabase
        const { error: updateError } = await supabase
          .from('users')
          .upsert({
            id: userId,
            email: email,
            stripe_customer_id: customer.id,
            subscription_status: 'inactive',
            updated_at: new Date().toISOString()
          }, {
            onConflict: 'id'
          });
          
        if (updateError) {
          console.error('Error updating user in Supabase:', updateError);
          return res.status(500).json({ 
            success: false,
            error: 'Failed to update user data',
            details: updateError.message 
          });
        }
      } else {
        // Use existing customer
        console.log('Using existing Stripe customer:', userData.stripe_customer_id);
        customer = { id: userData.stripe_customer_id };
      }
      
      // Create checkout session
      console.log('Creating checkout session with price ID:', priceId);
      const session = await stripe.checkout.sessions.create({
        customer: customer.id,
        payment_method_types: ['card'],
        line_items: [{
          price: priceId,
          quantity: 1,
        }],
        mode: 'subscription',
        subscription_data: {
          metadata: {
            userId,
            billingInterval
          }
        },
        payment_intent_data: {
          metadata: {
            userId,
            priceId,
            billingInterval
          }
        },
        success_url: `${appUrl}/payment-success?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${appUrl}/pricing`,
        metadata: {
          userId,
          priceId,
          billingInterval
        }
      });
      
      console.log('Created checkout session:', session.id);
      
      res.json({ 
        success: true, 
        url: session.url,
        sessionId: session.id
      });
    
  } catch (error) {
    console.error('Error in create-subscription:', {
      message: error.message,
      stack: error.stack,
      type: error.type,
      code: error.code,
      statusCode: error.statusCode,
      raw: error.raw ? JSON.stringify(error.raw, null, 2) : undefined
    });
    
    const statusCode = error.statusCode || 500;
    const errorResponse = {
      success: false,
      error: 'Failed to create subscription',
      message: error.message,
      code: error.code || 'unknown_error',
      details: error.raw ? error.raw.message : undefined
    };
    
    res.status(statusCode).json(errorResponse);
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
