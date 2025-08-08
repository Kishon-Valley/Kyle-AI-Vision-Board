# Subscription System Setup Guide

This guide explains how to set up the complete subscription system with Stripe integration for your existing Supabase database.

## 1. Database Setup (Existing Database)

Since your database already exists in Supabase, you only need to add the subscription-related columns and policies:

### Option A: Run the SQL Script
Run `add_subscription_columns.sql` in your Supabase SQL editor to add:
- `subscription_id` column
- `subscription_status` column  
- `created_at` and `updated_at` columns
- Required RLS policies
- Triggers for automatic updates

### Option B: Manual Setup
If you prefer to add columns manually, run these SQL commands:

```sql
-- Add subscription columns
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS subscription_id TEXT;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS subscription_status TEXT DEFAULT 'inactive';
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW());
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW());

-- Enable RLS
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Add policies
CREATE POLICY IF NOT EXISTS "Users can view own subscription data" ON public.users FOR SELECT USING (auth.uid() = id);
CREATE POLICY IF NOT EXISTS "Service role can manage all user data" ON public.users FOR ALL USING (auth.role() = 'service_role');
```

## 2. Stripe Configuration

### Environment Variables Required:

```env
# Stripe Configuration
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Stripe Product IDs
VITE_STRIPE_PRICE_ID_MONTHLY=price_...
VITE_STRIPE_PRICE_ID_YEARLY=price_...

# App URLs
VITE_APP_URL=https://your-domain.com
VITE_API_URL=https://your-domain.com/api
```

### Stripe Dashboard Setup:

1. **Create Products and Prices:**
   - Go to Stripe Dashboard > Products
   - Create two products: "Monthly Subscription" and "Yearly Subscription"
   - Set up recurring prices ($1.99/month and $15.00/year)
   - Copy the price IDs to your environment variables

2. **Configure Webhooks:**
   - Go to Stripe Dashboard > Webhooks
   - Add endpoint: `https://your-domain.com/api/webhooks/stripe`
   - Select these events:
     - `checkout.session.completed`
     - `customer.subscription.updated`
     - `customer.subscription.deleted`
     - `invoice.payment_failed`
     - `invoice.payment_succeeded`
   - Copy the webhook secret to your environment variables

## 3. API Endpoints

The system includes these API endpoints:

- `/api/create-payment-intent` - Creates Stripe checkout sessions
- `/api/verify-session` - Verifies payment and activates subscriptions
- `/api/check-subscription` - Checks and syncs subscription status
- `/api/cancel-subscription` - Cancels subscriptions
- `/api/webhooks/stripe` - Handles Stripe webhook events

## 4. Subscription Flow

### New Subscription:
1. User clicks "Subscribe" button
2. System creates Stripe checkout session
3. User completes payment on Stripe
4. Stripe sends webhook to `/api/webhooks/stripe`
5. Webhook updates user subscription status to 'active'
6. User is redirected to success page
7. Success page verifies payment and refreshes user data

### Subscription Expiration:
1. Stripe automatically handles recurring payments
2. If payment fails, Stripe sends `invoice.payment_failed` webhook
3. Webhook updates user status to 'cancelled'
4. Frontend automatically detects status change
5. User loses access to premium features

### Manual Cancellation:
1. User cancels subscription in profile
2. System calls `/api/cancel-subscription`
3. API cancels subscription in Stripe
4. Stripe sends `customer.subscription.updated` webhook
5. Webhook updates user status to 'cancelled'

## 5. Frontend Integration

The system includes:

- `useSubscription` hook for subscription status management
- `StripePaymentButton` component for payment processing
- Automatic status checking and synchronization
- Real-time subscription status updates

## 6. Testing

### Test the Complete Flow:

1. **Create Test User:**
   - Sign up with a test email
   - Verify user is created in database

2. **Test Subscription:**
   - Go to pricing page
   - Click subscribe
   - Complete payment with test card
   - Verify subscription is activated

3. **Test Expiration:**
   - Use Stripe test mode to simulate payment failure
   - Verify subscription is cancelled

4. **Test Manual Cancellation:**
   - Go to user profile
   - Cancel subscription
   - Verify subscription is cancelled

### Test Cards:

- **Success:** `4242 4242 4242 4242`
- **Decline:** `4000 0000 0000 0002`
- **Requires Authentication:** `4000 0025 0000 3155`

## 7. Monitoring

### Check Logs:
- Monitor webhook events in Stripe Dashboard
- Check server logs for webhook processing
- Monitor database for subscription status changes

### Key Metrics:
- Successful subscriptions
- Failed payments
- Cancellations
- Subscription status sync accuracy

## 8. Troubleshooting

### Common Issues:

1. **Webhook Not Receiving Events:**
   - Check webhook endpoint URL
   - Verify webhook secret
   - Check server logs for errors

2. **Subscription Status Not Updating:**
   - Verify database permissions
   - Check webhook event handling
   - Test manual status sync

3. **Payment Not Processing:**
   - Check Stripe keys
   - Verify product/price IDs
   - Test with Stripe test cards

### Debug Steps:

1. Check Stripe Dashboard for webhook delivery
2. Monitor server logs for errors
3. Test webhook endpoint manually
4. Verify database connections
5. Check environment variables

## 9. Security Considerations

- Never expose Stripe secret keys in frontend code
- Use service role for database operations
- Validate webhook signatures
- Implement proper error handling
- Use HTTPS in production
- Regularly rotate API keys

## 10. Production Checklist

- [ ] Database subscription columns added
- [ ] All environment variables set
- [ ] Webhooks configured in Stripe
- [ ] SSL certificate installed
- [ ] Error monitoring configured
- [ ] Backup strategy in place
- [ ] Rate limiting implemented
- [ ] Logging configured
- [ ] Performance monitoring active
