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
    const { sessionId } = await request.json();

    if (!sessionId) {
      return jsonResponse({ error: 'Missing sessionId' }, 400);
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

    // Verify the session exists and is valid
    const { data: sessionData, error: sessionError } = await adminClient
      .from('sessions')
      .select('*')
      .eq('id', sessionId)
      .single();

    if (sessionError || !sessionData) {
      console.error('Error verifying session:', sessionError);
      return jsonResponse({ error: 'Invalid session' }, 400);
    }

    // Check if session is still valid (not expired)
    const now = new Date();
    const sessionExpiry = new Date(sessionData.expires_at);
    
    if (now > sessionExpiry) {
      return jsonResponse({ error: 'Session expired' }, 400);
    }

    return jsonResponse({ 
      success: true, 
      session: sessionData,
      message: 'Session verified successfully' 
    });
  } catch (err) {
    console.error('Unhandled error in verify-session route:', err);
    return jsonResponse({ error: 'Internal server error' }, 500);
  }
}
