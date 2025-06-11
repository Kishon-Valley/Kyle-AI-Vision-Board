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

    if (!req.body || !req.body.priceId) {
      return res.status(400).json({ error: 'Missing required priceId parameter' });
    }

    const { priceId } = req.body;

    // Create a customer
    const customer = await stripe.customers.create({
      payment_method: 'pm_card_visa',
      email: 'customer@example.com',
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

    // Delete the user from auth
    const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(userId);
    
    if (deleteError) {
      console.error('Error deleting user from auth:', deleteError);
      return res.status(500).json({ error: 'Failed to delete user from authentication' });
    }

    // Delete user data from your database tables
    // Replace 'user_data' with your actual table names
    const { error: dataError } = await supabaseAdmin
      .from('user_data')
      .delete()
      .eq('user_id', userId);

    if (dataError) {
      console.error('Error deleting user data:', dataError);
      // Continue even if data deletion fails, as auth is already deleted
    }

    res.status(200).json({ success: true, message: 'Account deleted successfully' });
  } catch (error) {
    console.error('Error in delete account:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
