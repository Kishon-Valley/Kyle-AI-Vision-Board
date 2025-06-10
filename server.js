require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(bodyParser.json());

// Create subscription endpoint
app.post('/create-subscription', async (req, res) => {
  try {
    if (!req.body || !req.body.priceId) {
      return res.status(400).json({ error: 'Missing required priceId parameter' });
    }

    const { priceId } = req.body;

    // In a real app, you'd get the customer ID from your database
    // For this example, we'll create a new customer each time
    const customer = await stripe.customers.create({
      payment_method: 'pm_card_visa', // In production, get this from the client
      email: 'customer@example.com', // In production, get this from your auth system
      invoice_settings: {
        default_payment_method: 'pm_card_visa',
      },
    });

    // Create a subscription
    const subscription = await stripe.subscriptions.create({
      customer: customer.id,
      items: [{ price: priceId }],
      payment_behavior: 'default_incomplete',
      payment_settings: { save_default_payment_method: 'on_subscription' },
      expand: ['latest_invoice.payment_intent'],
    });

    const clientSecret = subscription.latest_invoice.payment_intent.client_secret;

    res.status(200).json({
      clientSecret,
      subscriptionId: subscription.id,
    });
  } catch (error) {
    console.error('Error creating subscription:', error);
    res.status(500).json({ error: error.message || 'Failed to create subscription' });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
