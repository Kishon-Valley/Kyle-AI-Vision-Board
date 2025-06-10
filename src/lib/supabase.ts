import { createClient } from '@supabase/supabase-js';

// Environment variables injected by Vite (must start with VITE_*)
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL ?? '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY ?? '';

// Gracefully handle missing envs so the app still renders
export const supabase = supabaseUrl && supabaseAnonKey
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;

if (!supabase) {
  console.warn('Supabase credentials missing; auth features disabled.');
}
