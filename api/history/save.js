import { validateSession, supabaseRequest } from '../_supabase.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const session = await validateSession(req);
  if (!session) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const { mode, source_lang, target_lang, source_text, translated_text, metadata } = req.body;
  if (!mode || !source_lang || !target_lang || !source_text || !translated_text) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  try {
    await supabaseRequest('translations', {
      method: 'POST',
      body: {
        user_id: session.user_id,
        mode,
        source_lang,
        target_lang,
        source_text: source_text.substring(0, 5000),
        translated_text: translated_text.substring(0, 5000),
        metadata: metadata || {}
      },
      prefer: 'return=minimal'
    });

    return res.status(200).json({ ok: true });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}
