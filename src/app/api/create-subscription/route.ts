import { env } from '@/lib/env';

// Helper function to create a JSON response
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
    const body = await request.json();
    const { priceId, userId, email, billingInterval } = body;
    
    console.log('Creating subscription with:', { 
      priceId, 
      userId, 
      email: email ? `${email.substring(0, 3)}...` : 'no-email',
      billingInterval 
    });

    if (!priceId || !userId || !email || !billingInterval) {
      return jsonResponse(
        { 
          error: { 
            message: 'Missing required parameters',
            details: { priceId: !!priceId, userId: !!userId, email: !!email, billingInterval: !!billingInterval }
          } 
        },
        400
      );
    }

    // Validate environment configuration
    if (!env.stripe.isConfigured) {
      console.error('Stripe is not properly configured');
      return jsonResponse(
        { error: { message: 'Payment system is not configured' } },
        500
      );
    }

    // Forward the request to the backend server
    const apiUrl = `${env.apiUrl}/create-subscription`;
    console.log('Forwarding to backend:', apiUrl);
    
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        priceId,
        userId,
        email,
        billingInterval,
        successUrl: `${env.appUrl}/payment-success?session_id={CHECKOUT_SESSION_ID}`,
        cancelUrl: `${env.appUrl}/pricing`,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('Backend error:', data);
      return jsonResponse(
        { 
          error: {
            message: data.error?.message || 'Failed to create checkout session',
            code: data.error?.code,
            details: data.error?.details
          } 
        },
        response.status || 500
      );
    }

    return jsonResponse({ url: data.url });
  } catch (error) {
    console.error('Error in create-subscription route:', error);
    return jsonResponse(
      { 
        error: { 
          message: 'Internal server error',
          details: error instanceof Error ? error.message : 'Unknown error'
        } 
      },
      500
    );
  }
}
