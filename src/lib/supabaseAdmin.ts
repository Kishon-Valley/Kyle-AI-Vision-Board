// IMPORTANT: This module is server-only. Do NOT import it in client-side code.
// It intentionally throws in the browser to prevent accidental exposure.

export function getServerOnlySupabaseAdmin(): never {
  throw new Error('supabaseAdmin is server-only. Use a server API route to perform admin operations.');
}
