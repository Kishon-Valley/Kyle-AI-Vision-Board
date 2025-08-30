# Subscription Tier Fix for Moodboard Generator

## Problem Description

Users with active subscriptions are unable to create moodboards because the system is treating them as "free" tier users with 0 image limit. This happens when there's a mismatch between the subscription tier stored in the database and the actual Stripe subscription.

## Root Cause

The issue occurs in the Stripe webhook (`api/webhooks/stripe.js`) when processing subscription activations. The webhook was setting the subscription tier based on `billing_interval` metadata, but this metadata might not be properly set or might be missing.

## What I've Fixed

### 1. Updated Stripe Webhook (`api/webhooks/stripe.js`)
- Changed from metadata-based tier determination to Stripe price ID-based determination
- Added fallback to metadata-based determination if price ID lookup fails
- This ensures the correct subscription tier and image limits are set when subscriptions are activated

### 2. Created Diagnostic API (`api/diagnose-subscription.js`)
- Endpoint to diagnose subscription issues
- Shows current database state vs. Stripe state
- Provides recommendations for fixes

### 3. Created Fix API (`api/fix-subscription-tier.js`)
- Endpoint to automatically fix subscription tier mismatches
- Syncs database with Stripe data
- Updates subscription tier and image limits

### 4. Created Test Tool (`test-subscription-fix.html`)
- Simple HTML page to test the fix endpoints
- Step-by-step process to diagnose and fix issues

## How to Fix Your Issue

### Step 1: Deploy the New APIs
Make sure the new API endpoints are deployed to Vercel:
- `api/diagnose-subscription.js`
- `api/fix-subscription-tier.js`

### Step 2: Test the Fix
1. Open `test-subscription-fix.html` in your browser
2. Enter your user ID (you can get this from your browser's developer tools or from the logs)
3. Click "Diagnose Subscription" to see the current state
4. If issues are found, click "Fix Subscription Tier"
5. Test "Test Image Usage" to verify the fix worked

### Step 3: Verify the Fix
After running the fix, you should see:
- `subscription_tier` changed from "free" to the correct tier ("basic", "pro", or "yearly")
- `images_limit_per_month` changed from 0 to the correct limit (3, 25, or 50)
- `canGenerateImage` should be `true`

## API Endpoints

### POST `/api/diagnose-subscription`
**Body:** `{ "userId": "your-user-id" }`
**Purpose:** Diagnose subscription issues

### POST `/api/fix-subscription-tier`
**Body:** `{ "userId": "your-user-id" }`
**Purpose:** Fix subscription tier mismatches

## Subscription Tiers and Limits

- **Basic:** 3 images per month
- **Pro:** 25 images per month  
- **Yearly:** 50 images per month
- **Free:** 0 images per month (no subscription)

## Environment Variables Required

Make sure these are set in your Vercel environment:
- `VITE_STRIPE_PRICE_ID_BASIC`
- `VITE_STRIPE_PRICE_ID_PRO`
- `VITE_STRIPE_PRICE_ID_YEARLY`
- `STRIPE_SECRET_KEY`
- `VITE_SUPABASE_URL`
- `SUPABASE_SERVICE_KEY`

## Testing the Fix

1. **Deploy the new APIs to Vercel**
2. **Open the test tool** (`test-subscription-fix.html`)
3. **Enter your user ID** (from the logs: `37c913af-683c-4ee2-846f-c5015b69e240`)
4. **Run the diagnosis** to see what's wrong
5. **Run the fix** to correct the issue
6. **Test image usage** to verify it's working

## Expected Results

After the fix, your user should have:
- `subscription_tier`: "basic", "pro", or "yearly" (not "free")
- `images_limit_per_month`: 3, 25, or 50 (not 0)
- `canGenerateImage`: true
- Ability to create moodboards

## If the Fix Doesn't Work

1. Check the Vercel logs for any errors
2. Verify all environment variables are set correctly
3. Check if the Stripe subscription is actually active
4. Ensure the user ID is correct

## Prevention

The updated webhook will prevent this issue from happening for new subscriptions. The fix ensures that:
- Subscription tiers are determined by actual Stripe price IDs
- Image limits are set correctly based on the subscription plan
- Future subscription updates will maintain the correct tier information
