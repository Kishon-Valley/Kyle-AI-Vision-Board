import { toast } from 'sonner';

// Error types that should never be exposed to the client
const SENSITIVE_ERROR_TYPES = [
  'StripeCardError',
  'StripeInvalidRequestError',
  'StripeAPIError',
  'AuthError',
  'SupabaseError',
  'OpenAIError',
];

// Error messages that should be shown to the user
const USER_ERROR_MESSAGES = {
  'StripeCardError': 'There was an issue with your payment method. Please try again.',
  'StripeInvalidRequestError': 'There was an issue processing your request. Please try again.',
  'StripeAPIError': 'There was an issue with the payment service. Please try again later.',
  'AuthError': 'Authentication failed. Please try signing in again.',
  'SupabaseError': 'There was an issue accessing your data. Please try again.',
  'OpenAIError': 'There was an issue generating your mood board. Please try again.',
};

export function handleError(error: any, context: string = 'Unknown') {
  // Log to server-side if available
  if (typeof process !== 'undefined' && process.env.NODE_ENV === 'production') {
    console.error(`[${context}] Server error:`, error);
  }

  // Never expose sensitive error details to the client
  if (typeof window !== 'undefined') {
    // Only show user-friendly messages
    const userMessage = USER_ERROR_MESSAGES[error.type] || USER_ERROR_MESSAGES[error.name] ||
      'An unexpected error occurred. Please try again.';
    
    // Show toast with user-friendly message
    toast.error(userMessage);
  }
}

export function handleApiError(error: any, context: string = 'Unknown') {
  // Log to server-side
  if (typeof process !== 'undefined' && process.env.NODE_ENV === 'production') {
    console.error(`[${context}] API error:`, error);
  }

  // Client-side error handling
  if (typeof window !== 'undefined') {
    // Never expose API keys or sensitive data
    const safeError = {
      message: error.message,
      type: error.type,
      status: error.status,
      code: error.code,
    };

    // Log to browser console without sensitive data
    console.error(`[${context}] API error:`, safeError);

    // Show user-friendly error
    toast.error('An error occurred while processing your request. Please try again.');
  }
}

// Secure logging utility
export function secureLog(level: 'info' | 'warn' | 'error', message: string, context: string = 'Unknown') {
  // Only log to server-side in production
  if (typeof process !== 'undefined' && process.env.NODE_ENV === 'production') {
    if (level === 'error') {
      console.error(`[${context}] ${message}`);
    } else if (level === 'warn') {
      console.warn(`[${context}] ${message}`);
    } else {
      console.log(`[${context}] ${message}`);
    }
  }
  // Client-side logging is disabled in production
  else if (level === 'error') {
    // Only show errors to the user
    console.error(`[${context}] ${message}`);
  }
}
