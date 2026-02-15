export default async function handler(req, res) {
  if (req.method !== 'POST' && req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'Gemini API key not configured' });
  }

  const params = req.method === 'GET' ? req.query : (req.body || {});
  const { text, voice, lang } = params;
  if (!text) {
    return res.status(400).json({ error: 'Text is required' });
  }

  // Map voice gender to Gemini TTS voice names
  // Kore = warm female voice, Puck = friendly male voice
  const voices = {
    female: 'Kore',
    male: 'Puck'
  };
  const voiceName = voices[voice] || voices.female;

  try {
    const response = await fetch(
      'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-tts:generateContent',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-goog-api-key': apiKey
        },
        body: JSON.stringify({
          contents: [{
            parts: [{
              text: text
            }]
          }],
          generationConfig: {
            responseModalities: ['AUDIO'],
            speechConfig: {
              voiceConfig: {
                prebuiltVoiceConfig: {
                  voiceName: voiceName
                }
              }
            }
          }
        })
      }
    );

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      return res.status(response.status).json({
        error: err.error?.message || 'TTS error: ' + response.status
      });
    }

    const data = await response.json();

    // Extract base64 audio from Gemini response
    const audioPart = data.candidates?.[0]?.content?.parts?.find(p => p.inlineData);
    if (!audioPart) {
      return res.status(500).json({ error: 'No audio in response' });
    }

    const pcmBase64 = audioPart.inlineData.data;
    const pcmBuffer = Buffer.from(pcmBase64, 'base64');

    // Gemini TTS outputs raw PCM: 24000 Hz, 16-bit, mono
    // Wrap in WAV header so browsers can decode it
    const wavBuffer = createWavBuffer(pcmBuffer, 24000, 1, 16);

    res.setHeader('Content-Type', 'audio/wav');
    res.setHeader('Cache-Control', 'public, max-age=86400');
    res.setHeader('Content-Length', wavBuffer.length);
    res.end(wavBuffer);
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}

function createWavBuffer(pcmData, sampleRate, numChannels, bitsPerSample) {
  const byteRate = sampleRate * numChannels * (bitsPerSample / 8);
  const blockAlign = numChannels * (bitsPerSample / 8);
  const dataSize = pcmData.length;
  const headerSize = 44;
  const buffer = Buffer.alloc(headerSize + dataSize);

  // RIFF header
  buffer.write('RIFF', 0);
  buffer.writeUInt32LE(36 + dataSize, 4);
  buffer.write('WAVE', 8);

  // fmt sub-chunk
  buffer.write('fmt ', 12);
  buffer.writeUInt32LE(16, 16);          // Sub-chunk size
  buffer.writeUInt16LE(1, 20);           // Audio format (PCM)
  buffer.writeUInt16LE(numChannels, 22);
  buffer.writeUInt32LE(sampleRate, 24);
  buffer.writeUInt32LE(byteRate, 28);
  buffer.writeUInt16LE(blockAlign, 32);
  buffer.writeUInt16LE(bitsPerSample, 34);

  // data sub-chunk
  buffer.write('data', 36);
  buffer.writeUInt32LE(dataSize, 40);
  pcmData.copy(buffer, 44);

  return buffer;
}
