import { createClient } from '@supabase/supabase-js';
import Stripe from 'stripe';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { userId } = req.body;

    if (!userId) {
      return res.status(400).json({ error: 'Missing userId' });
    }

    console.log(`Fixing subscription tier for user: ${userId}`);

    // Guard against missing backend credentials
    if (!process.env.VITE_SUPABASE_URL || !process.env.SUPABASE_SERVICE_KEY) {
      console.error('Supabase admin credentials are not configured.');
      return res.status(500).json({ error: 'Server mis-configuration' });
    }

    // Initialize Stripe
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: '2025-07-30.basil',
    });

    // Admin client (service role)
    const adminClient = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    // Get user's subscription data from database
    const { data: userData, error: userError } = await adminClient
      .from('users')
      .select('*')
      .eq('id', userId)
      .single();

    if (userError) {
      console.error('Error fetching user data:', userError);
      return res.status(500).json({ error: 'Failed to fetch user data' });
    }

    if (!userData) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (!userData.subscription_id) {
      return res.status(400).json({ error: 'User has no subscription ID' });
    }

    console.log('User data before fix:', userData);

    // Get Stripe subscription details
    let stripeData = null;
    try {
      const subscription = await stripe.subscriptions.retrieve(userData.subscription_id);
      stripeData = {
        id: subscription.id,
        status: subscription.status,
        current_period_end: subscription.current_period_end,
        metadata: subscription.metadata,
        items: subscription.items.data.map(item => ({
          price_id: item.price.id,
          product_id: item.price.product,
          interval: item.price.recurring?.interval,
          interval_count: item.price.recurring?.interval_count
        }))
      };

      // Get product details
      if (subscription.items.data.length > 0) {
        const product = await stripe.products.retrieve(subscription.items.data[0].price.product);
        stripeData.product = {
          id: product.id,
          name: product.name,
          metadata: product.metadata
        };
      }

      console.log('Stripe subscription data:', stripeData);
    } catch (stripeError) {
      console.error('Error fetching Stripe subscription:', stripeError);
      return res.status(500).json({ error: 'Failed to fetch Stripe subscription', details: stripeError.message });
    }

    // Determine correct tier and image limits
    let correctTier = 'free';
    let correctImageLimit = 0;

    if (stripeData) {
      const priceId = stripeData.items?.[0]?.price_id;
      
      if (priceId === process.env.VITE_STRIPE_PRICE_ID_BASIC) {
        correctTier = 'basic';
        correctImageLimit = 3;
      } else if (priceId === process.env.VITE_STRIPE_PRICE_ID_PRO) {
        correctTier = 'pro';
        correctImageLimit = 25;
      } else if (priceId === process.env.VITE_STRIPE_PRICE_ID_YEARLY) {
        correctTier = 'yearly';
        correctImageLimit = 50;
      } else {
        // Try to determine from product metadata or name
        const productName = stripeData.product?.name?.toLowerCase() || '';
        if (productName.includes('basic')) {
          correctTier = 'basic';
          correctImageLimit = 3;
        } else if (productName.includes('pro')) {
          correctTier = 'pro';
          correctImageLimit = 25;
        } else if (productName.includes('yearly')) {
          correctTier = 'yearly';
          correctImageLimit = 50;
        }
      }
    }

    console.log(`Correcting subscription tier from '${userData.subscription_tier}' to '${correctTier}'`);
    console.log(`Correcting image limit from ${userData.images_limit_per_month} to ${correctImageLimit}`);

    // Update user's subscription tier and image limits
    const { data: updateData, error: updateError } = await adminClient
      .from('users')
      .update({
        subscription_tier: correctTier,
        images_limit_per_month: correctImageLimit,
        updated_at: new Date().toISOString()
      })
      .eq('id', userId)
      .select();

    if (updateError) {
      console.error('Error updating user subscription tier:', updateError);
      return res.status(500).json({ error: 'Failed to update subscription tier' });
    }

    console.log('User data after fix:', updateData);

    const result = {
      success: true,
      message: 'Subscription tier fixed successfully',
      userId: userId,
      changes: {
        subscription_tier: {
          from: userData.subscription_tier,
          to: correctTier
        },
        images_limit_per_month: {
          from: userData.images_limit_per_month,
          to: correctImageLimit
        }
      },
      updated_user: updateData[0]
    };

    console.log('Fix result:', result);

    return res.status(200).json(result);
  } catch (err) {
    console.error(`Unhandled error in fix-subscription-tier route:`, err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
