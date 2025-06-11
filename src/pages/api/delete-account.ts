import { createClient } from '@supabase/supabase-js';

// This is now a client-side function that calls your Express API
export default async function deleteUserAccount(userId: string) {
  try {
    const response = await fetch('http://localhost:3000/api/delete-account', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ userId }),
      credentials: 'include', // Include cookies if using session-based auth
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to delete account');
    }

    return await response.json();
  } catch (error) {
    console.error('Error deleting account:', error);
    throw error;
  }
}
