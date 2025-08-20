
import { loadStripe } from '@stripe/stripe-js';

// Type definitions for environment variables
interface EnvConfig {
  // App URLs
  appUrl: string;
  apiUrl: string;
  
  // Stripe configuration
  stripe: {
    publishableKey: string;
    priceIds: {
      monthly: string;
      yearly: string;
    };
    
    // Stripe configuration validation
    isConfigured: boolean;
  };
  supabase: {
    url: string | undefined;
    anonKey: string | undefined;
  };
  allowedOrigins: string[];
}

// Initialize environment configuration
export const env: EnvConfig = {
  // App URLs with production defaults
  appUrl: import.meta.env.VITE_APP_URL || 'https://www.moodboardgenerator.com',
  apiUrl: import.meta.env.VITE_API_URL || 'https://www.moodboardgenerator.com/api',
  
  // Stripe configuration
  stripe: {
    publishableKey: import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY || '',
    priceIds: {
      monthly: import.meta.env.VITE_STRIPE_PRICE_ID_MONTHLY || '',
      yearly: import.meta.env.VITE_STRIPE_PRICE_ID_YEARLY || '',
    },
    // Check if Stripe is properly configured
    get isConfigured() {
      return Boolean(
        this.publishableKey &&
        this.priceIds.monthly &&
        this.priceIds.yearly
      );
    },
  },
  
  // Supabase configuration
  supabase: {
    url: import.meta.env.VITE_SUPABASE_URL || '',
    anonKey: import.meta.env.VITE_SUPABASE_ANON_KEY || '',
  },
  
  // CORS and security
  allowedOrigins: process.env.ALLOWED_ORIGINS?.split(',') || [
    'https://www.moodboardgenerator.com',
    'https://moodboardgenerator.com',
  ],
};



// Initialize Stripe client
export const stripePromise = env.stripe.publishableKey 
  ? loadStripe(env.stripe.publishableKey)
  : undefined;

// Environment validation
export function validateEnvironment() {
  const errors: string[] = [];

  // Validate required client-side variables
  if (!env.stripe.publishableKey) {
    errors.push('STRIPE_PUBLISHABLE_KEY is missing');
  }
  if (!env.supabase.url) {
    errors.push('SUPABASE_URL is missing');
  }
  if (!env.supabase.anonKey) {
    errors.push('SUPABASE_ANON_KEY is missing');
  }

  if (errors.length > 0) {
    console.warn(`Missing environment variables: ${errors.join(', ')}`);
    // Don't throw in development to allow the app to run
    if (typeof process !== 'undefined' && process.env.NODE_ENV === 'production') {
      throw new Error(`Missing required environment variables: ${errors.join(', ')}`);
    }
  }
}

// Initialize environment
validateEnvironment();
