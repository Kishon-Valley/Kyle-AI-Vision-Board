import { env } from '@/lib/env';
import { createClient } from '@supabase/supabase-js';

// Reusable helper to build JSON responses consistently
function jsonResponse(body: any, status = 200, headers: Record<string, string> = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json',
      ...headers,
    },
  });
}

export async function POST(request: Request) {
  try {
    const { userId } = await request.json();

    if (!userId) {
      return jsonResponse({ error: 'Missing userId' }, 400);
    }

    // Guard against missing backend credentials
    if (!env.supabase.url || !env.supabase.serviceKey) {
      console.error('Supabase admin credentials are not configured.');
      return jsonResponse({ error: 'Server mis-configuration' }, 500);
    }

    // Admin client (service role) – NEVER expose service key to the client bundle
    const adminClient = createClient(env.supabase.url, env.supabase.serviceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    // Get user's subscription status
    const { data: userData, error: userError } = await adminClient
      .from('users')
      .select('subscription_id, subscription_status')
      .eq('id', userId)
      .single();

    if (userError) {
      console.error('Error fetching user subscription:', userError);
      return jsonResponse({ error: 'Failed to fetch user subscription' }, 500);
    }

    // If user has an active subscription, cancel it
    if (userData?.subscription_id && userData?.subscription_status === 'active') {
      try {
        // Update subscription status to cancelled
        const { error: updateError } = await adminClient
          .from('users')
          .update({ 
            subscription_status: 'cancelled',
            updated_at: new Date().toISOString()
          })
          .eq('id', userId);

        if (updateError) {
          console.error('Error updating subscription status:', updateError);
          return jsonResponse({ error: 'Failed to cancel subscription' }, 500);
        }

        console.log(`Subscription cancelled for user: ${userId}`);
      } catch (subscriptionError) {
        console.error('Error cancelling subscription:', subscriptionError);
        // Don't fail the entire deletion process if subscription cancellation fails
        // Just log the error and continue
      }
    }

    return jsonResponse({ success: true, message: 'Subscription cancelled successfully' });
  } catch (err) {
    console.error('Unhandled error in cancel-subscription route:', err);
    return jsonResponse({ error: 'Internal server error' }, 500);
  }
}
