import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import { Stripe } from 'stripe';
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase admin client
const supabaseAdmin = createClient(
  process.env.VITE_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

if (!process.env.STRIPE_SECRET_KEY) {
  console.error('STRIPE_SECRET_KEY is not set in environment variables');
  process.exit(1);
}

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2023-10-16'
});

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(bodyParser.json());

// Create subscription endpoint
app.post('/api/create-subscription', async (req, res) => {
  try {
    console.log('Received request body:', req.body);

    if (!req.body || !req.body.priceId || !req.body.userId) {
      return res.status(400).json({ error: 'Missing required parameters' });
    }

    const { priceId, userId } = req.body;

    // Create a customer
    const customer = await stripe.customers.create({
      payment_method: 'pm_card_visa',
      email: 'customer@example.com',
      metadata: {
        userId: userId
      },
      invoice_settings: {
        default_payment_method: 'pm_card_visa',
      },
    });

    console.log('Created customer:', customer.id);

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

// Webhook endpoint for Stripe events
app.post('/api/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  const sig = req.headers['stripe-signature'];

  let event;

  try {
    event = stripe.webhooks.constructEvent(
      req.body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    console.error('Webhook signature verification failed:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  try {
    switch (event.type) {
      case 'customer.subscription.created':
      case 'customer.subscription.updated': {
        const subscription = event.data.object;
        const customerId = subscription.customer;
        
        // Get user ID from customer metadata
        const customer = await stripe.customers.retrieve(customerId);
        const userId = customer.metadata.userId;

        if (!userId) {
          console.error('No user ID found in customer metadata');
          return res.status(400).json({ error: 'No user ID found' });
        }

        // Update subscription in database
        const { error } = await supabaseAdmin
          .from('subscriptions')
          .upsert({
            user_id: userId,
            stripe_customer_id: customerId,
            stripe_subscription_id: subscription.id,
            status: subscription.status,
            price_id: subscription.items.data[0].price.id,
            updated_at: new Date().toISOString()
          });

        if (error) {
          console.error('Error updating subscription:', error);
          return res.status(500).json({ error: 'Failed to update subscription' });
        }
        break;
      }
      case 'customer.subscription.deleted': {
        const subscription = event.data.object;
        const customerId = subscription.customer;
        
        // Get user ID from customer metadata
        const customer = await stripe.customers.retrieve(customerId);
        const userId = customer.metadata.userId;

        if (!userId) {
          console.error('No user ID found in customer metadata');
          return res.status(400).json({ error: 'No user ID found' });
        }

        // Update subscription status to canceled in database
        const { error } = await supabaseAdmin
          .from('subscriptions')
          .update({
            status: 'canceled',
            updated_at: new Date().toISOString()
          })
          .eq('user_id', userId)
          .eq('stripe_subscription_id', subscription.id);

        if (error) {
          console.error('Error updating subscription:', error);
          return res.status(500).json({ error: 'Failed to update subscription' });
        }
        break;
      }
    }

    res.json({ received: true });
  } catch (error) {
    console.error('Error processing webhook:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
