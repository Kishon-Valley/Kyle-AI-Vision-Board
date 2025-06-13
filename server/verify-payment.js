require('dotenv').config();
const express = require('express');
const Stripe = require('stripe');
const { createClient } = require('@supabase/supabase-js');
const cors = require('cors');

const app = express();
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

// Middleware
app.use(cors());
app.use(express.json());

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

// Start server
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
