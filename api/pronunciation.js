import { validateSession } from './_supabase.js';

export const config = {
  api: {
    bodyParser: {
      sizeLimit: '4mb',
    },
  },
};

export default async function handler(req, res) {
  if (req.method !== 'POST') {
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

  const { referenceText, language, audio } = req.body;

  if (!referenceText || !language || !audio) {
    return res.status(400).json({ error: 'Missing referenceText, language, or audio' });
  }

  // audio is base64 encoded WAV
  const audioBuffer = Buffer.from(audio, 'base64');

  const pronConfig = {
    ReferenceText: referenceText,
    GradingSystem: 'HundredMark',
    Granularity: 'Phoneme',
    Dimension: 'Comprehensive',
    EnableMiscue: 'True',
  };

  // en-US supports IPA and prosody
  if (language === 'en-US') {
    pronConfig.EnableProsodyAssessment = 'True';
    pronConfig.PhonemeAlphabet = 'IPA';
    pronConfig.NBestPhonemeCount = 3;
  }

  const pronHeader = Buffer.from(JSON.stringify(pronConfig)).toString('base64');

  try {
    const response = await fetch(
      `https://${speechRegion}.stt.speech.microsoft.com/speech/recognition/conversation/cognitiveservices/v1?language=${encodeURIComponent(language)}&format=detailed`,
      {
        method: 'POST',
        headers: {
          'Ocp-Apim-Subscription-Key': speechKey,
          'Content-Type': 'audio/wav; codecs=audio/pcm; samplerate=16000',
          'Accept': 'application/json;text/xml',
          'Pronunciation-Assessment': pronHeader,
        },
        body: audioBuffer,
      }
    );

    if (!response.ok) {
      const errText = await response.text();
      console.error('Azure Speech error:', response.status, errText);
      return res.status(502).json({ error: 'Azure Speech API error', status: response.status });
    }

    const result = await response.json();
    res.json(result);
  } catch (e) {
    console.error('Pronunciation assessment error:', e);
    return res.status(500).json({ error: e.message });
  }
}
