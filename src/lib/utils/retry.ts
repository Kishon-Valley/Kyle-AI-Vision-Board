/**
 * Utility function to implement exponential backoff for API calls
 * @param operation The async function to retry
 * @param maxRetries Maximum number of retry attempts
 * @param baseDelay Initial delay in milliseconds
 * @param maxDelay Maximum delay in milliseconds
 * @returns The result of the operation
 */
export async function withExponentialBackoff<T>(
  operation: () => Promise<T>,
  maxRetries = 3,
  baseDelay = 1000,
  maxDelay = 10000
): Promise<T> {
  let retries = 0;
  
  while (true) {
    try {
      return await operation();
    } catch (error: any) {
      // Check if we've exceeded max retries
      if (retries >= maxRetries) {
        throw error;
      }
      
      // Check if it's a rate limit error (OpenAI specific)
      const isRateLimitError = 
        error.status === 429 || 
        (error.message && error.message.includes('rate limit')) ||
        (error.message && error.message.includes('quota'));
      
      // If it's not a rate limit error, don't retry
      if (!isRateLimitError) {
        throw error;
      }
      
      // Calculate delay with exponential backoff and jitter
      const delay = Math.min(
        maxDelay,
        baseDelay * Math.pow(2, retries) * (0.8 + Math.random() * 0.4)
      );
      
      console.log(`Rate limit hit. Retrying in ${delay}ms (attempt ${retries + 1}/${maxRetries})`);
      
      // Wait before retrying
      await new Promise(resolve => setTimeout(resolve, delay));
      
      // Increment retry counter
      retries++;
    }
  }
}
