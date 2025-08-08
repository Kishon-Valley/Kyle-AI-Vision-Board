import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { sessionId } = req.body;

    if (!sessionId) {
      return res.status(400).json({ error: 'Missing sessionId' });
    }

    // Guard against missing backend credentials
    if (!process.env.VITE_SUPABASE_URL || !process.env.SUPABASE_SERVICE_KEY) {
      console.error('Supabase admin credentials are not configured.');
      return res.status(500).json({ error: 'Server mis-configuration' });
    }

    // Admin client (service role) – NEVER expose service key to the client bundle
    const adminClient = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY, {
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
      return res.status(400).json({ error: 'Invalid session' });
    }

    // Check if session is still valid (not expired)
    const now = new Date();
    const sessionExpiry = new Date(sessionData.expires_at);
    
    if (now > sessionExpiry) {
      return res.status(400).json({ error: 'Session expired' });
    }

    return res.status(200).json({ 
      success: true, 
      session: sessionData,
      message: 'Session verified successfully' 
    });
  } catch (err) {
    console.error('Unhandled error in verify-session route:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
