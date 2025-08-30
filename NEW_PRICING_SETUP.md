# New Pricing Tiers Setup Guide

This guide explains how to set up the new pricing tiers with image limits for your Kyle AI Vision Board application.

## 🎯 New Pricing Structure

### Tier 1: Basic
- **Price**: $1.99/month
- **Images**: 3 AI-generated mood boards per month
- **Features**: AI-powered design suggestions, high-resolution downloads, basic support

### Tier 2: Pro
- **Price**: $4.99/month
- **Images**: 25 AI-generated mood boards per month
- **Features**: Everything in Basic + priority support, advanced customization options

### Tier 3: Yearly Pro
- **Price**: $29.99/year (Save 50%!)
- **Images**: 25 AI-generated mood boards per month
- **Features**: Everything in Pro + exclusive templates, early access to new features

## 🗄️ Database Setup

### 1. Run the Database Migration

Execute the SQL script `supabase_pricing_tiers_setup.sql` in your Supabase SQL editor:

```sql
-- This will add the necessary columns and functions for the new pricing system
-- Run this in your Supabase SQL editor
```

### 2. New Database Columns Added

The migration adds these columns to the `users` table:

- `subscription_tier` (TEXT) - The user's subscription tier ('free', 'basic', 'pro', 'yearly')
- `images_used_this_month` (INTEGER) - Number of images used in current month
- `images_limit_per_month` (INTEGER) - Monthly image limit based on tier
- `last_reset_date` (DATE) - Date when usage was last reset

### 3. New Database Functions

- `check_and_increment_image_usage(user_uuid)` - Checks and increments image usage
- `get_remaining_images(user_uuid)` - Gets user's remaining images
- `reset_monthly_image_usage()` - Resets monthly usage counters

## 🔧 Stripe Configuration

### 1. Create New Products in Stripe

Go to your Stripe Dashboard and create these products:

#### Basic Plan ($1.99/month)
- Product Name: "Basic Plan"
- Price: $1.99/month (recurring)
- Copy the price ID (starts with `price_`)

#### Pro Plan ($4.99/month)
- Product Name: "Pro Plan"
- Price: $4.99/month (recurring)
- Copy the price ID (starts with `price_`)

#### Yearly Pro Plan ($29.99/year)
- Product Name: "Yearly Pro Plan"
- Price: $29.99/year (recurring)
- Copy the price ID (starts with `price_`)

### 2. Update Environment Variables

Add these new environment variables to your `.env` file:

```env
# New Stripe Price IDs
VITE_STRIPE_PRICE_ID_BASIC=price_xxxxxxxxxxxxx
VITE_STRIPE_PRICE_ID_PRO=price_xxxxxxxxxxxxx
VITE_STRIPE_PRICE_ID_YEARLY=price_xxxxxxxxxxxxx

# Keep existing variables
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
```

## 🔄 Updated API Endpoints

### 1. New Endpoints Added

- `/api/check-image-usage` - Check user's current image usage
- `/api/increment-image-usage` - Increment image usage when generating

### 2. Updated Endpoints

- `/api/create-payment-intent` - Now supports new tier IDs
- `/api/webhooks/stripe` - Sets correct tier and image limits

## 🎨 Frontend Changes

### 1. Updated Components

- **PaymentPage.tsx** - New pricing tiers with image limits
- **StripePaymentButton.tsx** - Updated to handle new tiers
- **QuestionnairePage.tsx** - Added usage indicator
- **ResultPage.tsx** - Increments usage when generating
- **UserProfile.tsx** - Shows usage information

### 2. New Hook

- **useImageUsage.ts** - Manages image usage state and API calls

## 🚀 Implementation Steps

### Step 1: Database Setup
1. Run `supabase_pricing_tiers_setup.sql` in Supabase SQL editor
2. Verify new columns are added to `users` table
3. Test database functions

### Step 2: Stripe Configuration
1. Create new products in Stripe Dashboard
2. Update environment variables with new price IDs
3. Test payment flow with new tiers

### Step 3: Deploy API Changes
1. Deploy updated API endpoints
2. Test webhook handling for new tiers
3. Verify image usage tracking

### Step 4: Deploy Frontend Changes
1. Deploy updated components
2. Test new pricing page
3. Verify usage tracking in UI

## 🧪 Testing

### Test Image Usage Tracking

1. **Create a test user** with a subscription
2. **Generate mood boards** and verify usage increments
3. **Check limits** - try to exceed monthly limit
4. **Test monthly reset** - verify usage resets on new month

### Test Payment Flow

1. **Test each tier** - Basic, Pro, Yearly
2. **Verify webhook processing** - check database updates
3. **Test subscription changes** - upgrade/downgrade flows

### Test Edge Cases

1. **Usage limit reached** - should prevent generation
2. **Monthly reset** - usage should reset on new month
3. **Subscription cancellation** - should revoke access
4. **Payment failures** - should handle gracefully

## 📊 Monitoring

### Key Metrics to Track

- **Subscription conversions** by tier
- **Image usage patterns** - average usage per user
- **Upgrade rates** - Basic to Pro conversions
- **Churn rates** - subscription cancellations

### Logs to Monitor

- Image usage API calls
- Payment processing
- Webhook events
- Database updates

## 🔒 Security Considerations

- **Usage validation** - server-side checks for image limits
- **Rate limiting** - prevent API abuse
- **Data integrity** - ensure usage counts are accurate
- **Access control** - verify subscription status

## 🐛 Troubleshooting

### Common Issues

1. **Usage not incrementing**
   - Check API endpoint logs
   - Verify database permissions
   - Test increment function manually

2. **Limits not enforced**
   - Check subscription status
   - Verify tier configuration
   - Test usage check logic

3. **Monthly reset not working**
   - Check date comparison logic
   - Verify database timezone
   - Test reset function manually

### Debug Commands

```sql
-- Check user's current usage
SELECT subscription_tier, images_used_this_month, images_limit_per_month, last_reset_date 
FROM users 
WHERE id = 'user-uuid';

-- Manually reset usage for testing
UPDATE users 
SET images_used_this_month = 0, last_reset_date = CURRENT_DATE 
WHERE id = 'user-uuid';

-- Check all users with usage
SELECT id, subscription_tier, images_used_this_month, images_limit_per_month 
FROM users 
WHERE subscription_status = 'active';
```

## 📈 Migration from Old System

### For Existing Users

1. **Free users** - remain free with 0 image limit
2. **Existing subscribers** - automatically get Pro tier (25 images/month)
3. **Data migration** - run migration script to update existing records

### Migration Script

```sql
-- Update existing active subscribers to Pro tier
UPDATE users 
SET 
  subscription_tier = 'pro',
  images_limit_per_month = 25,
  images_used_this_month = 0,
  last_reset_date = CURRENT_DATE
WHERE subscription_status = 'active' 
AND subscription_tier IS NULL;
```

## 🎉 Success Criteria

- [ ] All three pricing tiers working
- [ ] Image usage tracking accurate
- [ ] Monthly limits enforced
- [ ] Usage resets properly
- [ ] UI shows usage information
- [ ] Payment flow works for all tiers
- [ ] Webhooks process correctly
- [ ] No data loss during migration

## 📞 Support

If you encounter issues:

1. Check the logs for error messages
2. Verify environment variables are set correctly
3. Test database functions manually
4. Check Stripe Dashboard for payment issues
5. Review webhook delivery status

The new pricing system provides a more sustainable business model while giving users clear value propositions for each tier.



