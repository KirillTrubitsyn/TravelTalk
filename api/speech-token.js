import { validateSession } from './_supabase.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const session = await validateSession(req);
  if (!session) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const speechKey = process.env.AZURE_SPEECH_KEY;
  const speechRegion = process.env.AZURE_SPEECH_REGION || 'eastus';

  if (!speechKey) {
    return res.status(500).json({ error: 'Azure Speech key not configured' });
  }

  try {
    const tokenResponse = await fetch(
      `https://${speechRegion}.api.cognitive.microsoft.com/sts/v1.0/issueToken`,
      {
        method: 'POST',
        headers: {
          'Ocp-Apim-Subscription-Key': speechKey,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      }
    );

    if (!tokenResponse.ok) {
      return res.status(502).json({ error: 'Failed to get speech token' });
    }

    const token = await tokenResponse.text();
    res.json({ token, region: speechRegion });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}
