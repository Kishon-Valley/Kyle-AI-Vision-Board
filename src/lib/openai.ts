import OpenAI from 'openai';

// Initialize the OpenAI client
const openai = new OpenAI({
  apiKey: import.meta.env.VITE_OPENAI_API_KEY,
  dangerouslyAllowBrowser: true // Note: In production, API calls should be made from a backend
});

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
  
  const prompt = `Create a detailed interior design description for a ${designStyle} style ${roomType} 
  with a color palette including ${colorPalette.join(', ')}. The budget is in the ${budget} range.
  Include specific furniture pieces, materials, textures, lighting suggestions, and decor elements 
  that would create a cohesive and appealing space. The description should be informative and 
  inspirational, suitable for an interior design mood board.`;

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [
        { role: "system", content: "You are an expert interior designer with knowledge of various design styles, materials, and furniture. Provide detailed and specific design recommendations." },
        { role: "user", content: prompt }
      ],
      max_tokens: 500,
    });

    return completion.choices[0].message.content;
  } catch (error) {
    console.error('Error generating design description:', error);
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
    const completion = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [
        { 
          role: "system", 
          content: "You are an expert at creating detailed prompts for DALL-E to generate interior design mood boards. Create prompts that will result in photorealistic, magazine-quality interior design images." 
        },
        { 
          role: "user", 
          content: `Based on this design description, create a detailed prompt for DALL-E to generate a photorealistic mood board image of a ${designStyle} ${roomType}:\n\n${designDescription}\n\nMake sure the prompt includes specific details about furniture, materials, lighting, and atmosphere. The image should look like a professional interior design photograph from a high-end magazine.` 
        }
      ],
      max_tokens: 300,
    });

    return completion.choices[0].message.content;
  } catch (error) {
    console.error('Error generating image prompt:', error);
    throw error;
  }
}

/**
 * Generate an image using DALL-E based on the prompt
 */
export async function generateMoodBoardImage(prompt: string) {
  try {
    const response = await openai.images.generate({
      model: "dall-e-3",
      prompt: prompt,
      n: 1,
      size: "1024x1024",
      quality: "standard",
    });

    return response.data[0].url;
  } catch (error) {
    console.error('Error generating mood board image:', error);
    throw error;
  }
}
