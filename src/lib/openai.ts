import { withExponentialBackoff } from './utils/retry';

/**
 * Generate a design description based on user preferences
 */
export async function generateDesignDescription(preferences: {
  roomType: string;
  designStyle: string;
  colorPalette: string[];
  budget: string;
}) {
  const { roomType, designStyle, colorPalette, budget } = preferences;
  
  try {
    // Use exponential backoff for API calls
    const completion = await withExponentialBackoff(
      async () => {
        const res = await fetch('/api/openai-generate-description', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ roomType, designStyle, colorPalette, budget }),
        });
        if (!res.ok) throw new Error('Failed to generate description');
        return await res.json();
      },
      3,  // maxRetries
      1000, // baseDelay (1 second)
      8000  // maxDelay (8 seconds)
    );
    return completion.description as string;
  } catch (error) {
    throw error;
  }
}

/**
 * Generate an image prompt for DALL-E based on the design description
 */
export async function generateImagePrompt(designDescription: string, preferences: {
  roomType: string;
  designStyle: string;
}) {
  const { roomType, designStyle } = preferences;
  
  try {
    // Use exponential backoff for API calls
    const completion = await withExponentialBackoff(
      async () => {
        const res = await fetch('/api/openai-generate-prompt', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ designDescription, roomType, designStyle }),
        });
        if (!res.ok) throw new Error('Failed to generate image prompt');
        return await res.json();
      },
      3,  // maxRetries
      1500, // baseDelay (1.5 seconds)
      10000  // maxDelay (10 seconds)
    );
    return completion.prompt as string;
  } catch (error) {
    throw error;
  }
}

/**
 * Generate an image using DALL-E based on the prompt
 */
export async function generateMoodBoardImage(prompt: string) {
  try {
    // Use exponential backoff for API calls
    const response = await withExponentialBackoff(
      async () => {
        const res = await fetch('/api/openai-generate-image', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ prompt }),
        });
        if (!res.ok) throw new Error('Failed to generate image');
        return await res.json();
      },
      3,  // maxRetries
      2000, // baseDelay (2 seconds)
      15000  // maxDelay (15 seconds)
    );
    return response.imageDataUrl as string;
  } catch (error) {
    throw error;
  }
}
