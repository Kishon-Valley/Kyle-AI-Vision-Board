# Payment Integration Guide

This document outlines the payment integration setup for the Vision Board AI application, including Stripe configuration, backend server setup, and frontend implementation.

## Architecture Overview

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│                 │     │                 │     │                 │
│  Frontend App   │────▶│  Backend Server  │────▶│     Stripe      │
│  (Vite/React)   │◀────│  (Express.js)    │◀────│                 │
│                 │     │                 │     │                 │
└─────────────────┘     └─────────────────┘     └─────────────────┘
        │                         │
        │                         │
        ▼                         ▼
┌─────────────────┐     ┌─────────────────┐
│                 │     │                 │
│     Supabase    │     │     Webhooks    │
│     Database    │◀────│  (Stripe → BE)  │
│                 │     │                 │
└─────────────────┘     └─────────────────┘
```

## Environment Variables

Update your `.env` file with the following variables:

```env
# Stripe
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_your_publishable_key
STRIPE_SECRET_KEY=sk_test_your_secret_key
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret
VITE_STRIPE_PRICE_ID_MONTHLY=price_your_monthly_price_id
VITE_STRIPE_PRICE_ID_YEARLY=price_your_yearly_price_id

# Supabase
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_KEY=your_supabase_service_key

# App
NODE_ENV=development
VITE_APP_URL=http://localhost:5173
VITE_API_URL=http://localhost:3001

# CORS
ALLOWED_ORIGINS=http://localhost:5173,https://your-production-url.com
```

## Backend Server Endpoints

### 1. Create Checkout Session
- **Endpoint**: `POST /create-checkout-session`
- **Request Body**:
  ```json
  {
    "priceId": "price_123",
    "userId": "user_123",
    "email": "user@example.com",
    "billingInterval": "month"
  }
  ```
- **Response**:
  ```json
  {
    "url": "https://checkout.stripe.com/c/pay/cs_test_..."
  }
  ```

### 2. Verify Payment
- **Endpoint**: `GET /verify-payment?session_id=cs_test_123`
- **Response**:
  ```json
  {
    "status": "success",
    "message": "Payment verified and subscription activated",
    "customerId": "cus_123",
    "subscriptionId": "sub_123"
  }
  ```

### 3. Webhook Endpoint
- **Endpoint**: `POST /webhook`
- **Description**: Handles Stripe webhook events (checkout.session.completed, customer.subscription.updated, etc.)

## Frontend Flow

1. **Pricing Page** (`/pricing`)
   - User selects a plan (monthly/yearly)
   - Click "Get Started" button
   - `PaymentForm` component handles the subscription creation

2. **Checkout Flow**
   - Frontend calls `/api/create-subscription`
   - Backend creates a Stripe Checkout session
   - User is redirected to Stripe Checkout
   - After payment, user is redirected to `/payment-success`

3. **Payment Success Page** (`/payment-success`)
   - Verifies the payment using the session ID
   - Updates the UI based on verification status
   - Redirects to dashboard on success

## Testing Locally

1. Start the backend server:
   ```bash
   npm run server
   ```

2. Start the frontend development server:
   ```bash
   npm run dev
   ```

3. Test the payment flow:
   - Visit `http://localhost:5173/pricing`
   - Select a plan and click "Get Started"
   - Use Stripe test card: `4242 4242 4242 4242`
   - Enter any future date for expiry, any 3 digits for CVC, and any postal code

## Deployment

1. Set up environment variables in your hosting provider
2. Deploy the backend server (e.g., Render, Heroku, or Vercel Serverless Functions)
3. Update the frontend's `VITE_API_URL` to point to your deployed backend
4. Configure the webhook URL in your Stripe Dashboard

## Troubleshooting

- **Webhook errors**: Ensure your webhook signing secret is correctly set in the `.env` file
- **CORS issues**: Verify `ALLOWED_ORIGINS` includes your frontend URL
- **Stripe API errors**: Check the backend logs for detailed error messages
- **Database issues**: Ensure Supabase service key has proper permissions

## Security Considerations

- Never expose `STRIPE_SECRET_KEY` or `SUPABASE_SERVICE_KEY` in the frontend
- Always use HTTPS in production
- Validate all incoming webhook events using the webhook signing secret
- Implement rate limiting on your API endpoints
- Keep dependencies updated to patch security vulnerabilities
