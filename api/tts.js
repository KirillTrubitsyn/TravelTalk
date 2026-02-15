export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const apiKey = process.env.ELEVENLABS_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'ElevenLabs API key not configured' });
  }

  const { text, voice } = req.body;
  if (!text) {
    return res.status(400).json({ error: 'Text is required' });
  }

  // Map voice gender to ElevenLabs voice IDs
  // Rachel = warm female voice, Adam = friendly male voice
  const voices = {
    female: '21m00Tcm4TlvDq8ikWAM',
    male: 'pNInz6obpgDQGcFmaJgB'
  };
  const voiceId = voices[voice] || voices.female;

  // Strip parenthesized content (e.g. pronunciation hints) so TTS reads only the translation
  const cleanText = text.replace(/\s*\([^)]*\)/g, '').trim();

  try {
    const response = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}/stream`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'xi-api-key': apiKey
        },
        body: JSON.stringify({
          text: cleanText,
          model_id: 'eleven_turbo_v2_5',
          output_format: 'mp3_22050_32',
          voice_settings: {
            stability: 0.5,
            similarity_boost: 0.75,
            speed: 0.85
          }
        })
      }
    );

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      return res.status(response.status).json({
        error: err.detail?.message || 'TTS error: ' + response.status
      });
    }

    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    res.setHeader('Content-Type', 'audio/mpeg');
    res.setHeader('Cache-Control', 'public, max-age=86400');
    res.setHeader('Content-Length', buffer.length);
    res.end(buffer);
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}
