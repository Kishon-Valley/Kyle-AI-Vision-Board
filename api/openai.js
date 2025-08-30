import OpenAI from 'openai';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  try {
    const { mode } = req.query || {};
    if (!process.env.OPENAI_API_KEY) {
      return res.status(500).json({ error: 'OPENAI_API_KEY not configured' });
    }
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

    if (mode === 'description') {
      const { roomType, designStyle, colorPalette, budget } = req.body || {};
      if (!roomType || !designStyle || !Array.isArray(colorPalette) || !budget) {
        return res.status(400).json({ error: 'Missing required fields' });
      }
      const prompt = `Create a detailed interior design description for a ${designStyle} style ${roomType} with a color palette including ${colorPalette.join(', ')}. The budget is in the ${budget} range. Include specific furniture pieces, materials, textures, lighting suggestions, and decor elements that would create a cohesive and appealing space. The description should be informative and inspirational, suitable for an interior design mood board.`;
      const completion = await openai.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: [
          { role: 'system', content: 'You are an expert interior designer with knowledge of various design styles, materials, and furniture. Provide detailed and specific design recommendations.' },
          { role: 'user', content: prompt },
        ],
        max_tokens: 500,
      });
      const content = completion.choices?.[0]?.message?.content || '';
      return res.status(200).json({ description: content });
    }

    if (mode === 'prompt') {
      const { designDescription, roomType, designStyle } = req.body || {};
      if (!designDescription || !roomType || !designStyle) {
        return res.status(400).json({ error: 'Missing required fields' });
      }
      const completion = await openai.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: [
          { role: 'system', content: 'You are an expert at creating detailed prompts for DALL-E to generate interior design mood boards. Create prompts that will result in photorealistic, magazine-quality interior design images.' },
          { role: 'user', content: `Based on this design description, create a detailed prompt for DALL-E to generate a photorealistic mood board image of a ${designStyle} ${roomType}:\n\n${designDescription}\n\nMake sure the prompt includes specific details about furniture, materials, lighting, and atmosphere. The image should look like a professional interior design photograph from a high-end magazine.` },
        ],
        max_tokens: 300,
      });
      const content = completion.choices?.[0]?.message?.content || '';
      return res.status(200).json({ prompt: content });
    }

    if (mode === 'image') {
      const { prompt } = req.body || {};
      if (!prompt) {
        return res.status(400).json({ error: 'Missing prompt' });
      }
      const response = await openai.images.generate({
        model: 'dall-e-3',
        prompt,
        n: 1,
        size: '1024x1024',
        style: 'vivid',
        quality: 'standard',
        response_format: 'b64_json',
      });
      const b64 = response.data?.[0]?.b64_json || '';
      return res.status(200).json({ imageDataUrl: `data:image/png;base64,${b64}` });
    }

    return res.status(400).json({ error: 'Invalid mode' });
  } catch (error) {
    console.error('OpenAI API error:', error);
    return res.status(500).json({ 
      error: 'OpenAI request failed', 
      details: error.message,
      code: error.code || 'unknown'
    });
  }
}
