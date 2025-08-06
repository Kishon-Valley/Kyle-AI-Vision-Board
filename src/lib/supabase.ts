import { createClient } from '@supabase/supabase-js';

// Environment variables injected by Vite (must start with VITE_*)
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL ?? '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY ?? '';

// Gracefully handle missing envs so the app still renders
export const supabase = supabaseUrl && supabaseAnonKey
  ? createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: true,
        storageKey: 'vision-board-ai-auth-token',
        flowType: 'pkce',
        debug: process.env.NODE_ENV === 'development'
      },
      global: {
        headers: {
          'X-Client-Info': 'vision-board-ai/1.0.0'
        }
      },
      db: {
        schema: 'public'
      }
    })
  : null;

if (!supabase) {
  console.warn('Supabase credentials missing; auth features disabled.');
}

// Helper function to handle Supabase errors
const handleSupabaseError = (error: any) => {
  console.error('Supabase error:', error);
  throw new Error(error?.message || 'An error occurred with the database');
};

export const checkUserSubscription = async (userId: string) => {
  if (!supabase) return { hasSubscription: false, error: 'Supabase not initialized' };
  
  try {
    const { data, error } = await supabase
      .from('users')
      .select('subscription_status')
      .eq('id', userId)
      .maybeSingle();
    
    if (error) throw error;
    
    return {
      hasSubscription: data?.subscription_status === 'active',
      subscriptionStatus: data?.subscription_status || 'inactive'
    };
  } catch (error) {
    console.error('Error checking subscription:', error);
    return { 
      hasSubscription: false, 
      error: error instanceof Error ? error.message : 'Failed to check subscription'
    };
  }
};
