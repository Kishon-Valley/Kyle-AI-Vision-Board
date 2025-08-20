import OpenAI from 'openai';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  try {
    const { roomType, designStyle, colorPalette, budget } = req.body || {};
    if (!roomType || !designStyle || !Array.isArray(colorPalette) || !budget) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    if (!process.env.OPENAI_API_KEY) {
      return res.status(500).json({ error: 'OPENAI_API_KEY not configured' });
    }

    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

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
  } catch (error) {
    return res.status(500).json({ error: 'Failed to generate description' });
  }
}
