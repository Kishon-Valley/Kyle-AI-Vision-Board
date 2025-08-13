export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    console.log('Test webhook received');
    console.log('Headers:', req.headers);
    console.log('Body:', req.body);
    
    return res.status(200).json({ 
      received: true, 
      timestamp: new Date().toISOString(),
      message: 'Test webhook endpoint is working'
    });
  } catch (error) {
    console.error('Error in test webhook:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
