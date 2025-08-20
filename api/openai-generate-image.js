import OpenAI from 'openai';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  try {
    const { prompt } = req.body || {};
    if (!prompt) {
      return res.status(400).json({ error: 'Missing prompt' });
    }

    if (!process.env.OPENAI_API_KEY) {
      return res.status(500).json({ error: 'OPENAI_API_KEY not configured' });
    }

    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

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
  } catch (error) {
    return res.status(500).json({ error: 'Failed to generate image' });
  }
}
