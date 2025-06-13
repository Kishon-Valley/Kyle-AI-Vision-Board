# Payment System Setup

This document outlines how to set up and use the Stripe payment integration in the Vision Board AI application.

## Prerequisites

1. Stripe account (https://dashboard.stripe.com/register)
2. Supabase project with a `users` table that includes:
   - `stripe_customer_id` (text, nullable)
   - `subscription_id` (text, nullable)
   - `subscription_status` (text, nullable)
   - `current_period_end` (timestamp, nullable)

## Environment Variables

Create a `.env` file in the root directory with the following variables:

```
# Stripe
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
VITE_STRIPE_PRICE_ID_MONTHLY=price_...
VITE_STRIPE_PRICE_ID_YEARLY=price_...

# Supabase
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_KEY=your_supabase_service_key

# App
VITE_APP_URL=http://localhost:3000
```

## Backend Server Setup

The payment system requires a backend server to handle webhooks and process payments. A Node.js/Express server is provided in `server/stripe-webhook.js`.

### Installation

1. Install dependencies:
   ```bash
   npm install express stripe cors dotenv @supabase/supabase-js
   ```

2. Start the server:
   ```bash
   # Development (with auto-reload)
   npm run dev:server
   
   # Production
   npm start
   ```

### Webhook Setup

1. Install the Stripe CLI: https://stripe.com/docs/stripe-cli
2. Login to your Stripe account:
   ```bash
   stripe login
   ```
3. Forward webhooks to your local server:
   ```bash
   stripe listen --forward-to localhost:3001/webhook
   ```
4. The CLI will provide a webhook signing secret. Add it to your `.env` file as `STRIPE_WEBHOOK_SECRET`.

## Frontend Development

1. Start the frontend development server:
   ```bash
   npm run dev
   ```
   This will start both the frontend (port 3000) and backend (port 3001) servers.

## Testing Payments

### Test Cards

Use these test card numbers in Stripe test mode:

- Success: `4242 4242 4242 4242`
- Requires authentication: `4000 0025 0000 3155`
- Decline: `4000 0000 0000 0002`

### Testing Webhooks Locally

1. Start the Stripe CLI webhook forwarder:
   ```bash
   stripe listen --forward-to localhost:3001/webhook
   ```
2. In another terminal, trigger test events:
   ```bash
   stripe trigger payment_intent.succeeded
   ```

## Deployment

### Vercel

1. Add all environment variables to your Vercel project settings
2. Update the webhook URL in the Stripe dashboard to point to your production URL

### Other Platforms

For other platforms, ensure:
1. The backend server is running and accessible
2. Webhook URLs are correctly configured in the Stripe dashboard
3. All environment variables are set in your production environment

## Troubleshooting

### Common Issues

1. **Webhook signature verification fails**
   - Ensure the `STRIPE_WEBHOOK_SECRET` matches the one in your Stripe dashboard
   - Verify the webhook payload is being sent correctly

2. **Payment fails**
   - Check the browser console for errors
   - Verify your Stripe API keys are correct
   - Ensure your test card numbers are being used in test mode

3. **Subscription status not updating**
   - Check the backend server logs for errors
   - Verify the webhook is being received and processed
   - Check Supabase for any permission issues

For additional help, check the server logs and Stripe dashboard for error messages.
