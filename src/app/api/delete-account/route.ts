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

    const { error } = await adminClient.auth.admin.deleteUser(userId, true);

    if (error) {
      console.error('Error deleting user via admin API:', error);
      return jsonResponse({ error: error.message }, 500);
    }

    return jsonResponse({ success: true });
  } catch (err) {
    console.error('Unhandled error in delete-account route:', err);
    return jsonResponse({ error: 'Internal server error' }, 500);
  }
}
