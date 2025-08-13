# Payment System Debug Guide

This guide helps you debug and fix payment system issues, particularly the problem where payments are successful but subscription status remains "inactive".

## Current Issue Analysis

**Problem**: After successful payment, users are redirected back to pricing page and `subscription_status` remains "inactive" despite `subscription_id` being populated.

**Root Cause**: Webhook is not properly processing the `checkout.session.completed` event, or there's a race condition between payment completion and webhook processing.

## Debugging Steps

### 1. Check Webhook Configuration

#### Verify Stripe Webhook Setup:
1. Go to [Stripe Dashboard > Webhooks](https://dashboard.stripe.com/webhooks)
2. Check if webhook endpoint exists: `https://your-domain.com/api/webhooks/stripe`
3. Verify these events are selected:
   - `checkout.session.completed`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.payment_failed`
   - `invoice.payment_succeeded`
4. Check webhook delivery status - look for failed deliveries

#### Test Webhook Endpoint:
```bash
# Test if webhook endpoint is accessible
curl -X POST https://your-domain.com/api/test-webhook \
  -H "Content-Type: application/json" \
  -d '{"test": "data"}'
```

### 2. Check Environment Variables

Verify these environment variables are set correctly:

```env
# Stripe Configuration
STRIPE_SECRET_KEY=sk_test_... or sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Supabase Configuration
VITE_SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# Stripe Product IDs
VITE_STRIPE_PRICE_ID_MONTHLY=price_...
VITE_STRIPE_PRICE_ID_YEARLY=price_...
```

### 3. Check Server Logs

Look for these log messages in your server logs:

#### Successful Webhook Processing:
```
Processing webhook event: checkout.session.completed
Payment completed for session: cs_...
Processing subscription activation for user: ...
Subscription activated for user: ...
```

#### Failed Webhook Processing:
```
Webhook signature verification failed
Error updating user subscription
Database error during subscription activation
```

### 4. Manual Database Check

Check the database directly:

```sql
-- Check user subscription status
SELECT id, email, subscription_id, subscription_status, updated_at 
FROM users 
WHERE subscription_id IS NOT NULL 
ORDER BY updated_at DESC;

-- Check if subscription_id exists but status is inactive
SELECT id, email, subscription_id, subscription_status 
FROM users 
WHERE subscription_id IS NOT NULL 
AND subscription_status = 'inactive';
```

### 5. Test Payment Flow

#### Step-by-Step Testing:
1. **Create Test Payment:**
   - Use test card: `4242 4242 4242 4242`
   - Complete payment flow
   - Check browser console for errors

2. **Check Payment Success Page:**
   - Look for verification logs
   - Check if retry mechanism works
   - Verify subscription status updates

3. **Manual Verification:**
   - Use debug buttons on payment success page
   - Check subscription status manually

## Common Issues and Solutions

### Issue 1: Webhook Not Receiving Events

**Symptoms:**
- No webhook logs in server
- Stripe dashboard shows failed webhook deliveries

**Solutions:**
1. Check webhook URL is correct and accessible
2. Verify webhook secret matches environment variable
3. Ensure server is running and accessible
4. Check firewall/network restrictions

### Issue 2: Webhook Receiving Events But Database Not Updated

**Symptoms:**
- Webhook logs show events received
- Database subscription_status remains "inactive"

**Solutions:**
1. Check Supabase service key permissions
2. Verify database RLS policies
3. Check for database connection errors
4. Ensure user exists in database

### Issue 3: Race Condition Between Payment and Webhook

**Symptoms:**
- Payment successful
- Webhook processes but user not found
- Subscription_id populated but status inactive

**Solutions:**
1. Improved retry mechanism (already implemented)
2. Better error handling in webhook
3. Fallback verification in payment success page

### Issue 4: Environment Variable Issues

**Symptoms:**
- Webhook fails with "Server mis-configuration" error
- Database operations fail

**Solutions:**
1. Verify all environment variables are set
2. Check variable names match code
3. Ensure no extra spaces or quotes
4. Restart server after environment changes

## Immediate Fixes Applied

### 1. Enhanced Webhook Handler
- ✅ Better error handling and logging
- ✅ Proper error responses
- ✅ More robust database operations
- ✅ Comprehensive event processing

### 2. Improved Payment Verification
- ✅ Direct Stripe subscription verification
- ✅ Fallback database updates
- ✅ Better error handling
- ✅ Enhanced logging

### 3. Robust Payment Success Page
- ✅ Retry mechanism with exponential backoff
- ✅ Better user feedback
- ✅ Debug tools for troubleshooting
- ✅ Graceful error handling

## Testing the Fix

### 1. Test Complete Payment Flow:
```bash
# 1. Make a test payment
# 2. Check webhook logs
# 3. Verify database update
# 4. Test retry mechanism
```

### 2. Monitor Logs:
```bash
# Watch for these success messages:
"Processing webhook event: checkout.session.completed"
"Subscription activated for user: ..."
"Payment verification successful"
```

### 3. Database Verification:
```sql
-- Should show active subscription
SELECT subscription_status FROM users WHERE subscription_id = 'sub_...';
```

## Emergency Manual Fix

If webhook is completely broken, you can manually fix existing subscriptions:

```sql
-- Update all users with subscription_id but inactive status
UPDATE users 
SET subscription_status = 'active', updated_at = NOW()
WHERE subscription_id IS NOT NULL 
AND subscription_status = 'inactive';
```

## Prevention Measures

### 1. Monitoring:
- Set up webhook delivery monitoring
- Monitor database for inconsistent states
- Track payment success rates

### 2. Alerts:
- Webhook failure alerts
- Database inconsistency alerts
- Payment verification failure alerts

### 3. Regular Testing:
- Test payment flow weekly
- Verify webhook processing
- Check database consistency

## Support Information

If issues persist:
1. Check Stripe Dashboard for webhook delivery status
2. Review server logs for error messages
3. Test webhook endpoint manually
4. Verify environment variables
5. Check database permissions and policies

## Quick Diagnostic Commands

```bash
# Test webhook endpoint
curl -X POST https://your-domain.com/api/test-webhook -H "Content-Type: application/json" -d '{}'

# Check environment variables (replace with your actual values)
echo $STRIPE_WEBHOOK_SECRET
echo $SUPABASE_SERVICE_KEY

# Test database connection
curl -X POST https://your-domain.com/api/check-subscription \
  -H "Content-Type: application/json" \
  -d '{"userId": "your-user-id"}'
```
