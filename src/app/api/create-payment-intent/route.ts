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
    const { billingInterval, userId } = await request.json();

    if (!billingInterval || !userId) {
      return jsonResponse({ error: 'Missing billingInterval or userId' }, 400);
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

    // Verify user exists
    const { data: userData, error: userError } = await adminClient
      .from('users')
      .select('id, email')
      .eq('id', userId)
      .single();

    if (userError || !userData) {
      console.error('Error fetching user:', userError);
      return jsonResponse({ error: 'User not found' }, 404);
    }

    // Determine price ID based on billing interval
    const priceId = billingInterval === 'year' 
      ? env.stripe.priceIds.yearly 
      : env.stripe.priceIds.monthly;

    if (!priceId) {
      console.error('Stripe price ID not configured for interval:', billingInterval);
      return jsonResponse({ error: 'Payment configuration error' }, 500);
    }

    // Create payment intent using the existing API
    const apiUrl = `${env.apiUrl}/create-payment-intent`;
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        billingInterval,
        userId,
        priceId,
        customerEmail: userData.email
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('Backend error:', errorData);
      return jsonResponse({ error: errorData.error || 'Failed to create payment intent' }, 500);
    }

    const data = await response.json();
    return jsonResponse(data);
  } catch (err) {
    console.error('Error in create-payment-intent route:', err);
    return jsonResponse({ error: 'Internal server error' }, 500);
  }
}
