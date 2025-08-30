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

    console.log(`Diagnosing subscription for user: ${userId}`);

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

    console.log('User data from database:', userData);

    let stripeData = null;
    let subscriptionDetails = null;

    // If user has a subscription ID, check Stripe
    if (userData.subscription_id) {
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
        stripeData = { error: stripeError.message };
      }
    }

    // Determine what the subscription tier should be based on Stripe data
    let recommendedTier = 'free';
    let recommendedImageLimit = 0;

    if (stripeData && !stripeData.error) {
      // Check if this is a subscription we recognize
      const priceId = stripeData.items?.[0]?.price_id;
      
      if (priceId === process.env.VITE_STRIPE_PRICE_ID_BASIC) {
        recommendedTier = 'basic';
        recommendedImageLimit = 3;
      } else if (priceId === process.env.VITE_STRIPE_PRICE_ID_PRO) {
        recommendedTier = 'pro';
        recommendedImageLimit = 25;
      } else if (priceId === process.env.VITE_STRIPE_PRICE_ID_YEARLY) {
        recommendedTier = 'yearly';
        recommendedImageLimit = 50;
      } else {
        // Try to determine from product metadata or name
        const productName = stripeData.product?.name?.toLowerCase() || '';
        if (productName.includes('basic')) {
          recommendedTier = 'basic';
          recommendedImageLimit = 3;
        } else if (productName.includes('pro')) {
          recommendedTier = 'pro';
          recommendedImageLimit = 25;
        } else if (productName.includes('yearly')) {
          recommendedTier = 'yearly';
          recommendedImageLimit = 50;
        }
      }
    }

    const diagnosis = {
      userId: userId,
      database: {
        subscription_id: userData.subscription_id,
        subscription_status: userData.subscription_status,
        subscription_tier: userData.subscription_tier,
        images_limit_per_month: userData.images_limit_per_month,
        images_used_this_month: userData.images_used_this_month,
        last_reset_date: userData.last_reset_date
      },
      stripe: stripeData,
      recommendation: {
        current_tier: userData.subscription_tier,
        recommended_tier: recommendedTier,
        current_image_limit: userData.images_limit_per_month,
        recommended_image_limit: recommendedImageLimit,
        needs_update: userData.subscription_tier !== recommendedTier || 
                     userData.images_limit_per_month !== recommendedImageLimit
      },
      environment_variables: {
        has_basic_price_id: !!process.env.VITE_STRIPE_PRICE_ID_BASIC,
        has_pro_price_id: !!process.env.VITE_STRIPE_PRICE_ID_PRO,
        has_yearly_price_id: !!process.env.VITE_STRIPE_PRICE_ID_YEARLY
      }
    };

    console.log('Subscription diagnosis:', diagnosis);

    return res.status(200).json(diagnosis);
  } catch (err) {
    console.error(`Unhandled error in diagnose-subscription route:`, err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
