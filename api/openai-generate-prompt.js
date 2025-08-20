import OpenAI from 'openai';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  try {
    const { designDescription, roomType, designStyle } = req.body || {};
    if (!designDescription || !roomType || !designStyle) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    if (!process.env.OPENAI_API_KEY) {
      return res.status(500).json({ error: 'OPENAI_API_KEY not configured' });
    }

    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

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
  } catch (error) {
    return res.status(500).json({ error: 'Failed to generate prompt' });
  }
}
